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
      case 'settings': return 'Profile';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[9px] font-mono tracking-wider font-semibold text-muted-foreground uppercase leading-none">Dashboard / {getTabLabel()}</div>
          <h1 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none mt-1">
            {getTabLabel()}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-black text-slate-700">Hello, {user?.full_name?.split(' ')[0]}</p>
          <p className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase leading-none mt-0.5">Customer Portal</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm shadow-emerald-glow shrink-0">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
