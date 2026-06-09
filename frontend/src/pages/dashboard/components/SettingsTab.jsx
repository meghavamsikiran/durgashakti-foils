import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';

const SettingsTab = ({ user, onUpdateProfile }) => {
  const [profileForm, setProfileForm] = useState({ 
    full_name: user?.full_name || '', 
    email: user?.email || '', 
    phone: user?.phone || '' 
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = profileForm.phone ? profileForm.phone.replace(/\D/g, '') : '';
    if (!cleanPhone) {
      toast.error("Phone number is required");
      return;
    }
    if (cleanPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error("Please enter a valid 10-digit phone number (starts with 6-9)");
      return;
    }
    setUpdatingProfile(true);
    await onUpdateProfile({ ...profileForm, phone: cleanPhone });
    setUpdatingProfile(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#25D958]/10 text-[#25D958] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight font-serif">Profile Details</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="grid max-w-4xl grid-cols-1 gap-6 rounded-xl border border-[#26322B] bg-[#19231F] p-6 shadow-sm md:grid-cols-2 md:p-8 text-white">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
            <Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="h-12 rounded-lg bg-[#131B17] border border-[#26322B] focus:border-[#25D958] focus:ring-0 text-white transition-all px-4 text-sm font-medium" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
            <Input value={profileForm.email} disabled className="h-12 rounded-lg bg-[#131B17] border border-[#26322B] px-4 text-slate-400 text-sm font-medium cursor-not-allowed opacity-50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</Label>
            <Input
              type="text"
              maxLength={10}
              value={profileForm.phone}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setProfileForm({...profileForm, phone: val});
              }}
              className="h-12 rounded-lg bg-[#131B17] border border-[#26322B] focus:border-[#25D958] focus:ring-0 text-white transition-all px-4 text-sm font-medium"
              placeholder="Enter 10-digit mobile number"
            />
          </div>
          <div className="pt-2 md:col-span-2">
            <Button type="submit" disabled={updatingProfile} className="h-12 rounded-lg px-8 gap-2 font-bold uppercase tracking-widest bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] shadow-sm">
              {updatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-450 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight font-serif">Account Deactivation</h2>
        </div>
        <div className="flex max-w-4xl flex-col items-start gap-4 rounded-xl border border-rose-500/30 bg-[#19231F] p-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-rose-450 font-serif">Delete Account Permanently</h3>
            <p className="text-slate-400 text-sm font-medium">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button 
            onClick={() => {
              if(window.confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone.')) {
                window.dispatchEvent(new CustomEvent('request-account-deletion'));
              }
            }}
            className="h-12 rounded-lg px-6 gap-2 font-bold uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsTab;
