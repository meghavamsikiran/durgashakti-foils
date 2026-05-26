import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Loader2, Key } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../services/admin.service';
import { toast } from 'sonner';

const AdminProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Sync profile details if context loads late
  useEffect(() => {
    if (user) {
      setProfileForm({ full_name: user.full_name || '' });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      toast.error('Full Name cannot be empty');
      return;
    }
    setUpdatingProfile(true);
    try {
      await adminService.updateProfile(profileForm);
      toast.success('Profile details updated successfully');
      await refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile details');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setUpdatingPassword(true);
    try {
      await adminService.changePassword({
        current_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      toast.success('Administrative password updated successfully');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-4xl"
    >
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            My Account Settings
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {isSuperAdmin ? 'Update your profile details and administrative password.' : 'Update your profile details.'}
          </p>
        </div>
      </div>

      {/* Grid of Forms */}
      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'md:grid-cols-2' : 'max-w-xl'} gap-8`}>
        
        {/* Profile Info Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Profile Info</h2>
              <p className="text-[11px] text-slate-500 font-semibold">Your basic system identifiers.</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
              <input 
                type="text"
                required
                value={profileForm.full_name} 
                onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} 
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input 
                type="email"
                disabled
                value={user?.email || ''} 
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 px-4 py-3 text-sm font-semibold select-none cursor-not-allowed"
                title="Emails cannot be changed directly by administrators for audit safety."
              />
              <p className="text-[10px] text-slate-400 font-bold ml-1">🔒 Email cannot be altered for audit trail integrity.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
              <input 
                type="text"
                disabled
                value={user?.phone || '—'} 
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 px-4 py-3 text-sm font-semibold select-none cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={updatingProfile} 
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow"
              >
                {updatingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        {isSuperAdmin && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Security Credentials</h2>
                <p className="text-[11px] text-slate-500 font-semibold">Change your administrative password.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Current Password</label>
                <input 
                  type="password"
                  required
                  value={passwordForm.old_password} 
                  onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Password</label>
                <input 
                  type="password"
                  required
                  value={passwordForm.new_password} 
                  onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  value={passwordForm.confirm_password} 
                  onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={updatingPassword} 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default AdminProfilePage;
