import React from 'react';
import { Link } from 'react-router-dom';
import { 
  User, LogOut, Package, CreditCard, Heart, 
  MapPin, X, LayoutDashboard, MessageSquare, Sun, Moon, Wallet
} from 'lucide-react';

const Sidebar = ({ user, activeTab, wishlistCount, onLogout, sidebarOpen, setSidebarOpen, navigate }) => {
  const [isDark, setIsDark] = React.useState(() => localStorage.getItem('themeMode') !== 'light');

  React.useEffect(() => {
    const handleThemeToggle = (e) => {
      setIsDark(e.detail === 'dark');
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'wallet', label: 'Wallet & Vouchers', icon: Wallet },
    { id: 'transactions', label: 'Payments', icon: CreditCard },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
    { id: 'settings', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className={`hidden xl:flex xl:w-64 xl:flex-col xl:sticky xl:top-16 xl:h-[calc(100vh-64px)] z-30 select-none border-r transition-all duration-200 ${isDark ? 'bg-[#0C1310] border-[#19231F]' : 'bg-[#f7faf8] border-[#bbcbb5]'}`}>
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 pl-3 pr-3 space-y-1 sidebar-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (navigate) navigate(`/dashboard/${item.id}`);
              }}
              className={`w-full flex items-center justify-between py-2.5 rounded-lg text-sm transition-all duration-200 group focus:outline-none focus:ring-0 ${
                activeTab === item.id 
                  ? (isDark 
                      ? 'bg-[rgba(11,209,61,0.12)] text-[#25D958] border-l-4 border-[#25D958] pl-2.5 font-bold' 
                      : 'bg-emerald-50 text-[#006e1b] border-l-4 border-[#006e1b] pl-2.5 font-bold shadow-sm') 
                  : (isDark 
                      ? 'text-slate-300 pl-3 font-medium hover:text-[#25D958] hover:bg-[#25D958]/10' 
                      : 'text-slate-800 pl-3 font-semibold hover:text-[#006e1b] hover:bg-emerald-50/60')
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4.5 h-4.5 transition-colors ${
                  activeTab === item.id 
                    ? (isDark ? 'text-[#25D958]' : 'text-[#006e1b]') 
                    : (isDark ? 'text-slate-500 group-hover:text-[#25D958]' : 'text-slate-600 group-hover:text-[#006e1b]')
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#25D958] text-[#0C1310] text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Brand Tagline */}
        <div className={`px-5 py-4 border-t text-center transition-all ${isDark ? 'border-[#19231F]/60 bg-[#0C1310]' : 'border-[#bbcbb5]/60 bg-[#f7faf8]'}`}>
          <p className={`font-serif italic text-xs leading-relaxed tracking-wide transition-all ${isDark ? 'text-[#25D958]/90' : 'text-[#006e1b] font-bold'}`}>
            "Wrap Purity, Seal Freshness"
          </p>
        </div>

        {/* User / Sign Out / Theme Toggle Footer */}
        <div className={`p-4 pb-10 border-t space-y-1.5 transition-all ${isDark ? 'border-[#19231F] bg-[#0C1310]' : 'border-[#bbcbb5] bg-[#f7faf8]'}`}>
          <button
            type="button"
            onClick={() => {
              const next = isDark ? 'light' : 'dark';
              localStorage.setItem('themeMode', next);
              window.dispatchEvent(new CustomEvent('theme-toggle', { detail: next }));
            }}
            className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all group ${
              isDark
                ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/5'
                : 'text-slate-755 hover:text-[#006e1b] hover:bg-[#006e1b]/5'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5 text-slate-500 group-hover:text-[#25D958]" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-slate-650 group-hover:text-[#006e1b]" />
                Dark Mode
              </>
            )}
          </button>
          <button 
            type="button" 
            onClick={onLogout} 
            className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all group ${
              isDark 
                ? 'text-slate-400 hover:text-rose-450 hover:bg-rose-500/5' 
                : 'text-slate-700 hover:text-rose-600 hover:bg-rose-55'
            }`}
          >
            <LogOut className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-hover:text-rose-450' : 'text-slate-650 group-hover:text-rose-600'}`} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay and drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 z-[1001] flex flex-col transition-all duration-300 xl:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDark ? 'bg-[#0C1310]' : 'bg-[#f7faf8]'}`}>
        <div className={`flex h-20 items-center justify-between px-6 border-b ${isDark ? 'border-[#19231F]' : 'border-[#bbcbb5]'}`}>
          <span className={`font-bold font-serif text-lg ${isDark ? 'text-white' : 'text-[#0C1310]'}`}>Menu</span>
          <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#0c1310]'}`}>
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
              className={`w-full flex items-center justify-between py-2.5 rounded-lg text-sm transition-all duration-200 group focus:outline-none focus:ring-0 ${
                activeTab === item.id 
                  ? (isDark 
                      ? 'bg-[rgba(11,209,61,0.12)] text-[#25D958] border-l-4 border-[#25D958] pl-2.5 font-bold' 
                      : 'bg-emerald-50 text-[#006e1b] border-l-4 border-[#006e1b] pl-2.5 font-bold shadow-sm') 
                  : (isDark 
                      ? 'text-slate-300 pl-3 font-medium hover:text-[#25D958] hover:bg-[#25D958]/10' 
                      : 'text-slate-800 pl-3 font-semibold hover:text-[#006e1b] hover:bg-emerald-50/60')
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4.5 h-4.5 transition-colors ${
                  activeTab === item.id 
                    ? (isDark ? 'text-[#25D958]' : 'text-[#006e1b]') 
                    : (isDark ? 'text-slate-500 group-hover:text-[#25D958]' : 'text-slate-600 group-hover:text-[#006e1b]')
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#25D958] text-[#0C1310] text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono mr-2">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Brand Tagline for Mobile */}
        <div className={`px-5 py-4 border-t text-center ${isDark ? 'border-[#19231F]/60 bg-[#0C1310]' : 'border-[#bbcbb5]/60 bg-[#f7faf8]'}`}>
          <p className={`font-serif italic text-[11px] leading-relaxed ${isDark ? 'text-[#25D958]/90' : 'text-[#006e1b] font-bold'}`}>
            "Wrap Purity, Seal Freshness"
          </p>
        </div>

        <div className={`p-4 pb-10 border-t space-y-1.5 ${isDark ? 'border-[#19231F] bg-[#0C1310]' : 'border-[#bbcbb5] bg-[#f7faf8]'}`}>
          <button
            type="button"
            onClick={() => {
              const next = isDark ? 'light' : 'dark';
              localStorage.setItem('themeMode', next);
              window.dispatchEvent(new CustomEvent('theme-toggle', { detail: next }));
            }}
            className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
              isDark
                ? 'text-slate-400 hover:text-[#25D958] hover:bg-[#25D958]/5'
                : 'text-slate-755 hover:text-[#006e1b] hover:bg-[#006e1b]/5'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5 text-slate-500" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-slate-655" />
                Dark Mode
              </>
            )}
          </button>
          <button 
            type="button" 
            onClick={onLogout} 
            className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
              isDark 
                ? 'text-slate-400 hover:text-rose-450 hover:bg-rose-500/5' 
                : 'text-slate-700 hover:text-rose-600 hover:bg-rose-55'
            }`}
          >
            <LogOut className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-650'}`} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
