import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import {
  Building2, Phone, Mail, MapPin, Globe, Save,
  Instagram, Facebook, Youtube, ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const BusinessProfilePage = () => {
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadSettings = async () => {
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
      setYoutubeLink(profile.youtubeLink || '');
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
        value: { companyName, gstNumber, companyPhone, companyEmail, companyAddress, googleMapsLink, instagramLink, facebookLink, youtubeLink }
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">YouTube Link</label>
                <div className="relative group">
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10 font-semibold text-slate-800 bg-white"
                    value={youtubeLink} 
                    onChange={e => setYoutubeLink(e.target.value)} 
                    placeholder="https://youtube.com/..." 
                  />
                  <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
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
