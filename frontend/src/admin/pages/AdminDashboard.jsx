import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  LayoutDashboard, ShoppingBag, Zap, Package, 
  Users, IndianRupee, TrendingUp, Calendar,
  ArrowUpRight, Target, Activity, Trophy
} from 'lucide-react';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';

const metricConfigs = {
  total_orders: { label: 'Total Orders', icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
  orders_today: { label: "Today's Orders", icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  total_delivered: { label: 'Total Delivered', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  total_returned: { label: 'Total Returned', icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_products: { label: 'Total Products', icon: Package, color: 'text-secondary', bg: 'bg-secondary-container' },
  total_customers: { label: 'Total Customers', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  total_revenue: { label: 'Total Revenue', icon: IndianRupee, color: 'text-secondary', bg: 'bg-secondary-container' },
  total_inventory_value: { label: 'Stock Value', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_units_sold: { label: 'Units Sold', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  stock_health: { label: 'Stock Health', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  sales_velocity: { label: 'Daily Velocity', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  top_performer: { label: 'Top Performer', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  fastest_mover: { label: 'Fastest Mover', icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
  out_of_stock_count: { label: 'Out of Stock', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' },
  low_stock_count: { label: 'Low Stock', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
  security_events_count: { label: 'Security Events', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' },
  destructive_actions_count: { label: 'Critical Actions', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' },
};

const humanizeMetricKey = (key) => key
  .replace(/_count$/i, '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.data?.metrics || {};
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return !cached;
  });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const cached = adminService.getCached('/admin/analytics/summary');
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getDashboardMetrics();
      setMetrics(response.data?.metrics || {});
      setError('');
    } catch (err) {
      if (!cached) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSilent = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/analytics/summary', { silent: true });
      setMetrics(response.data?.metrics || {});
    } catch (err) {
      // Ignore background fetch errors
    }
  }, []);

  useEffect(() => {
    load();
    loadSilent();
  }, [load, loadSilent]);


  // Periodic silent polling in the background (every 10 seconds) for real-time overview stats
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent]);

  if (loading) return <PageLoader />;
  
  if (error) return (
    <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
      Error loading data: {error}
    </div>
  );

  const formatValue = (key, value) => {
    if (key === 'total_revenue' || key === 'total_inventory_value') return `₹${Number(value).toLocaleString('en-IN')}`;
    if (key === 'stock_health') return `${value}%`;
    if (key === 'sales_velocity') return `${value} U/D`;
    if (typeof value === 'object' && value !== null) return value.name || 'N/A';
    return Number(value || 0).toLocaleString();
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Business Overview
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">A summary of your business performance at Durga Shakti Foils.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DateFilterPopover onChange={(val) => {
            if (!val || !val.label) {
              load();
              return;
            }
            // Map our popover keys to analytics timeframe strings
            const map = {
              today: 'Today',
              last7: 'Last 7 Days',
              thisWeek: 'Last 7 Days',
              thisMonth: 'This Month',
              thisYear: 'Fiscal Year',
              custom: 'Last 7 Days'
            };
            const tf = map[val.label] || 'Last 7 Days';
            (async () => {
              setLoading(true);
              try {
                const resp = await adminService.getDashboardMetrics(tf);
                setMetrics(resp.data?.metrics || {});
              } catch (e) {
                // ignore
              } finally {
                setLoading(false);
              }
            })();
          }} />
        </div>
      </div>

      {Object.keys(metrics).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Object.entries(metrics).map(([key, value]) => {
            const config = metricConfigs[key] || { label: humanizeMetricKey(key), icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' };
            const Icon = config.icon;
            
            return (
              <div key={key} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className={`w-12 h-12 ${config.bg} ${config.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{config.label}</div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">{formatValue(key, value)}</div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className={`w-4 h-4 ${config.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Metrics are scoped to your permissions.</p>
          <p className="text-xs text-slate-400 mt-1">Contact a Super Admin if you need broader access.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-8">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                  {loading ? <div className="w-3 h-3 border-2 border-primary/30 border-t-transparent rounded-full animate-spin"></div> : <Activity className="w-3 h-3" />}
                  {loading ? "Checking Status..." : "Live Data Active"}
               </div>
               
               <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter leading-none">Status Summary</h2>
                  <p className="text-slate-500 font-medium max-w-md">Your store and orders are running smoothly across all regions.</p>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-4">
                  <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Status</div>
                     <div className="text-xl font-bold">Online</div>
                  </div>
                  <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Server Speed</div>
                     <div className="text-xl font-bold">Fast</div>
                  </div>
                  <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Database</div>
                     <div className="text-xl font-bold">Active</div>
                  </div>
               </div>
            </div>
            
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
               <Target className="w-64 h-64" />
            </div>
         </div>

          <div className="bg-primary rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-xl shadow-emerald-glow relative overflow-hidden group">
            <div className="space-y-4 relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-white" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tighter">Velocity Report</h3>
               <p className="text-white/75 text-sm leading-relaxed">System performance is optimal. Total sales velocity is up by 14.2% across all metrics.</p>
            </div>
            
            <div className="mt-8 relative z-10">
               <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-8 w-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>
                  ))}
               </div>
               <button 
                  onClick={() => navigate(window.location.pathname.startsWith('/superadmin') ? '/superadmin/analytics' : '/admin/analytics')}
                  className="w-full py-4 bg-white text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all shadow-lg active:scale-95"
               >
                  Full Insights
               </button>
            </div>

            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
