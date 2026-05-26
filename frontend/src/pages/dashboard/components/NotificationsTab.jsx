import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import PageLoader from '../../../components/ui/PageLoader';
import TablePagination from '../../../components/ui/TablePagination';

const NotificationsTab = ({ notifications, loading, onMarkAllAsRead }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const getIcon = (type) => {
    switch (type) {
      case 'order': return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'payment': return <Info className="w-5 h-5 text-primary" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) return <PageLoader message="Loading alerts..." />;

  const totalFilteredPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <Button variant="ghost" onClick={onMarkAllAsRead} className="text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg">
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-6 rounded-xl border transition-all flex items-start gap-4 ${notif.is_read ? 'bg-surface-container-lowest border-border-subtle' : 'bg-primary/5 border-primary/20 shadow-emerald-glow'}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.is_read ? 'bg-surface-container-low' : 'bg-surface-container-lowest shadow-sm'}`}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-black truncate uppercase tracking-tight ${notif.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>{notif.title}</h4>
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{new Date(notif.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-muted-foreground/80' : 'text-foreground/90 font-medium'}`}>{notif.message}</p>
                </div>
                {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2 animate-pulse" />}
              </div>
            ))}
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            onPageChange={setCurrentPage}
            totalItems={notifications.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </motion.div>
  );
};

export default NotificationsTab;
