import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Menu } from 'lucide-react';

const ProfileHeader = ({ user, activeTab, onMenuClick }) => {
  const getTabLabel = () => {
    switch (activeTab) {
      case 'orders': return 'Order History';
      case 'transactions': return 'Financial Records';
      case 'cards': return 'Security Vault';
      case 'wishlist': return 'Favorites';
      case 'addresses': return 'Shipping Network';
      case 'notifications': return 'Alert Center';
      case 'settings': return 'Profile';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground">Dashboard / {getTabLabel()}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
          Welcome, <span className="text-primary italic">{user?.full_name?.split(' ')[0]}</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:block text-right">
          <p className="text-sm font-black text-foreground">{user?.full_name}</p>
          <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">{user?.role || 'Customer'}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xl shadow-emerald-glow">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
