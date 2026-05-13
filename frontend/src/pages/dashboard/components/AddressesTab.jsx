import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus as PlusIcon, Loader2, LocateFixed, Pencil, Trash2 } from 'lucide-react';
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

const AddressesTab = ({ addresses, loading, onAddAddress, onUpdateAddress, onDeleteAddress }) => {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({ 
    label: 'Home', full_name: '', phone: '', 
    address_line1: '', address_line2: '', 
    city: '', state: '', pincode: '', is_default: false 
  });

  const { lookup, loading: checkingPincode } = usePincodeLookup();
  const { detect, loading: detectingLocation } = useGeoLocationAddress();

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressForm(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      const data = await lookup(pin);
      if (data) {
        setAddressForm(prev => ({
          ...prev,
          state: data.state,
          city: data.city
        }));
      }
    }
  };

  const handleDetectLocation = async () => {
    try {
      const data = await detect();
      setAddressForm(prev => ({
        ...prev,
        pincode: data.pincode,
        state: data.state || prev.state,
        city: data.city || prev.city,
        address_line2: data.area || prev.address_line2
      }));
    } catch (err) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let success;
    if (editingAddressId) {
      success = await onUpdateAddress(editingAddressId, addressForm);
    } else {
      success = await onAddAddress(addressForm);
    }

    if (success) {
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ label: 'Home', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false });
    }
  };

  const handleEditClick = (addr) => {
    setAddressForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default || false
    });
    setEditingAddressId(addr.id);
    setShowAddressForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !showAddressForm) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading addresses...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Addresses</h2>
        {!showAddressForm && (
          <Button onClick={() => setShowAddressForm(true)} className="rounded-2xl h-14 px-8 gap-2 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest bg-indigo-600 text-white">
            <PlusIcon className="w-5 h-5" /> New Address
          </Button>
        )}
      </div>

      {showAddressForm ? (
        <form onSubmit={handleSubmit} className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
              <Input placeholder="e.g. Rahul Sharma" value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} required className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</Label>
              <PhoneInput
                international
                defaultCountry="IN"
                value={addressForm.phone}
                onChange={val => setAddressForm({...addressForm, phone: val || ''})}
                displayInitialValueAsLocalNumber={false}
                className="flex h-16 w-full rounded-2xl border border-transparent bg-slate-50 px-6 py-2 text-lg font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:bg-white focus-within:border-indigo-600 transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pincode</Label>
              <div className="relative">
                <Input placeholder="6 digits" value={addressForm.pincode} onChange={handlePincodeChange} required maxLength={6} className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
                {checkingPincode && <Loader2 className="absolute right-6 top-5 w-6 h-6 animate-spin text-indigo-600" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</Label>
              <select 
                value={addressForm.state} 
                onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                className="w-full rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City / District</Label>
              <Input 
                value={addressForm.city} 
                onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                placeholder="Enter City" 
                className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Flat, House no., Building, Apartment</Label>
            <Input value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} required className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Area, Street, Landmark (Optional)</Label>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                disabled={detectingLocation}
                className="text-indigo-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-1 hover:text-indigo-700 transition-colors"
              >
                {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                {detectingLocation ? "Detecting..." : "Use my current location"}
              </button>
            </div>
            <Input value={addressForm.address_line2} onChange={e => setAddressForm({...addressForm, address_line2: e.target.value})} className="rounded-2xl h-16 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <Button type="submit" className="h-16 rounded-[1.5rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-indigo-200">{editingAddressId ? 'Update Address' : 'Save Address'}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {addresses.length === 0 ? (
            <div className="md:col-span-2 p-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No addresses found</h3>
              <p className="text-slate-500 font-medium mt-2">Add your shipping address to start ordering.</p>
            </div>
          ) : addresses.map(addr => (
            <div key={addr.id} className="p-8 rounded-[2.5rem] border border-slate-100 bg-white relative group hover:shadow-2xl hover:border-indigo-100 transition-all animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">{addr.label}</div>
                {addr.is_default && <div className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Primary</div>}
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2">{addr.full_name}</h4>
              <p className="text-slate-500 leading-relaxed font-medium">
                {addr.address_line1}<br />
                {addr.address_line2 && <>{addr.address_line2}<br /></>}
                {addr.city}, {addr.state} - <span className="font-black text-slate-900">{addr.pincode}</span>
              </p>
              <div className="mt-6 flex items-center gap-3 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                  {addr.phone}
                </div>
              </div>
              <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEditClick(addr)} className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => onDeleteAddress(addr.id)} className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AddressesTab;
