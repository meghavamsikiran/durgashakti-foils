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
      <aside className="hidden xl:flex xl:w-64 xl:flex-col xl:fixed xl:inset-y-0 bg-[#0B1220] z-30 select-none border-r border-slate-800">
        {/* Brand Logo */}
        <div className="flex h-20 items-center px-6 border-b border-slate-800/60">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/images/logo.webp" 
              alt="Durga Shakti Foils" 
              className="h-10 w-auto object-contain block"
              style={{ maxWidth: '190px' }}
            />
          </Link>
        </div>

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
                  ? 'bg-slate-800 text-white font-bold' 
                  : 'text-slate-400 font-medium hover:bg-slate-800/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={`w-5 h-5 transition-colors ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User / Sign Out Footer */}
        <div className="p-4 border-t border-slate-850 bg-[#0B1220]">
          <button 
            type="button" 
            onClick={onLogout} 
            className="flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay and drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0B1220] z-50 flex flex-col transition-transform duration-300 xl:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/60">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/images/logo.webp" 
              alt="Durga Shakti Foils" 
              className="h-10 w-auto object-contain block"
              style={{ maxWidth: '170px' }}
            />
          </Link>
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
                  ? 'bg-slate-800 text-white font-bold' 
                  : 'text-slate-400 font-medium hover:bg-slate-800/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-[#0B1220]">
          <button 
            type="button" 
            onClick={onLogout} 
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
