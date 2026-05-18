import React from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import PageLoader from '../../../components/ui/PageLoader';

const NotificationsTab = ({ notifications, loading, onMarkAllAsRead }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'order': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'payment': return <Info className="w-5 h-5 text-indigo-600" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  if (loading) return <PageLoader message="Loading alerts..." />;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <Button variant="ghost" onClick={onMarkAllAsRead} className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-6 rounded-[2rem] border transition-all flex items-start gap-4 ${notif.is_read ? 'bg-white border-slate-200' : 'bg-indigo-50/30 border-indigo-100 shadow-lg shadow-indigo-100/20'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.is_read ? 'bg-slate-50' : 'bg-white shadow-sm'}`}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className={`text-sm font-black truncate uppercase tracking-tight ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</h4>
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{new Date(notif.created_at).toLocaleDateString()}</span>
                </div>
                <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>{notif.message}</p>
              </div>
              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2" />}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationsTab;
