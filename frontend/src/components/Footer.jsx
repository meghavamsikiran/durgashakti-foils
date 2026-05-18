import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';
import settingsService from '../services/settings.service';

const Footer = () => {
  const [profile, setProfile] = useState({
    companyName: 'Durga Shakti Foils',
    companyPhone: '+91 83675 42954',
    companyEmail: 'DurgaShaktifoils@gmail.com',
    companyAddress: 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090'
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
            companyEmail: cp.companyEmail || 'DurgaShaktifoils@gmail.com',
            companyAddress: cp.companyAddress || 'Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090'
          });
        }
      } catch (err) {
        console.error('Failed to load public settings in Footer:', err);
      }
    };
    loadSettings();
  }, []);

  return (
    <footer className="bg-secondary/30 border-t border-border/50 mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl" style={{ fontFamily: 'Manrope' }}>
                {profile.companyName.split(' ')[0]} <span className="text-primary ml-1">{profile.companyName.split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium food-grade aluminum foil manufacturer. ISO certified quality products for your kitchen needs.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {profile.companyAddress}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`tel:${profile.companyPhone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {profile.companyPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`mailto:${profile.companyEmail}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {profile.companyEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {profile.companyName} PVT. LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;