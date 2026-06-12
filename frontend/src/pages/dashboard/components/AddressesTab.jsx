import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus as PlusIcon, Loader2, LocateFixed, Pencil, Trash2, ChevronLeft, ChevronRight, Home, Briefcase } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PageLoader from '../../../components/ui/PageLoader';
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
  const ITEMS_PER_PAGE = 4;
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [addressForm, setAddressForm] = useState({ 
    label: 'Home', full_name: '', phone: '', alternate_phone: '',
    address_line1: '', address_line2: '', 
    city: '', state: '', pincode: '', is_default: false 
  });

  const { lookup, loading: checkingPincode } = usePincodeLookup();
  const { detect, loading: detectingLocation } = useGeoLocationAddress();

  useEffect(() => {
    const pages = Math.max(1, Math.ceil((addresses?.length || 0) / ITEMS_PER_PAGE));
    setCurrentPage(prev => Math.min(prev, pages));
  }, [addresses?.length]);

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressForm(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      const data = await lookup(pin);
      if (data) {
        const matchedState = INDIAN_STATES.find(
          s => s.toLowerCase() === data.state.toLowerCase()
        ) || data.state;
        setAddressForm(prev => ({
          ...prev,
          state: matchedState,
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
        address_line1: data.address_line1 || prev.address_line1,
        address_line2: data.address_line2 || prev.address_line2
      }));
    } catch (err) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = addressForm.phone ? addressForm.phone.replace(/\D/g, '') : '';
    if (!cleanPhone) {
      toast.error("Phone number is required");
      return;
    }
    const last10 = cleanPhone.slice(-10);
    if (last10.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(last10)) {
      toast.error("Please enter a valid 10-digit phone number (starts with 6-9)");
      return;
    }
    if (addressForm.alternate_phone?.trim()) {
      const cleanAlt = addressForm.alternate_phone.replace(/\D/g, '');
      const last10Alt = cleanAlt.slice(-10);
      if (last10Alt.length !== 10 || !/^[6-9]\d{9}$/.test(last10Alt)) {
        toast.error("Please enter a valid 10-digit alternative phone number (starts with 6-9)");
        return;
      }
    }
    let success;
    if (editingAddressId) {
      success = await onUpdateAddress(editingAddressId, addressForm);
    } else {
      success = await onAddAddress(addressForm);
    }

    if (success) {
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ label: 'Home', full_name: '', phone: '', alternate_phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false });
    }
  };

  const handleEditClick = (addr) => {
    setAddressForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      alternate_phone: addr.alternate_phone || '',
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

  if (loading && !showAddressForm) return <PageLoader message="Loading addresses..." />;

  const totalPages = Math.max(1, Math.ceil((addresses?.length || 0) / ITEMS_PER_PAGE));
  const pageItems = (addresses || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {!showAddressForm && (
        <div className="flex justify-end mb-2">
          <Button onClick={() => setShowAddressForm(true)} className="rounded-lg h-12 px-6 gap-2 bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-bold w-full sm:w-auto font-black uppercase tracking-widest justify-center">
            <PlusIcon className="w-5 h-5" /> New Address
          </Button>
        </div>
      )}

      {showAddressForm ? (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-xl bg-[#19231F] border border-[#26322B] shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#25D958]/10 text-[#25D958] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white font-serif uppercase tracking-tight">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
              <Input placeholder="e.g. Rahul Sharma" value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} required className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Type</Label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#131B17] border border-[#26322B] p-1">
                {['Home', 'Work'].map(label => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAddressForm({...addressForm, label})}
                    className={`h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${addressForm.label === label ? 'bg-[#25D958] text-[#0C1310] shadow-sm' : 'text-slate-450 hover:bg-[#19231F]/40 hover:text-white'}`}
                  >
                    {label === 'Home' ? <Home className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
             <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</Label>
              <Input
                type="text"
                maxLength={10}
                value={addressForm.phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAddressForm({...addressForm, phone: val});
                }}
                className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium"
                placeholder="Enter 10-digit mobile number"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alternative Phone Number (Optional)</Label>
              <Input
                type="text"
                maxLength={10}
                value={addressForm.alternate_phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAddressForm({...addressForm, alternate_phone: val});
                }}
                className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium"
                placeholder="Optional alternate 10-digit mobile number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pincode</Label>
              <div className="relative">
                <Input placeholder="6 digits" value={addressForm.pincode} onChange={handlePincodeChange} required maxLength={6} className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium" />
                {checkingPincode && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-[#25D958]" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</Label>
              <select 
                value={addressForm.state} 
                onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                className="w-full rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:bg-[#19231F] transition-all px-4 text-sm font-medium outline-none cursor-pointer"
              >
                <option value="" className="bg-[#19231F] text-white">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state} className="bg-[#19231F] text-white">{state}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City / District</Label>
              <Input 
                value={addressForm.city} 
                onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                placeholder="Enter City" 
                className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Flat, House no., Building, Apartment</Label>
            <Input value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} required className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Area, Street, Landmark (Optional)</Label>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                disabled={detectingLocation}
                className="text-[#25D958] font-bold uppercase tracking-widest text-[9px] flex items-center gap-1 hover:text-[#25D958]/85 transition-colors"
              >
                {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                {detectingLocation ? "Detecting..." : "Use my current location"}
              </button>
            </div>
            <Input value={addressForm.address_line2} onChange={e => setAddressForm({...addressForm, address_line2: e.target.value})} className="rounded-lg h-12 bg-[#131B17] border border-[#26322B] focus:border-[#25D958] text-white focus:ring-0 transition-all px-4 text-sm font-medium" />
            <p className="text-[10px] font-semibold text-[#fedb41] italic ml-1">
              * Note: This might not fetch exact location, please review your location while using it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="h-12 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-white/5 text-sm uppercase tracking-wider">Cancel</Button>
            <Button type="submit" className="h-12 rounded-lg text-sm font-bold bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] uppercase tracking-wider">{editingAddressId ? 'Update Address' : 'Save Address'}</Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.length === 0 ? (
            <div className="md:col-span-2 p-16 text-center bg-[#19231F] rounded-xl border border-dashed border-[#26322B] text-slate-350">
              <div className="w-16 h-16 bg-[#131B17] border border-[#26322B] rounded-lg flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold font-serif text-white uppercase tracking-tight">No addresses found</h3>
              <p className="text-slate-400 font-medium mt-2">Add your shipping address to start ordering.</p>
            </div>
          ) : pageItems.map(addr => (
            <div key={addr.id} className="p-6 rounded-xl border border-[#26322B] bg-[#19231F] relative group hover:border-[#25D958]/50 transition-all animate-in zoom-in-95 duration-500 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-2 py-0.5 bg-[#131B17] text-slate-300 border border-[#26322B] rounded-sm text-[10px] font-mono tracking-wider font-semibold uppercase">{addr.label}</div>
                {addr.is_default && <div className="px-2 py-0.5 bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20 rounded-sm text-[10px] font-mono tracking-wider font-semibold uppercase">Primary</div>}
              </div>
              <h4 className="text-xl font-bold text-white font-serif mb-1">{addr.full_name}</h4>
              <p className="text-slate-400 leading-relaxed text-sm font-medium">
                {addr.address_line1}<br />
                {addr.address_line2 && <>{addr.address_line2}<br /></>}
                {addr.city}, {addr.state} - <span className="font-mono font-bold text-[#25D958]">{addr.pincode}</span>
              </p>
              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-[#26322B]/60">
                <div className="flex items-center gap-2 text-slate-450 font-mono text-xs">
                  {addr.phone}
                  {addr.alternate_phone && <span className="text-slate-600">/ {addr.alternate_phone}</span>}
                </div>
              </div>
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEditClick(addr)} className="w-10 h-10 rounded-lg bg-[#25D958]/10 text-[#25D958] flex items-center justify-center hover:bg-[#25D958] hover:text-[#0C1310] transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteAddress(addr.id)} className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-450 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!showAddressForm && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-10 h-10 p-0 rounded-lg bg-[#131B17] border border-[#26322B] text-white hover:bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold text-slate-400 font-mono">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-10 h-10 p-0 rounded-lg bg-[#131B17] border border-[#26322B] text-white hover:bg-white/5">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default AddressesTab;
