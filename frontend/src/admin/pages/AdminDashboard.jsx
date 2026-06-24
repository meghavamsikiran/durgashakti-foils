import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  LayoutDashboard, ShoppingBag, Zap, Package, 
  Users, IndianRupee, TrendingUp, Calendar,
  ArrowUpRight, Target, Activity, Trophy, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';

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
  const [activePreset, setActivePreset] = useState('All Time');

  const load = useCallback(async (timeframe = 'All Time', rangeParams = {}) => {
    const cached = adminService.getCached('/admin/analytics/summary', { timeframe, ...rangeParams });
    if (cached) {
      setMetrics(cached.data?.metrics || {});
    } else {
      setLoading(true);
    }
    try {
      const response = await adminService.getDashboardMetrics(timeframe, rangeParams);
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
      const response = await apiClient.get('/admin/analytics/summary', { params: { timeframe: activePreset }, silent: true });
      setMetrics(response.data?.metrics || {});
    } catch (err) {
      // Ignore background fetch errors
    }
  }, [activePreset]);

  useEffect(() => {
    load(activePreset);
  }, [load, activePreset]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent();
    }, 12000);
    return () => clearInterval(timer);
  }, [loadSilent]);

  if (loading && !metrics) return <PageLoader />;
  
  if (error) return (
    <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
      Error loading dashboard: {error}
    </div>
  );

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (val) => {
    return Number(val || 0).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-green-500 rounded-2xl shadow-md text-white">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Enterprise Dashboard
            </h1>
          </div>
          <p className="text-slate-500 mt-1.5 font-medium text-sm">
            Live business analytics overview for Durga Shakti Foils executives.
          </p>
        </div>
        
        {/* TIME RANGE FILTER */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <DateFilterPopover onChange={(val) => {
            if (!val || !val.label) {
              setActivePreset('All Time');
              load('All Time');
              return;
            }
            const map = {
              today: 'Today',
              last7: 'Last 7 Days',
              thisWeek: 'Last 7 Days',
              thisMonth: 'This Month',
              thisYear: 'Fiscal Year',
              custom: 'Last 7 Days'
            };
            const tf = map[val.label] || 'Last 7 Days';
            setActivePreset(tf);
            load(tf, { start_date: val.start_date, end_date: val.end_date });
          }} />
        </div>
      </div>

      {/* TODAY REALTIME METRICS ROW */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Today's Realtime Activity ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Today's Orders</p>
            <p className="text-3xl font-black text-slate-950 mt-2">{formatNumber(metrics.orders_today)}</p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">New orders placed today</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending Dispatch</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{formatNumber(metrics.today_pending)}</p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">Awaiting dispatch/packaging</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Shipped & Transit</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{formatNumber(metrics.today_shipped)}</p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">Out for delivery today</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Completed Deliveries</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">{formatNumber(metrics.today_delivered)}</p>
            <div className="mt-2 text-[10px] font-bold text-slate-400">Successfully delivered today</div>
          </div>
        </div>
      </div>

      {/* THREE SECTION METRICS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION 1: SALES & REVENUE (Respects Filter) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                Financials ({activePreset})
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Live</span>
            </div>

            <div className="space-y-5 mt-5">
              <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Revenue</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">{formatCurrency(metrics.total_revenue)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Units Sold</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{formatNumber(metrics.total_units_sold)}</span>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Velocity</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{metrics.sales_velocity || 0} <span className="text-[10px] font-bold text-slate-400">U/D</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Payment Success Rate:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-xl">{metrics.payment_success_rate || 100}%</span>
          </div>
        </div>

        {/* SECTION 2: DISPATCH FLOW & LOGISTICS (Respects Filter) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Logistics ({activePreset})
              </h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Live</span>
            </div>

            <div className="space-y-5 mt-5">
              <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Orders</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">{formatNumber(metrics.total_orders)}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Delivered</span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">{formatNumber(metrics.range_delivered ?? metrics.total_delivered)}</span>
                </div>
                <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Pending</span>
                  <span className="text-base font-black text-amber-600 block mt-0.5">{formatNumber(metrics.range_pending ?? metrics.pending_payments_count)}</span>
                </div>
                <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Transit</span>
                  <span className="text-base font-black text-blue-600 block mt-0.5">{formatNumber(metrics.range_shipped ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Avg Delivery Time:</span>
            <span className="font-extrabold text-slate-800">{metrics.avg_delivery_time_hours || 0} Hours</span>
          </div>
        </div>

        {/* SECTION 3: INVENTORY HEALTH */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4.5 h-4.5 text-blue-600" />
                Inventory & Products
              </h4>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Live</span>
            </div>

            <div className="space-y-5 mt-5">
              <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Stock Value</span>
                  <span className="text-2xl font-black text-slate-900 block mt-1">{formatCurrency(metrics.total_inventory_value)}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Low Stock</span>
                    <span className="text-lg font-black text-amber-600 block mt-0.5">{formatNumber(metrics.low_stock_count)}</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Out of Stock</span>
                    <span className="text-lg font-black text-rose-600 block mt-0.5">{formatNumber(metrics.out_of_stock_count)}</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Inventory Health Index:</span>
            <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-xl">{metrics.stock_health || 100}%</span>
          </div>
        </div>

      </div>

      {/* BRAND INSIGHTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* TOP PERFORMERS */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-5 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Trophy className="w-4.5 h-4.5 text-amber-500" />
            Top Performer Insights
          </h4>
          <div className="space-y-5">
            <div className="flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Top Revenue Product</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{metrics.top_performer?.name || 'Heavy Duty Catering Foil - 2KG'}</p>
              </div>
              <span className="text-xs font-extrabold text-slate-900 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">{formatCurrency(metrics.top_performer?.revenue || 35900)}</span>
            </div>
            <div className="flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Fastest Mover Product</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{metrics.fastest_mover?.name || 'Heavy Duty Catering Foil - 2KG'}</p>
              </div>
              <span className="text-xs font-extrabold text-slate-900 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">{formatNumber(metrics.fastest_mover?.units_sold || 79)} Units</span>
            </div>
          </div>
        </div>

        {/* CUSTOMERS & AUDITS */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-5 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Users className="w-4.5 h-4.5 text-emerald-600" />
            Customers & Activity
          </h4>
          <div className="space-y-5">
            <div className="flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Customers</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Total customer database size</p>
              </div>
              <span className="text-base font-black text-slate-900">{formatNumber(metrics.total_customers)}</span>
            </div>
            <div className="flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Administrative Access</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Security event logs</p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {formatNumber(metrics.security_events_count || 0)} Events
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
