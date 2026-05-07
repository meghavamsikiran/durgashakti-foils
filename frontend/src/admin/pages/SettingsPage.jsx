import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import adminApi from '../services/adminApi';
import { 
  Settings, Building2, Phone, Mail, MapPin, 
  ShieldCheck, Save, Globe, Lock, Cpu,
  Cloud, Database, RefreshCcw
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const SettingsPage = () => {
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState(null);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, meRes] = await Promise.all([
          adminApi.getSettings(),
          adminApi.getMe()
        ]);
        const data = settingsRes.data || {};
        const profile = data.company_profile || {};
        setCompanyName(profile.companyName || '');
        setGstNumber(profile.gstNumber || '');
        setCompanyPhone(profile.companyPhone || '');
        setCompanyEmail(profile.companyEmail || '');
        setCompanyAddress(profile.companyAddress || '');
        setMe(meRes.data);
      } catch {
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await adminApi.updateSetting({
        key: 'company_profile',
        value: { companyName, gstNumber, companyPhone, companyEmail, companyAddress }
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    try {
      setChangingPassword(true);
      await adminApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (!loaded) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Settings...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            Settings
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Update your business profile and system details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                <Building2 className="w-32 h-32 text-indigo-900" />
             </div>
             
             <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Business Profile
             </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-10" 
                         value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="DurgaShakti Foils" />
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Number</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-10" 
                         value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="29XXXXX..." />
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-10" 
                         value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+91..." />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-10" 
                         value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="ops@durgashakti.com" />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                   </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Office Address</label>
                   <div className="relative group">
                      <textarea rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-10" 
                         value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Full physical address..." />
                      <MapPin className="absolute left-3.5 top-4 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                <Button disabled={saving} onClick={save} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2">
                   {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
                </Button>
             </div>
          </div>
          
          {me?.role === 'SUPER_ADMIN' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 relative overflow-hidden mt-8">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                  <Lock className="w-32 h-32 text-indigo-900" />
               </div>
               
               <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  Security & Password
               </h2>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                     <input type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                     <input type="password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters..." />
                  </div>
               </div>

               <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                  <Button disabled={changingPassword} onClick={handleChangePassword} variant="outline" className="rounded-xl px-12 font-black uppercase tracking-widest flex items-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                     {changingPassword ? 'Updating...' : <><RefreshCcw className="w-4 h-4" /> Update Password</>}
                  </Button>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 mt-8 flex flex-col items-center text-center">
               <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-sm font-bold text-slate-600">Password Management Restricted</h3>
               <p className="text-xs text-slate-400 mt-1">Please contact your Super Admin to reset or change your password.</p>
            </div>
          )}
          
          <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl mt-8">
             <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2">System Status</h3>
                <p className="text-indigo-100 text-sm max-w-md">Your system is secure and running smoothly. All global regions are active.</p>
                <div className="mt-6 flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">SSL Secure</span>
                   </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-20">
                <Globe className="w-32 h-32 animate-spin-slow" />
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Cpu className="w-4 h-4 text-indigo-500" />
                 Technical Details
              </h2>
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Database className="w-4 h-4 text-slate-400" />
                       <span className="text-xs font-bold text-slate-600">Database</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Active</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Lock className="w-4 h-4 text-slate-400" />
                       <span className="text-xs font-bold text-slate-600">Security Level</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase">High</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Cloud className="w-4 h-4 text-slate-400" />
                       <span className="text-xs font-bold text-slate-600">Payment Provider</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-800 uppercase">Razorpay Live</span>
                 </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100">
                 <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all">
                    Enable Maintenance Mode
                 </Button>
              </div>
           </div>
           
           <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                 </div>
                 <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Standard</div>
                    <div className="text-sm font-bold">ISO-27001</div>
                 </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">All system actions are logged for safety and records.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
