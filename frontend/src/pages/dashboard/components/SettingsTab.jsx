import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

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

        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
            <Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
            <Input value={profileForm.email} disabled className="h-16 rounded-2xl bg-slate-100 border-transparent px-6 text-lg font-bold cursor-not-allowed opacity-60" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</Label>
            <Input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
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
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-100">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Security</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current Password</Label>
            <Input type="password" value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</Label>
            <Input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</Label>
            <Input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="h-16 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-600 transition-all px-6 text-lg font-bold" />
          </div>
          <div className="md:col-span-3 pt-4">
            <Button type="submit" disabled={updatingPassword} className="h-16 rounded-2xl px-10 gap-2 font-black uppercase tracking-widest bg-slate-900 text-white">
              {updatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default SettingsTab;
