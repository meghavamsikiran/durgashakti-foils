import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import { 
  Truck, Coins, Clock, MapPin, Sparkles, Save, ShieldAlert,
  Percent, ToggleLeft, ToggleRight, Info, AlertTriangle, Layers, Gift
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const ShippingSettingsPage = () => {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState(null);

  // General Settings State
  const [enableShipping, setEnableShipping] = useState(true);
  const [enableFreeShipping, setEnableFreeShipping] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(1099);
  const [defaultShippingCharge, setDefaultShippingCharge] = useState(70);
  const [shippingRuleStatus, setShippingRuleStatus] = useState('Active');

  // COD Settings State
  const [codEnabled, setCodEnabled] = useState(true);
  const [codCharge, setCodCharge] = useState(0);
  const [minimumCodAmount, setMinimumCodAmount] = useState(300);
  const [maximumCodAmount, setMaximumCodAmount] = useState(5000);
  const [codStatus, setCodStatus] = useState('Active');

  // Delivery Settings State
  const [standardDeliveryDays, setStandardDeliveryDays] = useState('3–5 Days');
  const [expressDeliveryDays, setExpressDeliveryDays] = useState('1–2 Days');
  const [packagingTime, setPackagingTime] = useState('1 Day');
  const [processingTime, setProcessingTime] = useState('1 Day');

  // Future Scalability Settings State
  const [shippingZonesEnabled, setShippingZonesEnabled] = useState(false);
  const [shippingCampaignsEnabled, setShippingCampaignsEnabled] = useState(false);

  // Mock Future Zones
  const [zones, setZones] = useState([
    { id: '1', name: 'Telangana', charge: 70, status: 'Active' },
    { id: '2', name: 'South India', charge: 120, status: 'Active' },
    { id: '3', name: 'North India', charge: 180, status: 'Active' }
  ]);

  // Mock Future Campaigns
  const [campaigns, setCampaigns] = useState([
    { id: '1', name: 'Free Shipping Weekend', threshold: 0, status: 'Inactive' },
    { id: '2', name: 'Festival Free Shipping', threshold: 499, status: 'Inactive' }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, meRes] = await Promise.all([
          adminService.getSettings(),
          adminService.getMe()
        ]);
        setMe(meRes.data);

        const data = settingsRes.data || {};
        const config = data.shipping_settings || {};

        // General
        setEnableShipping(config.enableShipping !== false);
        setEnableFreeShipping(config.enableFreeShipping !== false);
        setFreeShippingThreshold(config.freeShippingThreshold ?? 1099);
        setDefaultShippingCharge(config.defaultShippingCharge ?? 70);
        setShippingRuleStatus(config.shippingRuleStatus || 'Active');

        // COD
        setCodEnabled(config.codEnabled !== false);
        setCodCharge(config.codCharge ?? config.cod_extra_service_charge ?? config.cod_charge ?? 0);
        setMinimumCodAmount(config.minimumCodAmount ?? 300);
        setMaximumCodAmount(config.maximumCodAmount ?? 5000);
        setCodStatus(config.codStatus || 'Active');

        // Delivery Estimates
        setStandardDeliveryDays(config.standardDeliveryDays || '3–5 Days');
        setExpressDeliveryDays(config.expressDeliveryDays || '1–2 Days');
        setPackagingTime(config.packagingTime || '1 Day');
        setProcessingTime(config.processingTime || '1 Day');

        // Scalability Flags
        setShippingZonesEnabled(!!config.shippingZonesEnabled);
        setShippingCampaignsEnabled(!!config.shippingCampaignsEnabled);

      } catch (error) {
        toast.error('Failed to load shipping configurations.');
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    // Validations
    if (Number(freeShippingThreshold) < 0 || Number(defaultShippingCharge) < 0) {
      toast.error('Shipping settings cannot contain negative values.');
      return;
    }
    if (Number(codCharge) < 0 || Number(minimumCodAmount) < 0 || Number(maximumCodAmount) < 0) {
      toast.error('COD configurations cannot contain negative values.');
      return;
    }
    if (Number(minimumCodAmount) >= Number(maximumCodAmount)) {
      toast.error('Minimum COD limit must be strictly less than maximum COD limit.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        key: 'shipping_settings',
        value: {
          enableShipping,
          enableFreeShipping,
          freeShippingThreshold: Number(freeShippingThreshold),
          defaultShippingCharge: Number(defaultShippingCharge),
          shippingRuleStatus,
          codEnabled,
          codCharge: Number(codCharge),
          minimumCodAmount: Number(minimumCodAmount),
          maximumCodAmount: Number(maximumCodAmount),
          codStatus,
          standardDeliveryDays,
          expressDeliveryDays,
          packagingTime,
          processingTime,
          shippingZonesEnabled,
          shippingCampaignsEnabled
        }
      };

      await adminService.updateSetting(payload);
      toast.success('✨ Master Shipping Configurations Saved!', {
        description: 'Calculations will now update dynamically at checkout.'
      });
    } catch (error) {
      toast.error(error.message || 'Failed to save configurations.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <PageLoader />;

  const isEditable = me?.role === 'SUPER_ADMIN' || me?.permissions?.manage_settings;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-indigo-600 animate-pulse" />
            Shipping Settings
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Configure delivery costs, Cash on Delivery boundaries, and logistics metrics dynamically.</p>
        </div>
        {isEditable && (
          <Button disabled={saving} onClick={handleSave} className="rounded-xl px-8 py-6 font-black uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2">
            {saving ? 'Saving...' : <><Save className="w-5 h-5" /> Save Changes</>}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: General Shipping */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Truck className="w-32 h-32 text-indigo-900" />
            </div>
            
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              General Shipping Rules
            </h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Define rules for when to apply shipping costs and set the free-delivery boundaries.</p>

            <div className="space-y-6">
              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-950 uppercase">Enable Shipping Charges</h4>
                    <p className="text-[10px] text-slate-500">Enable flat rates globally</p>
                  </div>
                  <button
                    disabled={!isEditable}
                    onClick={() => setEnableShipping(!enableShipping)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
                      enableShipping ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${enableShipping ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <h4 className="text-xs font-black text-slate-950 uppercase">Enable Free Shipping</h4>
                    <p className="text-[10px] text-slate-500">Activate free threshold discounts</p>
                  </div>
                  <button
                    disabled={!isEditable}
                    onClick={() => setEnableFreeShipping(!enableFreeShipping)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
                      enableFreeShipping ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${enableFreeShipping ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Number Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    Free Shipping Threshold (₹)
                    <Info className="w-3 h-3 text-slate-400" />
                  </label>
                  <input
                    type="number"
                    disabled={!isEditable || !enableFreeShipping}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Default Shipping Charge (₹)</label>
                  <input
                    type="number"
                    disabled={!isEditable || !enableShipping}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={defaultShippingCharge}
                    onChange={(e) => setDefaultShippingCharge(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>


                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shipping Rule Status</label>
                  <select
                    disabled={!isEditable}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                    value={shippingRuleStatus}
                    onChange={(e) => setShippingRuleStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: COD Settings */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Coins className="w-32 h-32 text-indigo-900" />
            </div>

            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-600" />
              Cash on Delivery (COD) Control Panel
            </h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Manage payment boundaries, extra service fees, and order caps for cash shipments.</p>

            <div className="space-y-6">
              {/* COD Enable Toggle */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-950 uppercase">Enable Cash on Delivery (COD)</h4>
                  <p className="text-[10px] text-slate-500">Allow customers to choose COD at checkout</p>
                </div>
                <button
                  disabled={!isEditable}
                  onClick={() => setCodEnabled(!codEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
                    codEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${codEnabled ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* COD Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COD Extra Service Charge (₹)</label>
                  <input
                    type="number"
                    disabled={!isEditable || !codEnabled}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={codCharge}
                    onChange={(e) => setCodCharge(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Minimum COD Order Amount (₹)</label>
                  <input
                    type="number"
                    disabled={!isEditable || !codEnabled}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={minimumCodAmount}
                    onChange={(e) => setMinimumCodAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maximum COD Order Amount (₹)</label>
                  <input
                    type="number"
                    disabled={!isEditable || !codEnabled}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={maximumCodAmount}
                    onChange={(e) => setMaximumCodAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COD Status</label>
                  <select
                    disabled={!isEditable}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                    value={codStatus}
                    onChange={(e) => setCodStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Delivery Estimates */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Clock className="w-32 h-32 text-indigo-900" />
            </div>

            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Delivery & Process Timeframes
            </h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Specify the estimated delivery dates shown on the product page and checkout screen.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Standard Delivery Timeframe</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                  value={standardDeliveryDays}
                  onChange={(e) => setStandardDeliveryDays(e.target.value)}
                  placeholder="e.g. 3–5 Days"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Express Delivery Timeframe</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                  value={expressDeliveryDays}
                  onChange={(e) => setExpressDeliveryDays(e.target.value)}
                  placeholder="e.g. 1–2 Days"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Packaging Buffer Time</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                  value={packagingTime}
                  onChange={(e) => setPackagingTime(e.target.value)}
                  placeholder="e.g. 1 Day"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processing Timeframe</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-800"
                  value={processingTime}
                  onChange={(e) => setProcessingTime(e.target.value)}
                  placeholder="e.g. 1 Day"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column: Future-Ready Modules */}
        <div className="space-y-8">
          
          {/* Box 1: Future Zones */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <MapPin className="w-32 h-32 text-indigo-900" />
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Shipping Zones
              </h3>
              <button
                disabled={!isEditable}
                onClick={() => setShippingZonesEnabled(!shippingZonesEnabled)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all ${
                  shippingZonesEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-all ${shippingZonesEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-6 font-medium">Add pincode/state zone overrides. Flat rates are active when this is turned off.</p>

            <div className={`space-y-3 transition-opacity ${shippingZonesEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {zones.map((zone) => (
                <div key={zone.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{zone.name}</span>
                  <span className="text-slate-900">₹{zone.charge}</span>
                </div>
              ))}
              <div className="text-[9px] text-center text-indigo-500 font-extrabold uppercase mt-4 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500 animate-spin-slow" /> Future-Ready Zone Module Active
              </div>
            </div>
          </div>

          {/* Box 2: Promotional Campaigns */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Gift className="w-32 h-32 text-indigo-900" />
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Gift className="w-4 h-4 text-rose-600" />
                Shipping Campaigns
              </h3>
              <button
                disabled={!isEditable}
                onClick={() => setShippingCampaignsEnabled(!shippingCampaignsEnabled)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all ${
                  shippingCampaignsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-all ${shippingCampaignsEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-6 font-medium">Activate festive discount rules or limited-time free delivery events.</p>

            <div className={`space-y-3 transition-opacity ${shippingCampaignsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700">{camp.name}</span>
                    <span className="text-rose-500 font-black text-[9px] uppercase">{camp.status}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Min Cart: ₹{camp.threshold}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Warnings Panel */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12 pointer-events-none">
              <ShieldAlert className="w-36 h-36" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Security Check
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">Only authorized roles with the <span className="text-indigo-400">manage_settings</span> permission are permitted to store edits inside the master system ledger.</p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ShippingSettingsPage;
