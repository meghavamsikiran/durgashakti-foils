import { 
  User, LogOut, Package, CreditCard, Heart, 
  Bell, Settings, MapPin, ShieldCheck, X 
} from 'lucide-react';

const Sidebar = ({ user, activeTab, setActiveTab, unreadNotifications, wishlistCount, onLogout, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'transactions', label: 'Payments', icon: CreditCard },
    { id: 'cards', label: 'Saved Cards', icon: ShieldCheck },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'settings', label: 'Profile', icon: User },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 w-72 bg-[#0B1220] shadow-2xl z-50 border-r border-slate-800/60 transition-transform duration-300 xl:translate-x-0 ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'
    } xl:static xl:w-72 xl:flex-shrink-0 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-8rem)] xl:bg-transparent xl:z-auto xl:shadow-none xl:border-none overflow-y-auto scrollbar-hide`}>
      <div className="bg-[#0B1220] rounded-none xl:rounded-xl border-none xl:border border-slate-800 shadow-none xl:shadow-xl overflow-hidden font-inter min-h-screen xl:min-h-0">
        <div className="p-5 md:p-6 bg-[#0B1220] text-white relative overflow-hidden border-b border-slate-800">
          <div className="relative z-10 flex flex-row items-center justify-between gap-4 xl:flex-col xl:items-start">
            <div className="flex flex-row items-center gap-4 xl:flex-col xl:items-start">
              <div className="w-12 h-12 xl:w-14 xl:h-14 bg-white/10 rounded-lg flex items-center justify-center mb-0 xl:mb-3 flex-shrink-0 border border-white/10">
                <User className="w-6 h-6 xl:w-7 xl:h-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base xl:text-lg font-bold truncate font-manrope">{user?.full_name}</h2>
                <p className="text-slate-500 text-[10px] xl:text-xs font-mono font-bold uppercase tracking-widest truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="xl:hidden p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </div>
        
        <nav className="p-3 md:p-4 flex flex-col gap-1.5 bg-[#0B1220]">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3 md:p-3.5 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-[rgba(11,209,61,0.12)] text-[#16E34A] border-l-4 border-[#006e1b] pl-2.5 font-bold' 
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono">{item.badge}</span>
              )}
            </button>
          ))}
          
          <div className="hidden xl:block xl:col-span-1 my-2">
            <hr className="border-slate-800" />
          </div>
          
          <button 
            onClick={() => {
              onLogout();
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 md:p-3.5 rounded-lg text-rose-500 hover:bg-rose-950/20 transition-all font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
