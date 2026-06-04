import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Youtube
} from 'lucide-react';
import settingsService from '../services/settings.service';
import apiClient from '../services/core/apiClient';

const DEFAULT_PROFILE = {
  companyName: 'Durga Shakti Foils',
  gstNumber: '',
  companyPhone: '+91 83675 42954',
  companyEmail: '',
  companyAddress: 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090',
  googleMapsLink: '',
  instagramLink: 'https://www.instagram.com/durgashaktifoils_pvt.ltd/',
  facebookLink: '',
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

  const socialLinks = [
    { href: profile.instagramLink, label: 'Instagram', Icon: Instagram },
    { href: profile.facebookLink, label: 'Facebook', Icon: Facebook },
    { href: profile.youtubeLink, label: 'YouTube', Icon: Youtube }
  ].filter((item) => item.href);

  const qualityItems = ['ISO Certified', 'BPA Free', 'Food Grade Certified'];

  return (
    <footer className="border-t border-white/10 bg-[#030504] font-inter text-white">
      <div className="mx-auto max-w-[1536px] px-6 py-12 md:px-12 lg:px-[50px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.25fr_0.75fr_0.9fr_1.25fr]">
          <div>
            <Link to="/" className="inline-block py-1">
              <img
                src="/logo-durga.png"
                alt="Durga Shakti Foils"
                className="h-11 w-auto object-contain block"
                style={{ maxWidth: '240px' }}
              />
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
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition"
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
