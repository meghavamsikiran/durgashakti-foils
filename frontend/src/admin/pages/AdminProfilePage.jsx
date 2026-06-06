import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Lock, Trash } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth.service';
import adminService from '../services/admin.service';
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Uploading profile picture...');
    try {
      const response = await adminService.uploadProductImage(file);
      const url = response.data.url;
      
      // Auto-save the new profile picture URL
      await authService.updateProfile({ ...profileForm, profile_pic: url });
      await refreshUser();
      toast.success('Profile picture updated successfully.', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to upload image', { id: toastId });
    }
  };

  const handleLogoDelete = async () => {
    const toastId = toast.loading('Removing profile picture...');
    try {
      await authService.updateProfile({ ...profileForm, profile_pic: "" });
      await refreshUser();
      toast.success('Profile picture removed.', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to remove image', { id: toastId });
    }
  };

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

          {/* Superadmin Circular Profile Pic Upload Section */}
          {isSuperAdmin && (
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-slate-50 flex items-center justify-center shadow-inner">
                  <img 
                    src={user?.permissions?.profile_pic || '/logo-durga.avif'} 
                    alt="Super Admin Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {user?.permissions?.profile_pic && (
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    className="absolute -top-1 -right-1 bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-full shadow-sm transition-all active:scale-90 border border-rose-100"
                    title="Remove Profile Picture"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Superadmin Profile Picture</h3>
                <p className="text-[10px] text-slate-500 max-w-sm font-medium">This circular photo serves as your system profile picture and is visible only to you.</p>
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                  <label className="cursor-pointer bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-primary/20 shadow-sm active:scale-95">
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

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
