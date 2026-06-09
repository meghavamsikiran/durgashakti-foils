import React from 'react';
import { Link } from 'react-router-dom';
import { 
  User, LogOut, Package, CreditCard, Heart, 
  MapPin, X, LayoutDashboard
} from 'lucide-react';

const Sidebar = ({ user, activeTab, wishlistCount, onLogout, sidebarOpen, setSidebarOpen, navigate }) => {
  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'transactions', label: 'Payments', icon: CreditCard },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'settings', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden xl:flex xl:w-64 xl:flex-col xl:sticky xl:top-16 xl:h-[calc(100vh-64px)] bg-[#0C1310] z-30 select-none border-r border-[#19231F]">
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 pl-3 pr-3 space-y-1 sidebar-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (navigate) navigate(`/dashboard/${item.id}`);
              }}
              className={`w-full flex items-center justify-between py-3 px-3.5 rounded-xl text-sm transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-[#25D958]/10 text-[#25D958] font-bold border-l-4 border-[#25D958] pl-2.5 rounded-l-none' 
                  : 'text-slate-400 font-medium hover:bg-[#19231F]/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={`w-5 h-5 transition-colors ${activeTab === item.id ? 'text-[#25D958]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#25D958] text-[#0C1310] text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Brand Tagline */}
        <div className="px-5 py-4 border-t border-[#19231F]/60 text-center bg-[#0C1310]">
          <p className="font-serif italic text-xs text-[#25D958]/90 leading-relaxed tracking-wide">
            "Wrap Purity, Seal Freshness"
          </p>
        </div>

        {/* User / Sign Out Footer */}
        <div className="p-4 pb-10 border-t border-[#19231F] bg-[#0C1310]">
          <button 
            type="button" 
            onClick={onLogout} 
            className="flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-rose-450 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-450" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay and drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0C1310] z-50 flex flex-col transition-transform duration-300 xl:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-[#19231F]">
          <span className="text-white font-bold font-serif text-lg">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 pl-3 pr-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSidebarOpen(false);
                if (navigate) navigate(`/dashboard/${item.id}`);
              }}
              className={`w-full flex items-center justify-between py-3 px-3.5 rounded-xl text-sm transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-[#25D958]/10 text-[#25D958] font-bold border-l-4 border-[#25D958] pl-2.5 rounded-l-none' 
                  : 'text-slate-400 font-medium hover:bg-[#19231F]/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#25D958]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#25D958] text-[#0C1310] text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Brand Tagline for Mobile */}
        <div className="px-5 py-4 border-t border-[#19231F]/60 text-center bg-[#0C1310]">
          <p className="font-serif italic text-[11px] text-[#25D958]/90 leading-relaxed">
            "Wrap Purity, Seal Freshness"
          </p>
        </div>

        <div className="p-4 pb-10 border-t border-[#19231F] bg-[#0C1310]">
          <button 
            type="button" 
            onClick={onLogout} 
            className="flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-rose-450 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
