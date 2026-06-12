import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck
} from 'lucide-react';
import settingsService from '../services/settings.service';
import apiClient from '../services/core/apiClient';

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={{ width: '1.2em', height: '1.2em' }}>
    <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.761.458 3.479 1.332 4.998L2 22l5.166-1.354c1.47.8 3.123 1.222 4.846 1.222 5.506 0 9.988-4.482 9.988-9.988 0-5.506-4.482-9.988-9.988-9.988zm4.73 13.9c-.2.56-1.16 1.07-1.6 1.1-.38.03-.87.05-2.22-.5-1.72-.7-2.82-2.45-2.9-2.56-.08-.1-1.12-1.48-1.12-2.83 0-1.35.7-2 .95-2.27.2-.23.55-.3.8-.3h.27c.2 0 .72.58.72.58l.72 1.48c.1.2.08.4-.04.56l-.37.5c-.15.17-.32.37-.45.5-.15.15-.3.32-.13.62.17.3.77 1.27 1.65 2.05.75.67 1.38.87 1.73 1.05.35.17.55.15.75-.07.2-.23.87-.97 1.1-1.3.23-.33.47-.27.8-.15.32.13 2.05 1.02 2.4 1.2.35.17.58.25.67.4.08.15.08.87-.12 1.43z" />
  </svg>
);

const DEFAULT_PROFILE = {
  companyName: 'Durga Shakti Foils',
  gstNumber: '',
  companyPhone: '+91 83675 42954',
  companyEmail: '',
  companyAddress: 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090',
  googleMapsLink: '',
  instagramLink: 'https://www.instagram.com/durgashaktifoils_pvt.ltd/',
  facebookLink: '',
  whatsappLink: '',
  youtubeLink: ''
};

const mergeProfile = (profile = {}) => ({
  ...DEFAULT_PROFILE,
  ...profile
});

const getCachedProfile = () => {
  const cachedSettings = apiClient.getCachedDataSync('/settings/public');
  return mergeProfile(cachedSettings?.data?.company_profile);
};

const Footer = () => {
  const [profile, setProfile] = useState(getCachedProfile);

  useEffect(() => {
    let isMounted = true;

    const applySettings = (settings) => {
      if (isMounted && settings?.company_profile) {
        setProfile(mergeProfile(settings.company_profile));
      }
    };

    const loadSettings = async () => {
      try {
        applySettings(await settingsService.getPublicSettings({ ttl: 300000 }));
        applySettings(await settingsService.getPublicSettings({ force: true, cacheBust: true }));
      } catch (err) {
        console.error('Failed to load public settings in Footer:', err);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatWhatsAppLink = (val) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('wa.me/')) {
      return trimmed.startsWith('wa.me/') ? `https://${trimmed}` : trimmed;
    }
    const clean = trimmed.replace(/[^\d]/g, '');
    return `https://wa.me/${clean}`;
  };

  const socialLinks = [
    { href: profile.instagramLink, label: 'Instagram', Icon: Instagram },
    { href: profile.facebookLink, label: 'Facebook', Icon: Facebook },
    { href: formatWhatsAppLink(profile.whatsappLink || profile.youtubeLink), label: 'WhatsApp', Icon: WhatsAppIcon }
  ].filter((item) => item.href);

  const qualityItems = ['ISO Certified', 'BPA Free', 'Food Grade Certified'];

  return (
    <footer className="border-t border-white/10 bg-[#030504] font-inter text-white">
      <div className="mx-auto max-w-[1536px] px-6 py-12 md:px-12 lg:px-[50px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.25fr_0.75fr_0.9fr_1.25fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 py-1 no-underline">
              <img src="/favicon.webp" alt="Durga Maa" className="h-10 w-10 object-contain shrink-0" />
              <span className="flex flex-col leading-none gap-[2px]">
                <span className="font-serif font-bold text-white tracking-tight" style={{ fontSize: '15px' }}>Durga Shakti Foils</span>
                <span className="text-[#25D958]/80 italic font-inter" style={{ fontSize: '9.5px', letterSpacing: '0.02em' }}>Wrap Purity, Seal Freshness</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-white/62">
              Premium food-grade aluminium foils manufactured for everyday freshness, safer kitchens,
              and dependable business supply.
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-6 flex gap-3">
                {socialLinks.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-all duration-300 hover:bg-primary hover:text-white hover:border-primary hover:scale-110 active:scale-95 transform shadow-[0_0_15px_rgba(32,220,91,0)] hover:shadow-[0_0_15px_rgba(32,220,91,0.45)]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-manrope text-xs font-bold uppercase tracking-[0.18em] text-[#20dc5b]">
              Company
            </h3>
            <ul className="mt-5 space-y-3">
              <li>
                <Link to="/" className="text-sm font-semibold text-white/64 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-sm font-semibold text-white/64 transition">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm font-semibold text-white/64 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/dashboard?tab=orders" className="text-sm font-semibold text-white/64 transition">
                  Your Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm font-semibold text-white/64 transition">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/policies" className="text-sm font-semibold text-white/64 transition">
                  Order Policies
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm font-semibold text-white/64 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm font-semibold text-white/64 transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-manrope text-xs font-bold uppercase tracking-[0.18em] text-[#20dc5b]">
              Quality
            </h3>
            <ul className="mt-5 space-y-3">
              {qualityItems.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-semibold text-white/64">
                  <ShieldCheck className="h-4 w-4 text-[#20dc5b]" />
                  {item}
                </li>
              ))}
              {profile.gstNumber && (
                <li className="pt-2 text-xs font-semibold leading-5 text-white/45">
                  GST: {profile.gstNumber}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-manrope text-xs font-bold uppercase tracking-[0.18em] text-[#20dc5b]">
              Business Contact
            </h3>
            <ul className="mt-5 space-y-4">
              {profile.companyAddress && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-[#20dc5b]" />
                  <span className="text-sm font-medium leading-6 text-white/62">
                    {profile.companyAddress}
                  </span>
                </li>
              )}
              {profile.companyPhone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 text-[#20dc5b]" />
                  <a
                    href={`tel:${profile.companyPhone}`}
                    className="text-sm font-semibold text-white/68 transition"
                  >
                    {profile.companyPhone}
                  </a>
                </li>
              )}
              {profile.companyEmail && (
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0 text-[#20dc5b]" />
                  <a
                    href={`mailto:${profile.companyEmail}`}
                    className="text-sm font-semibold text-white/68 transition"
                  >
                    {profile.companyEmail}
                  </a>
                </li>
              )}
              {profile.googleMapsLink && (
                <li>
                  <a
                    href={profile.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#20dc5b] transition"
                  >
                    View on map
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-7 text-center">
          <p className="text-xs font-semibold text-white/45">
            (c) {new Date().getFullYear()} {profile.companyName} PVT. LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
