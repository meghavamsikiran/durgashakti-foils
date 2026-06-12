import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminSidebar, isSuperAdminRole, superAdminSidebar } from '../constants/rbac';
import { 
  LayoutDashboard, Package, Boxes, ShoppingCart, 
  Users, CreditCard, BarChart3, FileText,
  UserCog, ShieldAlert, Settings, LogOut, Package2, Layers,
  MessageSquare, Menu, X, Ticket, Star, User, Building2,
  Sun, Moon, ShoppingBag
} from 'lucide-react';

const ICON_MAP = {
  'Dashboard': LayoutDashboard,
  'Products': Package,
  'Shop': ShoppingBag,
  'Categories': Layers,
  'Stock': Boxes,
  'Orders': ShoppingCart,
  'Customers': Users,
  'Inquiries': MessageSquare,
  'Reviews': Star,
  'Payments': CreditCard,
  'Analytics': BarChart3,

  'GSTR1': FileText,
  'Admins': UserCog,
  'Audit Logs': ShieldAlert,
  'Settings': Settings,
  'Shipping Settings': Package2,
  'Coupons': Ticket,
  'Profile': Building2,
  'Business Profile': Building2,
  'My Account': User,
};

const AdminLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('themeMode') || 'dark');

  // Sync theme change from event
  React.useEffect(() => {
    const handleThemeToggle = (e) => {
      setThemeMode(e.detail);
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('themeMode', next);
    window.dispatchEvent(new CustomEvent('theme-toggle', { detail: next }));
  };

  // Close sidebar on route change
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location]);
  
  // Filter menu based on dynamic permissions
  const menu = superAdminSidebar.filter(item => {
    if (!item.permissions) return true;
    return item.permissions.some(p => hasPermission(p));
  });

  return (
    <div className="admin-shell min-h-screen bg-[#0C1310] flex flex-col md:flex-row text-white">
      {/* Mobile Header - Dark background to match the sidebar theme and ensure the logo is visible */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-[#050807] border-b border-[#26322B] sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-300 hover:text-[#25d958] active:text-[#25d958] hover:bg-[#25d958]/10 active:bg-[#25d958]/20 rounded-xl transition-colors focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2 py-1 no-underline">
          <img src="/favicon.webp" alt="Durga Maa" className="h-8 w-8 object-contain shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-serif font-bold text-white tracking-tight" style={{ fontSize: '14px' }}>Durga Shakti Foils</span>
            <span className="text-[#25D958]/80 italic font-inter" style={{ fontSize: '9px', letterSpacing: '0.02em' }}>Wrap Purity, Seal Freshness</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-300 hover:text-[#25d958] transition-colors focus:outline-none"
            aria-label="Toggle Theme"
          >
            {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#25d958]/20 flex items-center justify-center text-[#25d958] font-black text-xs">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[1000] bg-[#0C1310]/80 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-[#050807] text-slate-350 flex flex-col fixed inset-y-0 left-0 shadow-2xl z-[1001] border-r border-[#26322B] font-inter transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex items-center justify-between border-b border-[#26322B] bg-[#050807]">
          <Link to="/" className="flex items-center gap-2 py-1 no-underline">
            <img src="/favicon.webp" alt="Durga Maa" className="h-9 w-9 object-contain shrink-0" />
            <span className="flex flex-col leading-none">
              <span className="font-serif font-bold text-white tracking-tight" style={{ fontSize: '14px' }}>Durga Shakti Foils</span>
              <span className="text-[#25D958]/80 italic font-inter" style={{ fontSize: '9px', letterSpacing: '0.02em' }}>Wrap Purity, Seal Freshness</span>
            </span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 pl-3 pr-2 space-y-1 sidebar-scrollbar bg-[#050807]">
          {menu.map((item) => {
            const Icon = ICON_MAP[item.label] || LayoutDashboard;
            const isSuper = user?.role === 'SUPER_ADMIN' || location.pathname.startsWith('/superadmin');
            const prefix = isSuper ? '/superadmin' : '/admin';
            const routeSegment = item.path || item.label.toLowerCase().replace(/\s+/g, '-');
            const path = `${prefix}/${routeSegment}`;
            const isActive = location.pathname === path || (item.label === 'Dashboard' && (location.pathname === '/admin' || location.pathname === '/superadmin'));
            
            return (
              <Link
                key={item.label}
                to={path}
                className={`flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[rgba(11,209,61,0.12)] hover:bg-[rgba(11,209,61,0.16)] text-[#16E34A] border-l-4 border-primary pl-2.5 font-bold' 
                    : 'text-slate-300 pl-3 font-medium hover:text-[#16E34A] hover:bg-[#19231F]/55'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#16E34A]' : 'text-slate-500 group-hover:text-[#16E34A]'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#26322B] bg-[#050807]">
          <div className="flex items-center gap-3 px-2 mb-4">
            {user?.role === 'SUPER_ADMIN' && user?.permissions?.profile_pic ? (
              <img 
                src={user.permissions.profile_pic} 
                alt="Super Admin" 
                className="w-8 h-8 rounded-full object-cover border border-primary/20" 
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs uppercase">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-mono">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={toggleTheme} 
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 mb-2 border ${
              themeMode === 'dark'
                ? 'text-slate-300 border-transparent hover:text-[#25D958] hover:bg-[#19231F]/50 hover:border-[#25D958]/20'
                : 'text-slate-300 border-transparent hover:text-white hover:bg-white/10 hover:border-white/25'
            }`}
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {themeMode === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button 
            type="button" 
            onClick={logout} 
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-slate-400 transition-all hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen bg-[#0C1310]">
        <div className={location.pathname.endsWith('/shop') ? 'w-full' : 'mx-auto max-w-[1280px] p-3 md:py-3.5 md:px-6'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
