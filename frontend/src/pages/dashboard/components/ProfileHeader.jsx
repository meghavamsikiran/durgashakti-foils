import React from 'react';
import { Bell, Settings, Menu, User } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Top User Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
        {/* User Info with Avatar */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={onMenuClick}
            className="xl:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 rounded-full bg-[#E5F5EC] border-2 border-[#A8E2C2] flex items-center justify-center text-[#1E5D3E] shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight truncate leading-tight">
              {user?.full_name || 'Customer'}
            </h2>
            <p className="text-xs text-slate-500 truncate leading-none mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-[#F4F4F0]"></span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab Title */}
      <div className="py-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {getTabLabel()}
        </h1>
      </div>
    </div>
  );
};

export default ProfileHeader;
