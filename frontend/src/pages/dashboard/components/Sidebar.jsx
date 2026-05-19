import React from 'react';
import { 
  User, LogOut, Package, CreditCard, Heart, 
  Bell, Settings, MapPin, ShieldCheck 
} from 'lucide-react';

const Sidebar = ({ user, activeTab, setActiveTab, unreadNotifications, onLogout }) => {
  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'transactions', label: 'Payments', icon: CreditCard },
    { id: 'cards', label: 'Saved Cards', icon: ShieldCheck },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-full xl:w-80 flex-shrink-0 xl:sticky xl:top-24 self-start">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-row items-center gap-4 xl:flex-col xl:items-start">
            <div className="w-12 h-12 xl:w-16 xl:h-16 bg-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center mb-0 xl:mb-4 flex-shrink-0">
              <User className="w-6 h-6 xl:w-8 xl:h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg xl:text-xl font-black truncate">{user?.full_name}</h2>
              <p className="text-slate-400 text-[10px] xl:text-xs font-bold uppercase tracking-widest truncate">{user?.email}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </div>
        
        <nav className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
          
          <div className="hidden xl:block xl:col-span-1 my-2">
            <hr className="border-slate-200" />
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 md:p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all sm:col-span-2 xl:col-span-1"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
