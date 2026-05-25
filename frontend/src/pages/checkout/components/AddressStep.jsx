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
  selectedAddressId, 
  shippingInfo, 
  onSelectAddress, 
  onInputChange, 
  onSetShippingInfo,
  onContinue 
}) => {
  const [showAddressSelector, setShowAddressSelector] = useState(savedAddresses.length > 0);
  const { lookup, loading: checkingPincode } = usePincodeLookup();
  const { detect, loading: detectingLocation } = useGeoLocationAddress();

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    onInputChange({ target: { name: 'pincode', value: pin } });

    if (pin.length === 6) {
      const data = await lookup(pin);
      if (data) {
        onSetShippingInfo(prev => ({ ...prev, state: data.state, city: data.city }));
      }
    }
  };

  const handleDetectLocation = async () => {
    try {
      const data = await detect();
      onSetShippingInfo(prev => ({
        ...prev,
        pincode: data.pincode,
        state: data.state || prev.state,
        city: data.city || prev.city,
        address_line1: data.address_line1 || prev.address_line1,
        address_line2: data.address_line2 || prev.address_line2
      }));
    } catch (err) {}
  };

  return (
    <motion.div
      key="shipping"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Shipping Details</h2>
        {savedAddresses.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddressSelector(!showAddressSelector)}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-10 px-4"
          >
            {showAddressSelector ? <Plus className="w-3 h-3 mr-2" /> : <ArrowLeft className="w-3 h-3 mr-2" />}
            {showAddressSelector ? "Add New Address" : "Select Saved Address"}
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
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative group ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-primary/20'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${selectedAddressId === addr.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {addr.label === 'Home' ? <Home className="w-3 h-3" /> : addr.label === 'Office' ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{addr.label}</span>
                  </div>
                  {selectedAddressId === addr.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
                <h4 className="font-black text-slate-900 text-sm mb-1">{addr.full_name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <div className="mt-3 text-[10px] font-bold text-slate-500 uppercase">{addr.phone}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
                <Input name="full_name" value={shippingInfo.full_name} onChange={onInputChange} placeholder="Rahul Sharma" className="rounded-xl h-12" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mobile</Label>
                <PhoneInput
                  international
                  defaultCountry="IN"
                  value={shippingInfo.phone}
                  onChange={val => onSetShippingInfo(prev => ({ ...prev, phone: val || '' }))}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none font-medium"
                  numberInputProps={{
                    className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm font-medium",
                    placeholder: "Enter phone number"
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Pincode</Label>
                <div className="relative">
                  <Input name="pincode" value={shippingInfo.pincode} onChange={handlePincodeChange} placeholder="6 digits" className="rounded-xl h-12" maxLength={6} />
                  {checkingPincode && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-primary" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">State</Label>
                <select 
                  name="state"
                  value={shippingInfo.state} 
                  onChange={onInputChange}
                  className="w-full rounded-xl h-12 bg-white border border-input px-4 text-xs font-bold uppercase focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="">Select</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">City</Label>
                <Input name="city" value={shippingInfo.city} onChange={onInputChange} placeholder="City" className="rounded-xl h-12" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">House/Flat No., Building</Label>
              <Input name="address_line1" value={shippingInfo.address_line1} onChange={onInputChange} className="rounded-xl h-12" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Area, Street, Landmark</Label>
                <button 
                  type="button" 
                  onClick={handleDetectLocation} 
                  disabled={detectingLocation}
                  className="text-primary font-black uppercase tracking-widest text-[8px] flex items-center gap-1 hover:text-emerald-hover transition-colors"
                >
                  {detectingLocation ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <LocateFixed className="w-2.5 h-2.5" />}
                  {detectingLocation ? "Detecting..." : "Use current location"}
                </button>
              </div>
              <Input name="address_line2" value={shippingInfo.address_line2} onChange={onInputChange} className="rounded-xl h-12" />
              <p className="text-[10px] font-semibold text-amber-600/80 italic ml-1">
                * Note: Geolocation approximations depend on browser permissions/settings and might not work precisely. Please verify loaded address details.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button 
            onClick={onContinue} 
            className="w-full h-14 md:h-16 rounded-2xl text-base md:text-lg font-black uppercase tracking-widest shadow-xl shadow-emerald-glow bg-primary hover:bg-emerald-hover transition-all"
          >
            Continue to Payment <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AddressStep;
