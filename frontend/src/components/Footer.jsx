import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube } from 'lucide-react';
import settingsService from '../services/settings.service';

const Footer = () => {
  const [profile, setProfile] = useState({
    companyName: 'Durga Shakti Foils',
    companyPhone: '+91 83675 42954',
    companyEmail: '',
    companyAddress: 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090',
    instagramLink: 'https://www.instagram.com/durgashaktifoils_pvt.ltd/',
    facebookLink: '',
    youtubeLink: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        if (data?.company_profile) {
          const cp = data.company_profile;
          setProfile({
            companyName: cp.companyName || 'Durga Shakti Foils',
            companyPhone: cp.companyPhone || '+91 83675 42954',
            companyEmail: cp.companyEmail || '',
            companyAddress: cp.companyAddress || 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090',
            instagramLink: cp.instagramLink || 'https://www.instagram.com/durgashaktifoils_pvt.ltd/',
            facebookLink: cp.facebookLink || '',
            youtubeLink: cp.youtubeLink || ''
          });
        }
      } catch (err) {
        console.error('Failed to load public settings in Footer:', err);
      }
    };
    loadSettings();
  }, []);

  return (
    <footer className="bg-surface-container-low border-t border-border-subtle mt-24 font-inter text-on-surface">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/favicon.png" alt="DurgaShakti Foils Logo" className="w-6 h-6 object-contain" />
              <span className="font-bold text-xl font-manrope text-ink-slate">
                {profile.companyName.split(' ')[0]} <span className="text-primary ml-1">{profile.companyName.split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Premium food-grade aluminum foil manufacturer. ISO certified quality products for your kitchen needs.
            </p>
            {(profile.instagramLink || profile.facebookLink || profile.youtubeLink) && (
              <div className="flex gap-4 mt-6">
                {profile.instagramLink && (
                  <a href={profile.instagramLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all text-on-surface-variant">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {profile.facebookLink && (
                  <a href={profile.facebookLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all text-on-surface-variant">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {profile.youtubeLink && (
                  <a href={profile.youtubeLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all text-on-surface-variant">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold mb-4 font-manrope text-ink-slate tracking-wide uppercase text-xs font-label-caps">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 font-manrope text-ink-slate tracking-wide uppercase text-xs font-label-caps">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 font-manrope text-ink-slate tracking-wide uppercase text-xs font-label-caps">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-sm text-on-surface-variant">
                  {profile.companyAddress}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`tel:${profile.companyPhone}`} className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                  {profile.companyPhone}
                </a>
              </li>
              {profile.companyEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={`mailto:${profile.companyEmail}`} className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
                    {profile.companyEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-border-subtle mt-12 pt-8 text-center">
          <p className="text-sm text-on-surface-variant font-medium">
            © {new Date().getFullYear()} {profile.companyName} PVT. LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;