import React, { useState, useEffect } from 'react';
import { 
  Ticket, Plus, Search, Edit2, Trash2, Settings, 
  Check, X, TrendingUp, Coins, DollarSign, Calendar, Info, Loader2, Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import couponService from '../../services/coupon.service';
import adminService from '../services/admin.service';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState({
    system_enabled: true,
    stacking_enabled: false,
    single_use_per_account: false
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [promotingId, setPromotingId] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    expiry_date: '',
    min_cart_value: 0,
    max_discount_limit: '',
    max_usage_count: '',
    per_customer_usage_limit: '',
    has_max_discount_limit: false,
    has_total_use_limit: false,
    has_customer_use_limit: false,
    is_active: true
  });

  const fetchCouponsAndSettings = async () => {
    setLoading(true);
    try {
      const [couponsData, settingsData] = await Promise.all([
        couponService.getCoupons(),
        couponService.getSettings()
      ]);
      setCoupons(couponsData);
      setSettings(settingsData);
    } catch (error) {
      toast.error('Failed to load coupon data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await couponService.updateSettings(settings);
      toast.success('Global settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      expiry_date: '',
      min_cart_value: 0,
      max_discount_limit: '',
      max_usage_count: '',
      per_customer_usage_limit: '',
      has_max_discount_limit: false,
      has_total_use_limit: false,
      has_customer_use_limit: false,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    
    // Format date for input datetime-local type (YYYY-MM-DDTHH:mm)
    let formattedDate = '';
    if (coupon.expiry_date) {
      const d = new Date(coupon.expiry_date);
      const pad = (num) => String(num).padStart(2, '0');
      formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      expiry_date: formattedDate,
      min_cart_value: coupon.min_cart_value,
      max_discount_limit: coupon.max_discount_limit || '',
      max_usage_count: coupon.max_usage_count || '',
      per_customer_usage_limit: coupon.per_customer_usage_limit || '',
      has_max_discount_limit: coupon.max_discount_limit !== null && coupon.max_discount_limit !== undefined,
      has_total_use_limit: coupon.max_usage_count !== null && coupon.max_usage_count !== undefined,
      has_customer_use_limit: coupon.per_customer_usage_limit !== null && coupon.per_customer_usage_limit !== undefined,
      is_active: coupon.is_active
    });
    setIsModalOpen(true);
  };

  const handleToggleCouponActive = async (coupon) => {
    try {
      const updatedPayload = {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        expiry_date: coupon.expiry_date,
        min_cart_value: coupon.min_cart_value,
        max_discount_limit: coupon.max_discount_limit,
        max_usage_count: coupon.max_usage_count,
        per_customer_usage_limit: coupon.per_customer_usage_limit,
        is_active: !coupon.is_active
      };
      await couponService.updateCoupon(coupon.id, updatedPayload);
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const handlePromoteToBanner = async (coupon) => {
    if (!window.confirm(`Are you sure you want to promote coupon ${coupon.code} in the storefront scrolling banner?`)) {
      return;
    }

    setPromotingId(coupon.id);
    try {
      // 1. Fetch current settings to get existing text1 and use_favicon
      const settingsRes = await adminService.getSettings();
      const currentSettings = settingsRes.data || {};
      const currentBanner = currentSettings.scrolling_banner || {};

      // 2. Format discount text
      let discountText = '';
      if (coupon.discount_type === 'percentage') {
        discountText = `${Number(coupon.discount_value)}%`;
      } else if (coupon.discount_type === 'flat') {
        discountText = `₹${Number(coupon.discount_value)}`;
      } else if (coupon.discount_type === 'free_shipping') {
        discountText = 'Free Shipping';
      }

      // 3. Format banner text and timer parameters
      let text2 = '';
      let timerEnabled = false;
      let timerTarget = '';

      if (coupon.expiry_date) {
        timerEnabled = true;
        timerTarget = coupon.expiry_date;
        if (coupon.discount_type === 'free_shipping') {
          text2 = `⚡ Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get Free Shipping. Offer ends in {timer} ⚡`;
        } else {
          text2 = `⚡ Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get a discount of ${discountText}. Offer ends in {timer} ⚡`;
        }
      } else {
        timerEnabled = false;
        timerTarget = '';
        if (coupon.discount_type === 'free_shipping') {
          text2 = `🎁 Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get Free Shipping! 🎁`;
        } else {
          text2 = `🎁 Special ${coupon.code} Offer! Use coupon code ${coupon.code} to get a discount of ${discountText}! 🎁`;
        }
      }

      // 4. Update the settings via API
      await adminService.updateSetting({
        key: 'scrolling_banner',
        value: {
          text1: currentBanner.text1 || '✨ Experience Purity & Perfection with Durga Shakti Premium Foils ✨',
          text2: text2,
          timer_enabled: timerEnabled,
          timer_target: timerTarget,
          use_favicon: currentBanner.use_favicon !== false
        }
      });

      toast.success(`✨ Coupon ${coupon.code} is now active in the scrolling banner!`);
    } catch (error) {
      toast.error(error.message || 'Failed to update scrolling banner');
    } finally {
      setPromotingId(null);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }
    try {
      await couponService.deleteCoupon(couponId);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      toast.success('Coupon deleted successfully');
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
      min_cart_value: Number(formData.min_cart_value),
      max_discount_limit: formData.has_max_discount_limit && formData.max_discount_limit ? Number(formData.max_discount_limit) : null,
      max_usage_count: formData.has_total_use_limit && formData.max_usage_count ? Number(formData.max_usage_count) : null,
      per_customer_usage_limit: formData.has_customer_use_limit && formData.per_customer_usage_limit ? Number(formData.per_customer_usage_limit) : null,
      is_active: formData.is_active
    };

    try {
      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.createCoupon(payload);
        toast.success('Coupon created successfully');
      }
      setIsModalOpen(false);
      fetchCouponsAndSettings();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to save coupon';
      toast.error(detail);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter & Search
  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.discount_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Analytics Helpers
  const totalDiscountDistributed = coupons.reduce((sum, c) => sum + Number(c.total_discount_given || 0), 0);
  const couponDrivenRevenue = coupons.reduce((sum, c) => sum + Number(c.revenue_generated || 0), 0);
  const totalUses = coupons.reduce((sum, c) => sum + Number(c.total_uses || 0), 0);
  const activeCount = coupons.filter(c => c.is_active).length;

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-inter">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink-slate flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" /> Coupons & Discounts
          </h1>
          <p className="text-sm text-text-muted mt-1">Create discount codes, choose who can use them, and track how often they are used.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-5 flex items-center gap-2 font-bold uppercase tracking-widest text-xs shadow-md transition-all">
          <Plus className="w-4 h-4" /> Add Coupon
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Coupons</p>
            <p className="text-2xl font-black text-ink-slate mt-0.5">{activeCount} <span className="text-xs font-medium text-slate-400">/ {coupons.length} Active</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Uses</p>
            <p className="text-2xl font-black text-ink-slate mt-0.5">{totalUses} Times</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Discount Given</p>
            <p className="text-2xl font-black text-ink-slate mt-0.5">₹{totalDiscountDistributed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Generated Revenue</p>
            <p className="text-2xl font-black text-ink-slate mt-0.5">₹{couponDrivenRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Global Config Card */}
      <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm">
        <h2 className="text-lg font-black text-ink-slate flex items-center gap-2 uppercase tracking-wider">
          <Settings className="w-5 h-5 text-primary" /> Global Settings
        </h2>
        <p className="text-xs text-text-muted mt-1">Choose how coupons work for customers during checkout.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200">
            <input 
              type="checkbox" 
              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.system_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, system_enabled: e.target.checked }))}
            />
            <div>
              <p className="text-sm font-bold text-ink-slate">Let customers use coupons</p>
              <p className="text-xs text-text-muted mt-0.5">Turn this off to temporarily stop all coupon codes at checkout.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200">
            <input 
              type="checkbox" 
              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.stacking_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, stacking_enabled: e.target.checked }))}
            />
            <div>
              <p className="text-sm font-bold text-ink-slate">Allow more than one coupon in the same order</p>
              <p className="text-xs text-text-muted mt-0.5">Keep this off when each order should use only one coupon code.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/75 transition-all border border-slate-200 md:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.single_use_per_account}
              onChange={(e) => setSettings(prev => ({ ...prev, single_use_per_account: e.target.checked }))}
            />
            <div>
              <p className="text-sm font-bold text-ink-slate">Allow only one coupon order per customer account</p>
              <p className="text-xs text-text-muted mt-0.5">Use this only for strict one-time campaigns. If on, a customer who used any coupon before cannot use another coupon again.</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSaveSettings} 
            disabled={savingSettings}
            className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-2 px-5 font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Coupon Settings'}
          </Button>
        </div>
      </div>

      {/* Coupons Table List */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-ink-slate uppercase tracking-wider">All Coupon Codes</h2>
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search coupon code..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredCoupons.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Ticket className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="font-bold">No coupons found</p>
              <p className="text-xs text-slate-400 mt-0.5">Create a coupon or adjust your query.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border-subtle text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-center">Valid Until</th>
                  <th className="px-6 py-4 text-center">Minimum Order</th>
                  <th className="px-6 py-4 text-center">Used / Left</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  <th className="px-6 py-4 text-center">Active</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm text-ink-slate font-medium">
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                  const remaining = coupon.max_usage_count !== null 
                    ? Math.max(0, coupon.max_usage_count - (coupon.total_uses || 0)) 
                    : 'Unlimited';

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 font-mono font-bold text-primary tracking-wider">{coupon.code}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          coupon.discount_type === 'percentage' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                          coupon.discount_type === 'flat' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {coupon.discount_type === 'percentage' ? 'Percentage off' :
                           coupon.discount_type === 'flat' ? 'Rupees off' : 'Free shipping'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        {coupon.expiry_date ? (
                          <span className={`inline-flex items-center gap-1.5 ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(coupon.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        ) : 'Never expires'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">₹{coupon.min_cart_value}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-ink-slate font-black">{coupon.total_uses || 0}</span>
                        <span className="text-slate-400"> / {remaining}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-700">₹{Number(coupon.revenue_generated || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleCouponActive(coupon)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            coupon.is_active ? 'bg-primary' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              coupon.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handlePromoteToBanner(coupon)}
                            disabled={promotingId === coupon.id}
                            className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-50"
                            title="Promote in Banner"
                          >
                            {promotingId === coupon.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Megaphone className="w-4 h-4" />
                            )}
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(coupon)}
                            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl border border-border-subtle shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto font-inter">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-xl font-black text-ink-slate flex items-center gap-2 uppercase tracking-wide">
                <Ticket className="w-5 h-5 text-primary" /> {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Coupon code</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. MONSOON50"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-400 font-mono font-bold uppercase"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Customers type this code at checkout.</p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Discount type</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary capitalize font-bold"
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                  >
                    <option value="percentage">Percentage off</option>
                    <option value="flat">Rupees off</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    {formData.discount_type === 'percentage' ? 'Discount percentage' : 'Discount amount'}
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    disabled={formData.discount_type === 'free_shipping'}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold disabled:bg-slate-50 disabled:text-slate-400"
                    value={formData.discount_type === 'free_shipping' ? 0 : formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formData.discount_type === 'percentage' ? 'Example: enter 50 for 50% off.' :
                     formData.discount_type === 'flat' ? 'Example: enter 100 to reduce the order by ₹100.' : 'No amount is needed for free shipping.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Minimum order amount</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold"
                    value={formData.min_cart_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_cart_value: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Set 0 if customers can use it on any order amount.</p>
                </div>

                {formData.discount_type === 'percentage' && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={formData.has_max_discount_limit}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          has_max_discount_limit: e.target.checked,
                          max_discount_limit: e.target.checked ? prev.max_discount_limit : ''
                        }))}
                      />
                      <div>
                        <p className="text-sm font-bold text-ink-slate">Set a maximum discount amount</p>
                        <p className="text-xs text-text-muted mt-0.5">Example: 50% off, but discount should not be more than ₹200.</p>
                      </div>
                    </label>
                    {formData.has_max_discount_limit && (
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Maximum rupees off"
                        className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                        value={formData.max_discount_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_discount_limit: e.target.value }))}
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Expiry date</label>
                  <input 
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty if this coupon should never expire.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={formData.has_total_use_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        has_total_use_limit: e.target.checked,
                        max_usage_count: e.target.checked ? prev.max_usage_count : ''
                      }))}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink-slate">Limit total orders that can use this coupon</p>
                      <p className="text-xs text-text-muted mt-0.5">Turn on for limited campaigns. Example: first 10 coupon orders only.</p>
                    </div>
                  </label>
                  {formData.has_total_use_limit && (
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Total order limit"
                      className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                      value={formData.max_usage_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_usage_count: e.target.value }))}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={formData.has_customer_use_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        has_customer_use_limit: e.target.checked,
                        per_customer_usage_limit: e.target.checked ? (prev.per_customer_usage_limit || 1) : ''
                      }))}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink-slate">Limit how many times each customer can use it</p>
                      <p className="text-xs text-text-muted mt-0.5">Turn off if the same customer can use this coupon on many orders.</p>
                    </div>
                  </label>
                  {formData.has_customer_use_limit && (
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Orders per customer"
                      className="mt-3 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-bold bg-white"
                      value={formData.per_customer_usage_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, per_customer_usage_limit: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <input 
                  type="checkbox" 
                  id="coupon_active"
                  className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="coupon_active" className="text-sm font-bold text-ink-slate cursor-pointer">
                  Activate Coupon immediately
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border-subtle pt-6">
                <Button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={modalLoading}
                  className="bg-primary hover:bg-[#005a14] text-white rounded-xl py-3 px-6 font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
