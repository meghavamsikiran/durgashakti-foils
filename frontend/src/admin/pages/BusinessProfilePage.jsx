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
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp Number</label>
                <div className="relative group">
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                    value={whatsappLink} 
                    onChange={e => setWhatsappLink(e.target.value)} 
                    placeholder="e.g., +91 83675 42954" 
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
