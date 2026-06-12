import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Briefcase, MapPin, CheckCircle2, Plus, ArrowLeft, ArrowRight, Loader2, LocateFixed } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { usePincodeLookup } from '../../../hooks/usePincodeLookup';
import { useGeoLocationAddress } from '../../../hooks/useGeoLocationAddress';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const AddressStep = ({ 
  savedAddresses, 
  addressesLoading = false,
  selectedAddressId, 
  shippingInfo, 
  onSelectAddress, 
  setShippingInfo,
  onContinue 
}) => {
  const [showAddressSelector, setShowAddressSelector] = useState(savedAddresses && savedAddresses.length > 0);
  const [hasInitializedSelector, setHasInitializedSelector] = useState(false);
  const { lookup, loading: checkingPincode } = usePincodeLookup();
  const { detect, loading: detectingLocation } = useGeoLocationAddress();

  React.useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !hasInitializedSelector) {
      setShowAddressSelector(true);
      setHasInitializedSelector(true);
    }
  }, [savedAddresses, hasInitializedSelector]);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    onInputChange({ target: { name: 'pincode', value: pin } });

    if (pin.length === 6) {
      const data = await lookup(pin);
      if (data) {
        const matchedState = INDIAN_STATES.find(
          s => s.toLowerCase() === data.state.toLowerCase()
        ) || data.state;
        setShippingInfo(prev => ({ ...prev, state: matchedState, city: data.city }));
      }
    }
  };

  const handleDetectLocation = async () => {
    try {
      const data = await detect();
      setShippingInfo(prev => ({
        ...prev,
        pincode: data.pincode,
        state: data.state || prev.state,
        city: data.city || prev.city,
        address_line1: data.address_line1 || prev.address_line1,
        address_line2: data.address_line2 || prev.address_line2
      }));
    } catch (err) {}
  };

  if (addressesLoading) {
    return (
      <div className="bg-[#131B17] rounded-[2rem] p-8 border border-[#26322B] flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#25D958] animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">Loading saved addresses...</p>
      </div>
    );
  }

  return (
    <motion.div
      key="shipping"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-[#131B17] rounded-[2rem] p-8 border border-[#26322B] text-white"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider font-sans">Shipping Details</h2>
        {savedAddresses && savedAddresses.length > 0 && (
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => {
              const next = !showAddressSelector;
              setShowAddressSelector(next);
              if (!next) {
                setShippingInfo({
                  label: 'Home',
                  full_name: '',
                  phone: '',
                  alternate_phone: '',
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  state: '',
                  pincode: ''
                });
              }
            }}
            className="rounded-full font-bold uppercase tracking-wider text-[10px] h-10 px-5 border-[#26322B] bg-[#0C1310] text-slate-350 hover:border-[#25D958] hover:text-[#25D958] transition-all"
          >
            {showAddressSelector ? (
              <ArrowLeft className="w-3 h-3 mr-2" />
            ) : (
              <ArrowRight className="w-3 h-3 mr-2" />
            )}
            {showAddressSelector ? 'Enter New Address' : 'Select Saved Address'}
            {addressesLoading && (
              <Loader2 className="w-3 h-3 ml-2 text-slate-400 animate-spin" />
            )}
          </Button>
        )}
      </div>
      
      <div className="space-y-6">
        {showAddressSelector && savedAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedAddresses.map(addr => (
              <div 
                key={addr.id} 
                onClick={() => onSelectAddress(addr)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative group ${selectedAddressId === addr.id ? 'border-[#25D958] bg-[#25D958]/5' : 'border-[#26322B] bg-[#0C1310] hover:border-[#25D958]/20'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${selectedAddressId === addr.id ? 'bg-[#25D958] text-[#0C1310]' : 'bg-[#19231F] text-slate-400'}`}>
                      {addr.label === 'Home' ? <Home className="w-3 h-3" /> : addr.label === 'Work' ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{addr.label}</span>
                  </div>
                  {selectedAddressId === addr.id && <CheckCircle2 className="w-5 h-5 text-[#25D958]" />}
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{addr.full_name}</h4>
                <p className="text-xs text-slate-350 line-clamp-2 leading-relaxed">
                  {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase font-mono">
                  {addr.phone}{addr.alternate_phone ? ` / ${addr.alternate_phone}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">Address Type</Label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0C1310] border border-[#26322B] p-1 max-w-sm">
                  {['Home', 'Work'].map(label => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setShippingInfo(prev => ({ ...prev, label }))}
                      className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${shippingInfo.label === label ? 'bg-[#25D958] text-[#0C1310] shadow-sm' : 'text-slate-400 hover:bg-[#131B17]/80'}`}
                    >
                      {label === 'Home' ? <Home className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">Full Name</Label>
                <Input name="full_name" value={shippingInfo.full_name} onChange={onInputChange} placeholder="Rahul Sharma" className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">Mobile</Label>
                <Input
                  type="text"
                  maxLength={10}
                  value={shippingInfo.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setShippingInfo(prev => ({ ...prev, phone: val }));
                  }}
                  className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">Alternative Phone Number (Optional)</Label>
                <Input
                  type="text"
                  maxLength={10}
                  value={shippingInfo.alternate_phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setShippingInfo(prev => ({ ...prev, alternate_phone: val }));
                  }}
                  className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]"
                  placeholder="Optional alternate 10-digit mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">Pincode</Label>
                <div className="relative">
                  <Input name="pincode" value={shippingInfo.pincode} onChange={handlePincodeChange} placeholder="6 digits" className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]" maxLength={6} />
                  {checkingPincode && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-[#25D958]" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">State</Label>
                <div className="relative">
                  <select 
                    name="state"
                    value={shippingInfo.state} 
                    onChange={onInputChange}
                    className="w-full rounded-xl h-12 bg-[#0C1310] border border-[#26322B] px-4 text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[#25D958] focus:border-[#25D958] outline-none appearance-none"
                  >
                    <option value="">Select</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state} className="bg-[#131B17] text-white">{state}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">City</Label>
                <Input name="city" value={shippingInfo.city} onChange={onInputChange} placeholder="City" className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono ml-1">House/Flat No., Building</Label>
              <Input name="address_line1" value={shippingInfo.address_line1} onChange={onInputChange} className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Area, Street, Landmark</Label>
                <button 
                  type="button" 
                  onClick={handleDetectLocation} 
                  disabled={detectingLocation}
                  className="text-[#25D958] font-bold uppercase tracking-wider text-[8px] font-mono flex items-center gap-1 hover:text-[#1bb847] transition-colors"
                >
                  {detectingLocation ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <LocateFixed className="w-2.5 h-2.5" />}
                  {detectingLocation ? "Detecting..." : "Use current location"}
                </button>
              </div>
              <Input name="address_line2" value={shippingInfo.address_line2} onChange={onInputChange} className="rounded-xl h-12 bg-[#0C1310] border-[#26322B] text-white focus-visible:ring-1 focus-visible:ring-[#25D958] focus-visible:border-[#25D958]" />
              <p className="text-[10px] font-semibold text-amber-500/80 italic ml-1">
                * Note: This might not fetch exact location, please review your location while using it.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button 
            onClick={onContinue} 
            className="w-full h-14 md:h-16 rounded-2xl text-base md:text-lg font-black uppercase tracking-wider bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] transition-all shadow-[0_4px_20px_rgba(37,217,88,0.2)] active:scale-[0.98]"
          >
            Continue to Payment <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AddressStep;
