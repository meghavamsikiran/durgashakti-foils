import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import {
  Building2, Phone, Mail, MapPin, Globe, Save,
  Instagram, Facebook, ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const WhatsApp = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
  >
    <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.761.458 3.479 1.332 4.998L2 22l5.166-1.354c1.47.8 3.123 1.222 4.846 1.222 5.506 0 9.988-4.482 9.988-9.988 0-5.506-4.482-9.988-9.988-9.988zm4.73 13.9c-.2.56-1.16 1.07-1.6 1.1-.38.03-.87.05-2.22-.5-1.72-.7-2.82-2.45-2.9-2.56-.08-.1-1.12-1.48-1.12-2.83 0-1.35.7-2 .95-2.27.2-.23.55-.3.8-.3h.27c.2 0 .72.58.72.58l.72 1.48c.1.2.08.4-.04.56l-.37.5c-.15.17-.32.37-.45.5-.15.15-.3.32-.13.62.17.3.77 1.27 1.65 2.05.75.67 1.38.87 1.73 1.05.35.17.55.15.75-.07.2-.23.87-.97 1.1-1.3.23-.33.47-.27.8-.15.32.13 2.05 1.02 2.4 1.2.35.17.58.25.67.4.08.15.08.87-.12 1.43z" />
  </svg>
);

const BusinessProfilePage = () => {
  const getCachedProfile = () => {
    const cached = adminService.getCached('/admin/settings') || adminService.getCached('/settings/public');
    const profile = cached?.data?.company_profile || {};
    return {
      ...profile,
      whatsappLink: profile.whatsappLink || profile.youtubeLink || ''
    };
  };

  const [companyName, setCompanyName] = useState(() => getCachedProfile().companyName || '');
  const [gstNumber, setGstNumber] = useState(() => getCachedProfile().gstNumber || '');
  const [companyPhone, setCompanyPhone] = useState(() => getCachedProfile().companyPhone || '');
  const [companyEmail, setCompanyEmail] = useState(() => getCachedProfile().companyEmail || '');
  const [companyAddress, setCompanyAddress] = useState(() => getCachedProfile().companyAddress || '');
  const [googleMapsLink, setGoogleMapsLink] = useState(() => getCachedProfile().googleMapsLink || '');
  const [instagramLink, setInstagramLink] = useState(() => getCachedProfile().instagramLink || 'https://www.instagram.com/durgashaktifoils_pvt.ltd/');
  const [facebookLink, setFacebookLink] = useState(() => getCachedProfile().facebookLink || '');
  const [whatsappLink, setWhatsappLink] = useState(() => getCachedProfile().whatsappLink || '');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(() => {
    const cached = adminService.getCached('/admin/settings') || adminService.getCached('/settings/public');
    return !!cached;
  });

  const loadSettings = async () => {
    const cached = adminService.getCached('/admin/settings') || adminService.getCached('/settings/public');
    if (cached) {
      const data = cached.data || {};
      const profile = data.company_profile || {};
      setCompanyName(profile.companyName || '');
      setGstNumber(profile.gstNumber || '');
      setCompanyPhone(profile.companyPhone || '');
      setCompanyEmail(profile.companyEmail || '');
      setCompanyAddress(profile.companyAddress || '');
      setGoogleMapsLink(profile.googleMapsLink || '');
      setInstagramLink(profile.instagramLink || 'https://www.instagram.com/durgashaktifoils_pvt.ltd/');
      setFacebookLink(profile.facebookLink || '');
      setWhatsappLink(profile.whatsappLink || profile.youtubeLink || '');
    } else {
      setLoaded(false);
    }
    try {
      const res = await adminService.getSettings();
      const data = res.data || {};
      const profile = data.company_profile || {};
      setCompanyName(profile.companyName || '');
      setGstNumber(profile.gstNumber || '');
      setCompanyPhone(profile.companyPhone || '');
      setCompanyEmail(profile.companyEmail || '');
      setCompanyAddress(profile.companyAddress || '');
      setGoogleMapsLink(profile.googleMapsLink || '');
      setInstagramLink(profile.instagramLink || 'https://www.instagram.com/durgashaktifoils_pvt.ltd/');
      setFacebookLink(profile.facebookLink || '');
      setWhatsappLink(profile.whatsappLink || profile.youtubeLink || '');
    } catch (err) {
      toast.error('Failed to load business profile settings');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await adminService.updateSetting({
        key: 'company_profile',
        value: { companyName, gstNumber, companyPhone, companyEmail, companyAddress, googleMapsLink, instagramLink, facebookLink, whatsappLink, youtubeLink: whatsappLink }
      });
      toast.success('Business profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Business Profile
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Update your public company details, GST registration, and contact info.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden max-w-4xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
          <Building2 className="w-32 h-32 text-primary/20 animate-pulse" />
        </div>

        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Business Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Company Name</label>
            <div className="relative group">
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                placeholder="DurgaShakti Foils" 
              />
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GST Number</label>
            <div className="relative group">
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={gstNumber} 
                onChange={e => setGstNumber(e.target.value)} 
                placeholder="29XXXXX..." 
              />
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</label>
            <div className="relative group">
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={companyPhone} 
                onChange={e => setCompanyPhone(e.target.value)} 
                placeholder="+91..." 
              />
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
            <div className="relative group">
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={companyEmail} 
                onChange={e => setCompanyEmail(e.target.value)} 
                placeholder="ops@durgashakti.com" 
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Office Address</label>
            <div className="relative group">
              <textarea 
                rows={3} 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={companyAddress} 
                onChange={e => setCompanyAddress(e.target.value)} 
                placeholder="Full physical address..." 
              />
              <MapPin className="absolute left-3.5 top-4 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Google Maps Share / Embed Link</label>
            <div className="relative group">
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                value={googleMapsLink} 
                onChange={e => setGoogleMapsLink(e.target.value)} 
                placeholder="https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6 or search query..." 
              />
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="md:col-span-2 mt-6 pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Social Media Profile Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instagram Link</label>
                <div className="relative group">
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                    value={instagramLink} 
                    onChange={e => setInstagramLink(e.target.value)} 
                    placeholder="https://instagram.com/..." 
                  />
                  <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Facebook Link</label>
                <div className="relative group">
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                    value={facebookLink} 
                    onChange={e => setFacebookLink(e.target.value)} 
                    placeholder="https://facebook.com/..." 
                  />
                  <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp Link</label>
                <div className="relative group">
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                    value={whatsappLink} 
                    onChange={e => setWhatsappLink(e.target.value)} 
                    placeholder="https://wa.me/..." 
                  />
                  <WhatsApp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end">
          <Button 
            disabled={saving} 
            onClick={save} 
            className="rounded-xl px-12 h-12 font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow flex items-center gap-2"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Business Profile</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;
