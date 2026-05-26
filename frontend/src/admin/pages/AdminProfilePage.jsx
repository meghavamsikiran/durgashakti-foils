import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../services/admin.service';
import { toast } from 'sonner';

const AdminProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);

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
            Update your profile details.
          </p>
        </div>
      </div>

      {/* Grid of Forms */}
      <div className="grid grid-cols-1 max-w-xl gap-8">
        
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



      </div>
    </motion.div>
  );
};

export default AdminProfilePage;
