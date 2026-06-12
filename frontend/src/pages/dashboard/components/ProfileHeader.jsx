import React from 'react';
import { Bell, Settings, Menu, User } from 'lucide-react';

const ProfileHeader = ({ user, activeTab, onMenuClick }) => {
  const getTabLabel = () => {
    switch (activeTab) {
      case 'orders': return 'Order History';
      case 'transactions': return 'Your Transactions';
      case 'cards': return 'Security Vault';
      case 'wishlist': return 'Favorites';
      case 'addresses': return 'Shipping Network';
      case 'settings': return 'Profile';
      default: return 'Overview';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top User Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#19231F]">
        {/* User Info with Avatar */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="xl:hidden p-2 -ml-2 text-slate-450 hover:text-[#25D958] active:text-[#25D958] hover:bg-[#25D958]/10 active:bg-[#25D958]/20 rounded-xl transition-colors focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 rounded-full bg-[#25D958]/10 border-2 border-[#25D958]/30 flex items-center justify-center text-[#25D958] shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white uppercase tracking-tight truncate leading-tight">
              {user?.full_name || 'Customer'}
            </h2>
            <p className="text-xs text-slate-400 truncate leading-none mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tab Title */}
      <div className="py-2">
        <h1 className="text-3xl font-normal text-white font-serif tracking-wide">
          {getTabLabel()}
        </h1>
      </div>
    </div>
  );
};

export default ProfileHeader;
