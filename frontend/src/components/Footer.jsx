import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border/50 mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl" style={{ fontFamily: 'Manrope' }}>
                Durga Shakti<span className="text-primary ml-1">Foils</span>
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
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a href="mailto:DurgaShaktifoils@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </a>
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
                  Plot no 1, Road No. 1, Maruthi nagar, Mallampet, Hyderabad, Telangana 500090
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="tel:+918367542954" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  +91 83675 42954
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="mailto:DurgaShaktifoils@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  DurgaShaktifoils@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Durga Shakti Foils PVT. LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;