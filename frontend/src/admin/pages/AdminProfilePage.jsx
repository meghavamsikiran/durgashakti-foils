import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminProfilePage = () => {
  const { user } = useAuth();
  const canEditContact = false;
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

  const inputClass = (editable) => (
    `w-full h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold ${
      editable
        ? 'bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all'
        : 'bg-slate-50 text-slate-500 select-none cursor-not-allowed'
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
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Profile Info</h2>
              <p className="text-[11px] text-slate-500 font-semibold">Your basic system identifiers.</p>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
              <input
                type="text"
                required
                disabled
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className={inputClass(false)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                disabled={!canEditContact}
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                className={inputClass(canEditContact)}
                title={canEditContact ? 'Super admin email can be updated here.' : 'Only super admins can change contact details.'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
              <input
                type="text"
                disabled={!canEditContact}
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className={inputClass(canEditContact)}
              />
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminProfilePage;
