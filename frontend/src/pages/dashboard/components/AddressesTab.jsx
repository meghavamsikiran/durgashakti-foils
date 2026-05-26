import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus as PlusIcon, Loader2, LocateFixed, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
    label: 'Home', full_name: '', phone: '', 
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
        address_line1: data.address_line1 || prev.address_line1,
        address_line2: data.address_line2 || prev.address_line2
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

  if (loading && !showAddressForm) return <PageLoader message="Loading addresses..." />;

  const totalPages = Math.max(1, Math.ceil((addresses?.length || 0) / ITEMS_PER_PAGE));
  const pageItems = (addresses || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Addresses</h2>
        {!showAddressForm && (
          <Button onClick={() => setShowAddressForm(true)} className="rounded-lg h-12 px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow w-full sm:w-auto font-black uppercase tracking-widest justify-center">
            <PlusIcon className="w-5 h-5" /> New Address
          </Button>
        )}
      </div>

      {showAddressForm ? (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-xl bg-surface-container-lowest border border-border-subtle shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
              <Input placeholder="e.g. Rahul Sharma" value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} required className="rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</Label>
              <PhoneInput
                international
                defaultCountry="IN"
                value={addressForm.phone}
                onChange={val => setAddressForm({...addressForm, phone: val || ''})}
                displayInitialValueAsLocalNumber={false}
                className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none"
                numberInputProps={{
                  className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm font-medium",
                  placeholder: "Enter phone number"
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pincode</Label>
              <div className="relative">
                <Input placeholder="6 digits" value={addressForm.pincode} onChange={handlePincodeChange} required maxLength={6} className="rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" />
                {checkingPincode && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-primary" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</Label>
              <select 
                value={addressForm.state} 
                onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                className="w-full rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium outline-none appearance-none cursor-pointer"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City / District</Label>
              <Input 
                value={addressForm.city} 
                onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                placeholder="Enter City" 
                className="rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Flat, House no., Building, Apartment</Label>
            <Input value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} required className="rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Area, Street, Landmark (Optional)</Label>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                disabled={detectingLocation}
                className="text-primary font-black uppercase tracking-widest text-[9px] flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                {detectingLocation ? "Detecting..." : "Use my current location"}
              </button>
            </div>
            <Input value={addressForm.address_line2} onChange={e => setAddressForm({...addressForm, address_line2: e.target.value})} className="rounded-lg h-12 bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" />
            <p className="text-[10px] font-semibold text-amber-600/80 italic ml-1">
              * Note: Geolocation approximations depend on browser permissions/settings and might not work precisely. Please verify loaded address details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Button type="submit" className="h-12 rounded-lg text-sm font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow">{editingAddressId ? 'Update Address' : 'Save Address'}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="h-12 rounded-lg font-black uppercase tracking-widest hover:bg-surface-container text-sm">Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.length === 0 ? (
            <div className="md:col-span-2 p-16 text-center bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
              <div className="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">No addresses found</h3>
              <p className="text-muted-foreground font-medium mt-2">Add your shipping address to start ordering.</p>
            </div>
          ) : pageItems.map(addr => (
            <div key={addr.id} className="p-6 rounded-xl border border-border-subtle bg-surface-container-lowest relative group hover:shadow-emerald-glow hover:border-primary/50 transition-all animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-sm text-[10px] font-mono tracking-wider font-semibold uppercase">{addr.label}</div>
                {addr.is_default && <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-sm text-[10px] font-mono tracking-wider font-semibold uppercase">Primary</div>}
              </div>
              <h4 className="text-xl font-black text-foreground mb-1">{addr.full_name}</h4>
              <p className="text-muted-foreground leading-relaxed text-sm font-medium">
                {addr.address_line1}<br />
                {addr.address_line2 && <>{addr.address_line2}<br /></>}
                {addr.city}, {addr.state} - <span className="font-mono font-bold text-foreground">{addr.pincode}</span>
              </p>
              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                  {addr.phone}
                </div>
              </div>
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEditClick(addr)} className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteAddress(addr.id)} className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!showAddressForm && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-10 h-10 p-0 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground font-mono">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-10 h-10 p-0 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default AddressesTab;
