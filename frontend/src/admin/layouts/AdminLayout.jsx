import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminSidebar, isSuperAdminRole, superAdminSidebar } from '../constants/rbac';
import { 
  LayoutDashboard, Package, Boxes, ShoppingCart, 
  Users, CreditCard, BarChart3, FileText,
  UserCog, ShieldAlert, Settings, LogOut, Package2, Layers,
  MessageSquare, Menu, X, Ticket, Star, User, Building2
} from 'lucide-react';

const ICON_MAP = {
  'Dashboard': LayoutDashboard,
  'Products': Package,
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
    <div className="min-h-screen bg-[#f7faf8] flex flex-col md:flex-row text-on-surface">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-border-subtle sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo-durga.png"
            alt="Durga Shakti Foils"
            className="h-7 w-auto object-contain"
            style={{ maxWidth: '150px' }}
          />
        </Link>
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
          {user?.full_name?.charAt(0) || 'A'}
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-[#0B1220] text-slate-350 flex flex-col fixed inset-y-0 left-0 shadow-2xl z-50 border-r border-border-subtle/10 font-inter transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-border-subtle/10 bg-[#0B1220]">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo-durga.png"
              alt="Durga Shakti Foils"
              className="h-8 w-auto object-contain"
              style={{ maxWidth: '180px' }}
            />
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 pl-3 pr-2 space-y-1 sidebar-scrollbar bg-[#0B1220]">
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
                    ? 'bg-[rgba(11,209,61,0.12)] text-[#16E34A] border-l-4 border-primary pl-2.5 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white pl-3 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#16E34A]' : 'text-slate-500 group-hover:text-primary'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle/10 bg-[#0B1220]">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs uppercase">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-mono">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={logout} 
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen bg-[#f7faf8]">
        <div className="max-w-[1500px] mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
