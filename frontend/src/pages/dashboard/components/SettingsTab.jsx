import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const SettingsTab = ({ user, onUpdateProfile }) => {
  const [profileForm, setProfileForm] = useState({ 
    full_name: user?.full_name || '', 
    email: user?.email || '', 
    phone: user?.phone || '' 
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    await onUpdateProfile(profileForm);
    setUpdatingProfile(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-emerald-glow">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Profile</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
            <Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="h-12 rounded-lg bg-surface border border-border-subtle focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm font-medium" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
            <Input value={profileForm.email} disabled className="h-12 rounded-lg bg-surface-container-low border border-border-subtle px-4 text-sm font-medium cursor-not-allowed opacity-60" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
            <PhoneInput
              international
              defaultCountry="IN"
              value={profileForm.phone}
              onChange={val => setProfileForm({...profileForm, phone: val || ''})}
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none"
              numberInputProps={{
                className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm font-medium",
                placeholder: "Enter phone number"
              }}
            />
          </div>
          <div className="md:col-span-2 pt-2">
            <Button type="submit" disabled={updatingProfile} className="h-12 rounded-lg px-8 gap-2 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow shadow-sm">
              {updatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-8 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-md">
            <Trash2 className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Account Deactivation</h2>
        </div>
        <div className="p-6 bg-red-50/50 rounded-xl border border-red-200/50 shadow-sm flex flex-col items-start gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-red-900">Delete Account Permanently</h3>
            <p className="text-red-700 text-sm font-medium">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button 
            onClick={() => {
              if(window.confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone.')) {
                window.dispatchEvent(new CustomEvent('request-account-deletion'));
              }
            }}
            className="h-12 rounded-lg px-6 gap-2 font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsTab;
