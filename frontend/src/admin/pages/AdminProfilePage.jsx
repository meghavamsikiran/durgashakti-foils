import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth.service';
import { toast } from 'sonner';

const AdminProfilePage = () => {
  const { user, isSuperAdmin, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Only super administrators can edit personal info.');
      return;
    }
    setSaving(true);
    try {
      await authService.updateProfile(profileForm);
      toast.success('Account settings updated successfully.');
      await refreshUser();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update account settings.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (editable) => (
    `w-full h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold ${
      editable
        ? 'bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all border-slate-300'
        : 'bg-slate-50 text-slate-500 select-none cursor-not-allowed border-slate-100'
    }`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-4xl"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            My Account Settings
          </h1>
          <p className="text-slate-500 mt-1 font-medium">View your admin account details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 max-w-xl gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Profile Info</h2>
                <p className="text-[11px] text-slate-500 font-semibold">Your basic system identifiers.</p>
              </div>
            </div>
            {!isSuperAdmin && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50 uppercase tracking-wide">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
              <input
                type="text"
                required
                disabled={!isSuperAdmin}
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className={inputClass(isSuperAdmin)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                required
                disabled={!isSuperAdmin}
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                className={inputClass(isSuperAdmin)}
                title={isSuperAdmin ? 'Super admin email can be updated here.' : 'Only super admins can change contact details.'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className={inputClass(isSuperAdmin)}
              />
            </div>

            {isSuperAdmin ? (
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-emerald-hover text-white h-12 rounded-xl font-bold tracking-wider text-xs transition-all uppercase shadow-md hover:shadow-emerald-glow disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 font-semibold text-center italic mt-2">
                Note: Email, phone number, and name edits are restricted to the Super Administrator.
              </p>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminProfilePage;
