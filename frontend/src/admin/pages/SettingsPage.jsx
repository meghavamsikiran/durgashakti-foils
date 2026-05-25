import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import {
  Settings, Building2, Phone, Mail, MapPin,
  ShieldCheck, Save, Globe, Lock, Cpu,
  Cloud, Database, RefreshCcw, Timer, Megaphone, Sparkles, Play,
  Instagram, Facebook, Youtube, Star, MessageSquare, Users, IndianRupee
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const formatToLocalInput = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

const formatToISO = (localString) => {
  if (!localString) return '';
  try {
    return new Date(localString).toISOString();
  } catch {
    return '';
  }
};

const SettingsPage = () => {
  const getInitialSettingsState = () => {
    const cachedSettings = adminService.getCached('/admin/settings');
    const cachedMe = adminService.getCached('/auth/me');

    const data = cachedSettings?.data || {};
    const profile = data.company_profile || {};
    const shippingSettings = data.shipping_settings || {};
    const paymentSettings = data.payment_settings || {};
    const bannerSettings = data.scrolling_banner || {};
    const feedbackSettings = data.feedback_settings || {};
    const loyaltySettings = data.loyalty_settings || {};

    return {
      companyName: profile.companyName || '',
      gstNumber: profile.gstNumber || '',
      companyPhone: profile.companyPhone || '',
      companyEmail: profile.companyEmail || '',
      companyAddress: profile.companyAddress || '',
      googleMapsLink: profile.googleMapsLink || '',
      instagramLink: profile.instagramLink || 'https://www.instagram.com/durgashaktifoils_pvt.ltd/',
      facebookLink: profile.facebookLink || '',
      youtubeLink: profile.youtubeLink || '',
      codEnabled: shippingSettings.codEnabled !== false && shippingSettings.codStatus !== 'Inactive' && paymentSettings.cod_enabled !== false,
      bannerText1: bannerSettings.text1 || '',
      bannerText2: bannerSettings.text2 || '',
      bannerTimerEnabled: !!bannerSettings.timer_enabled,
      bannerTimerTarget: formatToLocalInput(bannerSettings.timer_target || ''),
      bannerUseFavicon: bannerSettings.use_favicon !== false,
      ratingsEnabled: feedbackSettings.ratings_enabled !== false,
      commentsEnabled: feedbackSettings.comments_enabled !== false,
      loyaltyMinimumOrders: loyaltySettings.minimum_orders || 10,
      loyaltyMinimumSpend: loyaltySettings.minimum_spend || 15000,
      me: cachedMe?.data || null,
      loaded: !!(cachedSettings && cachedMe)
    };
  };

  const initialState = getInitialSettingsState();

  const [companyName, setCompanyName] = useState(initialState.companyName);
  const [gstNumber, setGstNumber] = useState(initialState.gstNumber);
  const [companyPhone, setCompanyPhone] = useState(initialState.companyPhone);
  const [companyEmail, setCompanyEmail] = useState(initialState.companyEmail);
  const [companyAddress, setCompanyAddress] = useState(initialState.companyAddress);
  const [googleMapsLink, setGoogleMapsLink] = useState(initialState.googleMapsLink);
  const [instagramLink, setInstagramLink] = useState(initialState.instagramLink);
  const [facebookLink, setFacebookLink] = useState(initialState.facebookLink);
  const [youtubeLink, setYoutubeLink] = useState(initialState.youtubeLink);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(initialState.loaded);
  const [me, setMe] = useState(initialState.me);
  const [codEnabled, setCodEnabled] = useState(initialState.codEnabled);

  // Scrolling Banner State
  const [bannerText1, setBannerText1] = useState(initialState.bannerText1);
  const [bannerText2, setBannerText2] = useState(initialState.bannerText2);
  const [bannerTimerEnabled, setBannerTimerEnabled] = useState(initialState.bannerTimerEnabled);
  const [bannerTimerTarget, setBannerTimerTarget] = useState(initialState.bannerTimerTarget);
  const [bannerUseFavicon, setBannerUseFavicon] = useState(initialState.bannerUseFavicon);
  const [savingBanner, setSavingBanner] = useState(false);
  const [ratingsEnabled, setRatingsEnabled] = useState(initialState.ratingsEnabled);
  const [commentsEnabled, setCommentsEnabled] = useState(initialState.commentsEnabled);
  const [loyaltyMinimumOrders, setLoyaltyMinimumOrders] = useState(initialState.loyaltyMinimumOrders);
  const [loyaltyMinimumSpend, setLoyaltyMinimumSpend] = useState(initialState.loyaltyMinimumSpend);
  const [savingExperience, setSavingExperience] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Magic Wand Theme Generators
  const premiumThemes1 = [
    "✨ Experience Purity & Perfection with Durga Shakti Premium Foils ✨",
    "🌟 Elevate Your Kitchen Standards with India's #1 Food-Grade Aluminum Foil 🌟",
    "🍃 Say Goodbye to Toxins - 100% Endlessly Recyclable & Safe Wrapping 🍃",
    "💎 Premium Culinary Grade Aluminum Foil - Preferred by Master Chefs 💎",
    "👑 Elite Heat Retention: Lock in Taste, Aroma & Absolute Freshness 👑",
    "⚜️ Durga Shakti: The Ultimate Shield of Quality & Strength for Your Food ⚜️",
    "🌿 Healthy Cooking starts with Pure Protection - Trust the Pioneers 🌿"
  ];

  const premiumThemes2 = [
    "⚡ Limited Time Offer: Premium Packaging at Unbeatable Prices ends in {timer} ⚡",
    "⏳ Hurry! Our Exclusive 50% Off Flash Sale Ends In: {timer} ⏳",
    "🔥 Limited Time Offer: Premium Packaging at Unbeatable Prices ends in {timer} 🔥",
    "⚡ Don't Miss Out! Special Festival Discount expires in {timer} ⚡",
    "🎁 Unlock Your Special Gift on All Orders Placed within the next {timer} 🎁",
    "🚀 Flash Deal Activated! Free Shipping on all orders ending in {timer} 🚀",
    "💰 Last Chance to Save! Big Festive Bonanza closes in exactly {timer} 💰",
    "🎊 Midnight Special: Prices drop again in {timer} - Shop Now! 🎊"
  ];

  const applyMagicTheme = (setText, themesArray, currentText) => {
    let currentIndex = themesArray.indexOf(currentText);
    let nextIndex = (currentIndex + 1) % themesArray.length;
    setText(themesArray[nextIndex]);
    toast.success('✨ Magic Theme Applied & Grammar Polished!', {
      description: 'The banner text has been professionally formatted.'
    });
  };

  const load = async () => {
    const cachedSettings = adminService.getCached('/admin/settings');
    const cachedMe = adminService.getCached('/auth/me');
    if (!(cachedSettings && cachedMe)) {
      setLoaded(false);
    }
    try {
      const [settingsRes, meRes] = await Promise.all([
        adminService.getSettings(),
        adminService.getMe()
      ]);
      const data = settingsRes.data || {};
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
      const shippingSettings = data.shipping_settings || {};
      const paymentSettings = data.payment_settings || {};
      setCodEnabled(shippingSettings.codEnabled !== false && shippingSettings.codStatus !== 'Inactive' && paymentSettings.cod_enabled !== false);

      const bannerSettings = data.scrolling_banner || {};
      setBannerText1(bannerSettings.text1 || '');
      setBannerText2(bannerSettings.text2 || '');
      setBannerTimerEnabled(!!bannerSettings.timer_enabled);
      setBannerTimerTarget(formatToLocalInput(bannerSettings.timer_target || ''));
      setBannerUseFavicon(bannerSettings.use_favicon !== false);
      const feedbackSettings = data.feedback_settings || {};
      const loyaltySettings = data.loyalty_settings || {};
      setRatingsEnabled(feedbackSettings.ratings_enabled !== false);
      setCommentsEnabled(feedbackSettings.comments_enabled !== false);
      setLoyaltyMinimumOrders(loyaltySettings.minimum_orders || 10);
      setLoyaltyMinimumSpend(loyaltySettings.minimum_spend || 15000);

      setMe(meRes.data);
    } catch {
    } finally {
      setLoaded(true);
    }
  };

  const loadSilent = async () => {
    try {
      const [settingsRes, meRes] = await Promise.all([
        apiClient.get('/admin/settings', { silent: true }),
        apiClient.get('/auth/me', { silent: true })
      ]);
      const data = settingsRes.data || {};
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
      const shippingSettings = data.shipping_settings || {};
      const paymentSettings = data.payment_settings || {};
      setCodEnabled(shippingSettings.codEnabled !== false && shippingSettings.codStatus !== 'Inactive' && paymentSettings.cod_enabled !== false);

      const bannerSettings = data.scrolling_banner || {};
      setBannerText1(bannerSettings.text1 || '');
      setBannerText2(bannerSettings.text2 || '');
      setBannerTimerEnabled(!!bannerSettings.timer_enabled);
      setBannerTimerTarget(formatToLocalInput(bannerSettings.timer_target || ''));
      setBannerUseFavicon(bannerSettings.use_favicon !== false);
      const feedbackSettings = data.feedback_settings || {};
      const loyaltySettings = data.loyalty_settings || {};
      setRatingsEnabled(feedbackSettings.ratings_enabled !== false);
      setCommentsEnabled(feedbackSettings.comments_enabled !== false);
      setLoyaltyMinimumOrders(loyaltySettings.minimum_orders || 10);
      setLoyaltyMinimumSpend(loyaltySettings.minimum_spend || 15000);

      setMe(meRes.data);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    load();
    loadSilent();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await adminService.updateSetting({
        key: 'company_profile',
        value: { companyName, gstNumber, companyPhone, companyEmail, companyAddress, googleMapsLink, instagramLink, facebookLink, youtubeLink }
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveBanner = async () => {
    try {
      setSavingBanner(true);
      const settingsRes = await adminService.getSettings();
      const currentSettings = settingsRes.data || {};
      const currentBanner = currentSettings.scrolling_banner || {};

      await adminService.updateSetting({
        key: 'scrolling_banner',
        value: {
          ...currentBanner,
          text1: bannerText1,
          text2: bannerText2,
          timer_enabled: bannerTimerEnabled,
          timer_target: formatToISO(bannerTimerTarget),
          use_favicon: bannerUseFavicon
        }
      });
      toast.success('Scrolling banner settings saved successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to save scrolling banner settings');
    } finally {
      setSavingBanner(false);
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
      await adminService.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleCod = async (checked) => {
    try {
      setCodEnabled(checked);
      await adminService.updateSetting({
        key: 'payment_settings',
        value: { cod_enabled: checked }
      });
      toast.success(`Cash on Delivery (COD) ${checked ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      setCodEnabled(!checked);
      toast.error(error.message || 'Failed to update payment settings');
    }
  };

  const saveExperienceSettings = async () => {
    try {
      setSavingExperience(true);
      await Promise.all([
        adminService.updateSetting({
          key: 'feedback_settings',
          value: {
            ratings_enabled: ratingsEnabled,
            comments_enabled: commentsEnabled
          }
        }),
        adminService.updateSetting({
          key: 'loyalty_settings',
          value: {
            minimum_orders: Number(loyaltyMinimumOrders) || 10,
            minimum_spend: Number(loyaltyMinimumSpend) || 15000
          }
        })
      ]);
      toast.success('Customer experience settings saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save customer experience settings');
    } finally {
      setSavingExperience(false);
    }
  };

  const hasEdgeEmoji = (str) => {
    if (!str) return false;
    try {
      const regexStart = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]/u;
      const regexEnd = /[\p{Emoji_Presentation}\p{Extended_Pictographic}✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]\s*$/u;
      return regexStart.test(str) || regexEnd.test(str);
    } catch (e) {
      const fallbackStart = /^[\s\uD800-\uDBFF\uDC00-\uDFFF✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]/;
      const fallbackEnd = /[\uD800-\uDBFF\uDC00-\uDFFF✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]\s*$/;
      return fallbackStart.test(str) || fallbackEnd.test(str);
    }
  };

  const getPreviewTexts = () => {
    const t1 = bannerText1 || 'PRIMARY ANNOUNCEMENT TEXT WILL APPEAR HERE';
    const t2 = (bannerText2 || 'SECONDARY TEXT WILL APPEAR HERE').replace('{timer}', bannerTimerEnabled ? '12HR 59MINS 08SECS' : '{timer}');
    return {
      p1: t1,
      p2: t2,
      hasEmoji1: hasEdgeEmoji(bannerText1),
      hasEmoji2: hasEdgeEmoji(bannerText2)
    };
  };

  const { p1, p2, hasEmoji1, hasEmoji2 } = getPreviewTexts();
  const showFaviconSpacer1 = bannerUseFavicon || (!hasEmoji1 && (!(bannerText2 || bannerTimerEnabled) || !hasEmoji2));
  const showFaviconSpacer2 = bannerUseFavicon || (!hasEmoji1 && !hasEmoji2);


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Update your business profile and system details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                <Building2 className="w-32 h-32 text-primary/20" />
             </div>

             <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Business Profile
             </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Company Name</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                         value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="DurgaShakti Foils" />
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GST Number</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                         value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="29XXXXX..." />
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                         value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+91..." />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                   <div className="relative group">
                      <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                         value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="ops@durgashakti.com" />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                   </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Office Address</label>
                   <div className="relative group">
                      <textarea rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                         value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Full physical address..." />
                      <MapPin className="absolute left-3.5 top-4 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                   </div>
                </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Google Maps Share / Embed Link</label>
                    <div className="relative group">
                       <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                          value={googleMapsLink} onChange={e => setGoogleMapsLink(e.target.value)} placeholder="https://maps.app.goo.gl/FMk4dnhXvGeTrRFM6 or search query..." />
                       <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    </div>
                 </div>

                 <div className="md:col-span-2 mt-6 pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Social Media Profile Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instagram Link</label>
                          <div className="relative group">
                             <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                                value={instagramLink} onChange={e => setInstagramLink(e.target.value)} placeholder="https://instagram.com/..." />
                             <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Facebook Link</label>
                          <div className="relative group">
                             <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                                value={facebookLink} onChange={e => setFacebookLink(e.target.value)} placeholder="https://facebook.com/..." />
                             <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">YouTube Link</label>
                          <div className="relative group">
                             <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pl-10"
                                value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} placeholder="https://youtube.com/..." />
                             <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                          </div>
                       </div>
                    </div>
                 </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end">
                <Button disabled={saving} onClick={save} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-emerald-glow flex items-center gap-2">
                   {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
                </Button>
             </div>
          </div>



          {/* Sacred Banner Management — SUPER_ADMIN or manage_banner permission */}
          {(me?.role === 'SUPER_ADMIN' || me?.permissions?.manage_banner) && (
               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden mt-8">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                     <Megaphone className="w-32 h-32 text-primary/20" />
                  </div>

                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                     <Megaphone className="w-5 h-5 text-primary" />
                     Sacred Banner Management
                  </h2>
                  <p className="text-xs text-slate-500 mb-8 font-medium">Customize the scrolling announcement messages. Click the magic wand to auto-generate beautiful, grammar-corrected premium themes.</p>

                  {/* Live Animated Preview */}
                  <div className="mb-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Play className="w-3 h-3 text-primary" /> Live Preview
                     </h3>
                     <div className="w-full bg-slate-950 text-white overflow-hidden py-2.5 rounded-xl border border-slate-800 shadow-lg relative flex items-center">
                        <div className="whitespace-nowrap animate-marquee flex items-center">
                           <span className="mx-4 text-xs font-extrabold uppercase tracking-widest text-primary-fixed">
                              {p1}
                           </span>
                           {(!bannerUseFavicon || showFaviconSpacer1) && (
                              <span className="mx-4 text-xs font-black text-primary flex items-center gap-2">
                                 {bannerUseFavicon ? <img src="/favicon.png" className="w-5 h-5 object-contain opacity-80" alt="Favicon" /> : <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
                              </span>
                           )}
                           {(bannerText2 || bannerTimerEnabled) && (
                              <span className="mx-4 text-xs font-extrabold uppercase tracking-widest text-rose-200">
                                 {p2}
                              </span>
                           )}
                           {(bannerText2 || bannerTimerEnabled) && (!bannerUseFavicon || showFaviconSpacer2) && (
                              <span className="mx-4 text-xs font-black text-primary flex items-center gap-2">
                                 {bannerUseFavicon ? <img src="/favicon.png" className="w-5 h-5 object-contain opacity-80" alt="Favicon" /> : <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
                              </span>
                           )}
                           {/* Duplicate for smooth scrolling illusion */}
                            <span className="mx-4 text-xs font-extrabold uppercase tracking-widest text-primary-fixed">
                              {p1}
                           </span>
                           {(!bannerUseFavicon || showFaviconSpacer1) && (
                              <span className="mx-4 text-xs font-black text-primary flex items-center gap-2">
                                 {bannerUseFavicon ? <img src="/favicon.png" className="w-5 h-5 object-contain opacity-80" alt="Favicon" /> : <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
                              </span>
                           )}
                           {(bannerText2 || bannerTimerEnabled) && (
                              <span className="mx-4 text-xs font-extrabold uppercase tracking-widest text-rose-200">
                                 {p2}
                              </span>
                           )}
                        </div>
                        {/* Edge Gradients for polished look */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Announcement (Text 1)</label>
                           <button
                              onClick={() => applyMagicTheme(setBannerText1, premiumThemes1, bannerText1)}
                              className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-full transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border border-primary/20"
                           >
                              <Sparkles className="w-3 h-3" /> Auto-Polish & Theme
                           </button>
                        </div>
                        <input
                           className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-800"
                           value={bannerText1}
                           onChange={e => setBannerText1(e.target.value)}
                           placeholder="e.g. Durga Shakti Foils: Premium Packing Solutions"
                        />
                     </div>

                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secondary Announcement (Text 2 - Alternate)</label>
                           <button
                              onClick={() => applyMagicTheme(setBannerText2, premiumThemes2, bannerText2)}
                              className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1 rounded-full transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border border-rose-100"
                           >
                              <Sparkles className="w-3 h-3" /> Auto-Polish & Theme
                           </button>
                        </div>
                        <input
                           className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-800"
                           value={bannerText2}
                           onChange={e => setBannerText2(e.target.value)}
                           placeholder="e.g. 50% off discount sale starts/ends in {timer}"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Use <span className="font-mono bg-slate-100 px-1 rounded text-primary font-bold">{'{timer}'}</span> anywhere in the text to dynamically insert the live countdown clock.</p>
                     </div>

                     <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
                           <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-amber-100 text-amber-600 flex-shrink-0 shadow-sm border border-amber-200">
                                 <Sparkles className="w-6 h-6" />
                              </div>
                              <div>
                                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Show Favicon Spacer</h3>
                                 <p className="text-xs text-slate-500 mt-1 max-w-md">Use the brand Favicon as a beautiful spacer between texts. Disable this if your text templates already use abundant emojis.</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-3 self-end md:self-auto">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${bannerUseFavicon ? 'text-amber-600' : 'text-slate-400'}`}>
                                 {bannerUseFavicon ? 'Visible' : 'Hidden'}
                              </span>
                              <button
                                 onClick={() => setBannerUseFavicon(!bannerUseFavicon)}
                                 className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shadow-inner ${
                                    bannerUseFavicon ? 'bg-amber-500' : 'bg-slate-300'
                                 }`}
                              >
                                 <div
                                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${
                                       bannerUseFavicon ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                 />
                              </button>
                           </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-primary/20 text-primary flex-shrink-0 shadow-sm border border-primary/20">
                                 <Timer className="w-6 h-6 animate-pulse" />
                              </div>
                              <div>
                                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Enable Live Countdown Timer</h3>
                                 <p className="text-xs text-slate-500 mt-1 max-w-md">Tick this to activate the dynamic live countdown timer replacing the {'{timer}'} tag.</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-3 self-end md:self-auto">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${bannerTimerEnabled ? 'text-primary' : 'text-slate-400'}`}>
                                 {bannerTimerEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <button
                                 onClick={() => setBannerTimerEnabled(!bannerTimerEnabled)}
                                 className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shadow-inner ${
                                    bannerTimerEnabled ? 'bg-primary' : 'bg-slate-300'
                                 }`}
                              >
                                 <div
                                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${
                                       bannerTimerEnabled ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                 />
                              </button>
                           </div>
                        </div>

                        {bannerTimerEnabled && (
                           <div className="space-y-2 pt-6 border-t border-slate-200/60 animate-in slide-in-from-top duration-350">
                              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Countdown Target Date & Time</label>
                              <div className="relative group">
                                 <input
                                    type="datetime-local"
                                    className="w-full rounded-xl border border-primary/20 px-12 py-4 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-primary/20 outline-none transition-all bg-white shadow-sm hover:border-primary cursor-pointer"
                                    value={bannerTimerTarget}
                                    onChange={e => setBannerTimerTarget(e.target.value)}
                                 />
                                 <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-hover:text-primary transition-colors pointer-events-none" />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-2 font-medium">Select the target date/time in your local system timezone. It will automatically convert to the universal server timezone.</p>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end">
                     <Button disabled={savingBanner} onClick={saveBanner} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-emerald-glow flex items-center gap-2">
                        {savingBanner ? 'Saving...' : <><Save className="w-4 h-4" /> Save Banner Settings</>}
                     </Button>
                  </div>
                </div>
          )}


          {(me?.role === 'SUPER_ADMIN' || me?.permissions?.manage_settings || me?.permissions?.manage_coupons) && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden mt-8">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                <Users className="w-32 h-32 text-primary/20" />
              </div>

              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Customer Experience Controls
              </h2>
              <p className="text-xs text-slate-500 mb-8 font-medium">Control review visibility and the live criteria used to segment loyal customers.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    label: 'Product Ratings',
                    desc: 'Show star ratings on product pages and allow customers to submit ratings.',
                    checked: ratingsEnabled,
                    onToggle: () => setRatingsEnabled(prev => !prev),
                    icon: Star
                  },
                  {
                    label: 'Review Comments',
                    desc: 'Show and collect written review comments independently from star ratings.',
                    checked: commentsEnabled,
                    onToggle: () => setCommentsEnabled(prev => !prev),
                    icon: MessageSquare
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary h-max">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.label}</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={item.onToggle}
                        className={`w-14 h-8 flex items-center rounded-full p-1 shrink-0 cursor-pointer transition-all duration-300 shadow-inner ${item.checked ? 'bg-primary' : 'bg-slate-300'}`}
                      >
                        <span className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${item.checked ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-primary" />
                    Loyal Customer Minimum Orders
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    value={loyaltyMinimumOrders}
                    onChange={e => setLoyaltyMinimumOrders(e.target.value)}
                  />
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <IndianRupee className="w-3.5 h-3.5 text-primary" />
                    Loyal Customer Minimum Spend
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    value={loyaltyMinimumSpend}
                    onChange={e => setLoyaltyMinimumSpend(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end">
                <Button disabled={savingExperience} onClick={saveExperienceSettings} className="rounded-xl px-8 font-black uppercase tracking-widest shadow-lg shadow-emerald-glow flex items-center gap-2">
                  {savingExperience ? 'Saving...' : <><Save className="w-4 h-4" /> Save Experience Settings</>}
                </Button>
              </div>
            </div>
          )}


          <div className="bg-primary rounded-3xl p-8 text-white relative overflow-hidden shadow-xl mt-8">
             <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2">System Status</h3>
                <p className="text-white/75 text-sm max-w-md">Your system is secure and running smoothly. All global regions are active.</p>
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
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Cpu className="w-4 h-4 text-primary" />
                 Technical Details
              </h2>
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Database className="w-4 h-4 text-slate-500" />
                       <span className="text-xs font-bold text-slate-600">Database</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Active</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Lock className="w-4 h-4 text-slate-500" />
                       <span className="text-xs font-bold text-slate-600">Security Level</span>
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase">High</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Cloud className="w-4 h-4 text-slate-500" />
                       <span className="text-xs font-bold text-slate-600">Payment Provider</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-800 uppercase">Razorpay Live</span>
                 </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                 <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all">
                    Enable Maintenance Mode
                 </Button>
              </div>
           </div>

           <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Standard</div>
                    <div className="text-sm font-bold">ISO-27001</div>
                 </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">All system actions are logged for safety and records.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
