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
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
    let clean = trimmed.replace(/[^\d]/g, '');
    if (clean.length === 10) {
      clean = `91${clean}`;
    }
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
