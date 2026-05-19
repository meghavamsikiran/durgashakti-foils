import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const SettingsTab = ({ user, onUpdateProfile, onChangePassword }) => {
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    await onUpdateProfile(profileForm);
    setUpdatingProfile(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    await onChangePassword(passwordForm);
    setUpdatingPassword(false);
    setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Account Settings</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
            <Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
            <Input value={profileForm.email} disabled className="h-16 rounded-2xl bg-slate-100 border-transparent px-6 text-lg font-bold cursor-not-allowed opacity-60" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</Label>
            <PhoneInput
              international
              defaultCountry="IN"
              value={profileForm.phone}
              onChange={val => setProfileForm({...profileForm, phone: val || ''})}
              className="flex h-16 rounded-2xl bg-slate-50 border border-slate-200/30 focus-within:bg-white focus-within:border-indigo-600 px-6 text-lg font-bold outline-none"
            />
          </div>
          <div className="md:col-span-2 pt-4">
            <Button type="submit" disabled={updatingProfile} className="h-16 rounded-2xl px-10 gap-2 font-black uppercase tracking-widest bg-indigo-600 text-white shadow-xl shadow-indigo-100">
              {updatingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile
            </Button>
          </div>
        </form>
      </div>



      <div className="space-y-8 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-100">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Danger Zone</h2>
        </div>
        <div className="p-10 bg-red-50 rounded-[3rem] border border-red-200 shadow-xl flex flex-col items-start gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-red-900">Delete Account Permanently</h3>
            <p className="text-red-700 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button 
            onClick={() => {
              if(window.confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone.')) {
                // We'll dispatch a custom event or use a prop if provided. 
                // Let's rely on a window event to let CustomerDashboard handle it easily.
                window.dispatchEvent(new CustomEvent('request-account-deletion'));
              }
            }}
            className="h-14 rounded-2xl px-8 gap-2 font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsTab;
