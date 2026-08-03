import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminSidebar } from '../constants/rbac';
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
  'Cases': MessageSquare,
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

  const isLight = themeMode === 'light';

  const shellClass = isLight 
    ? "admin-shell min-h-screen flex flex-col md:flex-row bg-[hsl(45,30%,98%)] text-slate-900" 
    : "admin-shell min-h-screen flex flex-col md:flex-row bg-[#0C1310] text-white";

  const headerClass = isLight
    ? "flex md:hidden items-center justify-between px-6 py-4 sticky top-0 z-30 shadow-sm border-b bg-white border-slate-200 text-slate-900"
    : "flex md:hidden items-center justify-between px-6 py-4 sticky top-0 z-30 shadow-sm border-b bg-[#050807] border-[#26322B] text-white";

  const menuButtonClass = isLight
    ? "p-2 -ml-2 rounded-xl transition-colors focus:outline-none text-slate-600 hover:text-[#006e1b] hover:bg-slate-100"
    : "p-2 -ml-2 rounded-xl transition-colors focus:outline-none text-slate-300 hover:text-[#25d958] hover:bg-[#25d958]/10";

  const logoTitleClass = isLight
    ? "font-serif font-bold tracking-tight text-slate-900"
    : "font-serif font-bold tracking-tight text-white";

  const logoSubtitleClass = isLight
    ? "italic font-inter text-[#006e1b]"
    : "italic font-inter text-[#25D958]/80";

  const themeHeaderBtnClass = isLight
    ? "p-2 transition-colors focus:outline-none text-slate-600 hover:text-[#006e1b]"
    : "p-2 transition-colors focus:outline-none text-slate-300 hover:text-[#25d958]";

  const overlayClass = isLight
    ? "fixed inset-0 z-[1000] backdrop-blur-sm md:hidden transition-opacity bg-slate-900/40"
    : "fixed inset-0 z-[1000] backdrop-blur-sm md:hidden transition-opacity bg-[#0C1310]/80";

  const asideClass = (isLight ? "bg-white text-slate-700 border-slate-200" : "bg-[#050807] text-slate-350 border-[#26322B]")
    + (sidebarOpen ? " w-64 flex flex-col fixed inset-y-0 left-0 shadow-2xl z-[1001] border-r font-inter transition-transform duration-300 md:translate-x-0 translate-x-0" : " w-64 flex flex-col fixed inset-y-0 left-0 shadow-2xl z-[1001] border-r font-inter transition-transform duration-300 md:translate-x-0 -translate-x-full");

  const asideHeaderClass = isLight
    ? "p-5 flex items-center justify-between border-b bg-white border-slate-200"
    : "p-5 flex items-center justify-between border-b bg-[#050807] border-[#26322B]";

  const asideNavClass = isLight
    ? "flex-1 overflow-y-auto py-6 pl-3 pr-2 space-y-1 sidebar-scrollbar bg-white"
    : "flex-1 overflow-y-auto py-6 pl-3 pr-2 space-y-1 sidebar-scrollbar bg-[#050807]";

  const asideFooterClass = isLight
    ? "p-4 border-t bg-white border-slate-200"
    : "p-4 border-t bg-[#050807] border-[#26322B]";

  const userNameClass = isLight ? "text-xs font-bold truncate text-slate-900" : "text-xs font-bold truncate text-white";
  const userRoleClass = isLight ? "text-[10px] truncate uppercase tracking-widest font-mono text-slate-500 font-semibold" : "text-[10px] truncate uppercase tracking-widest font-mono text-slate-500";

  const themeToggleBtnClass = isLight
    ? "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 mb-1 text-slate-800 hover:text-[#006e1b] hover:bg-emerald-50/60"
    : "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 mb-1 text-slate-300 hover:text-[#25D958] hover:bg-[#19231F]/50";

  const logoutBtnClass = isLight
    ? "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50"
    : "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all rounded-lg text-slate-400 hover:text-white";

  const mainClass = isLight
    ? "flex-1 md:ml-64 min-h-screen bg-[hsl(45,30%,98%)] text-slate-900"
    : "flex-1 md:ml-64 min-h-screen bg-[#0C1310] text-white";

  return (
    <div className={shellClass}>
      {/* Mobile Header */}
      <header className={headerClass}>
        <button 
          type="button"
          onClick={() => setSidebarOpen(true)}
          className={menuButtonClass}
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2 py-1 no-underline">
          <img src="/favicon.webp" alt="Durga Maa" className="h-8 w-8 object-contain shrink-0" />
          <span className="flex flex-col leading-none gap-[2px]">
            <span className={logoTitleClass} style={{ fontSize: '14px' }}>Durga Shakti Foils</span>
            <span className={logoSubtitleClass} style={{ fontSize: '9px', letterSpacing: '0.02em' }}>Wrap Purity, Seal Freshness</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className={themeHeaderBtnClass}
            aria-label="Toggle Theme"
          >
            {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className={overlayClass}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={asideClass}>
        <div className={asideHeaderClass}>
          <Link to="/" className="flex items-center gap-2 py-1 no-underline">
            <img src="/favicon.webp" alt="Durga Maa" className="h-9 w-9 object-contain shrink-0" />
            <span className="flex flex-col leading-none gap-[2px]">
              <span className={logoTitleClass} style={{ fontSize: '14px' }}>Durga Shakti Foils</span>
              <span className={logoSubtitleClass} style={{ fontSize: '9px', letterSpacing: '0.02em' }}>Wrap Purity, Seal Freshness</span>
            </span>
          </Link>
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={isLight ? 'md:hidden p-1 text-slate-500' : 'md:hidden p-1 text-slate-400'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className={asideNavClass}>
          {menu.map((item) => {
            const Icon = ICON_MAP[item.label] || LayoutDashboard;
            const isSuper = user?.role === 'SUPER_ADMIN' || location.pathname.startsWith('/superadmin');
            const prefix = isSuper ? '/superadmin' : '/admin';
            const routeSegment = item.path || item.label.toLowerCase().replace(/\s+/g, '-');
            const path = `${prefix}/${routeSegment}`;
            const isActive = location.pathname === path || (item.label === 'Dashboard' && (location.pathname === '/admin' || location.pathname === '/superadmin'));
            
            const linkClass = isActive 
              ? (isLight
                ? 'flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-200 group bg-emerald-50 text-[#006e1b] border-l-4 border-[#006e1b] pl-2.5 font-bold shadow-sm'
                : 'flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-200 group bg-[rgba(11,209,61,0.12)] hover:bg-[rgba(11,209,61,0.16)] text-[#16E34A] border-l-4 border-primary pl-2.5 font-bold')
              : (isLight
                ? 'flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-200 group text-slate-800 pl-3 font-semibold hover:text-[#006e1b] hover:bg-emerald-50/60'
                : 'flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-200 group text-slate-300 pl-3 font-medium hover:text-[#16E34A] hover:bg-[#19231F]/55');

            const iconClass = isActive
              ? (isLight ? 'w-4 h-4 transition-colors text-[#006e1b]' : 'w-4 h-4 transition-colors text-[#16E34A]')
              : (isLight ? 'w-4 h-4 transition-colors text-slate-600 group-hover:text-[#006e1b]' : 'w-4 h-4 transition-colors text-slate-500 group-hover:text-[#16E34A]');

            return (
              <Link
                key={item.label}
                to={path}
                className={linkClass}
              >
                <Icon className={iconClass} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={asideFooterClass}>
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
              <p className={userNameClass}>{user?.full_name || 'Administrator'}</p>
              <p className={userRoleClass}>{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={toggleTheme} 
            className={themeToggleBtnClass}
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 />}
            {themeMode === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button 
            type="button" 
            onClick={logout} 
            className={logoutBtnClass}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={mainClass}>
        <div className={location.pathname.endsWith('/shop') ? 'w-full' : 'mx-auto max-w-[1280px] p-3 md:py-3.5 md:px-6'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
