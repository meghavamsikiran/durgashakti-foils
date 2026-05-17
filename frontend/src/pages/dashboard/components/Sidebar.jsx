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
    <aside className="w-full lg:w-80 flex-shrink-0">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-8">
        <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-xl flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-black truncate">{user?.full_name}</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{user?.email}</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>
        
        <nav className="p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all mb-1 ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
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
          
          <hr className="my-4 border-slate-200" />
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all"
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
