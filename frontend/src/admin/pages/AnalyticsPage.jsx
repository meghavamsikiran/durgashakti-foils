import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Package, Users, ShoppingBag, IndianRupee, 
  Download, Filter, Calendar, Search, ChevronDown, Activity, Zap, Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import { useProgress } from '../../components/ui/ProgressToast';

const metricConfigs = {
  total_orders: { label: 'Total Orders', icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
  orders_today: { label: 'Orders Today', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  total_products: { label: 'Total Products', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
  total_customers: { label: 'Total Customers', icon: Users, color: 'text-secondary', bg: 'bg-secondary-container' },
  total_revenue: { label: 'Total Revenue', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_inventory_value: { label: 'Stock Value', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_units_sold: { label: 'Units Sold', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  stock_health: { label: 'Stock Health', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  sales_velocity: { label: 'Daily Velocity', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  top_performer: { label: 'Top Performer', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  fastest_mover: { label: 'Fastest Mover', icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
};

const COLORS = ['#006e1b', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const AnalyticsPage = () => {
  const [summary, setSummary] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary', { timeframe: 'All Time' });
    return cached?.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] };
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary', { timeframe: 'All Time' });
    return !cached;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [topLimit, setTopLimit] = useState(10);
  const [timeframe, setTimeframe] = useState('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { startProgress, updateProgress, finishProgress } = useProgress();

  const load = useCallback(async () => {
    const isCustom = timeframe === 'Custom Range';
    const params = {};
    if (isCustom) {
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
    }

    const cached = adminService.getCached('/admin/analytics/summary', { timeframe, ...params });
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getDashboardMetrics(timeframe, params);
      setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] });
    } catch (error) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStart, customEnd]);

  const loadSilent = useCallback(async () => {
    const isCustom = timeframe === 'Custom Range';
    const params = {};
    if (isCustom) {
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
    }
    try {
      const response = await apiClient.get('/admin/analytics/summary', { params: { timeframe, ...params }, silent: true });
      setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] });
    } catch (error) {
      // Ignore background errors
    }
  }, [timeframe, customStart, customEnd]);

  useEffect(() => {
    load();
    loadSilent();
  }, [load, loadSilent]);

  // Periodic silent polling in the background (every 10 seconds) for real-time charts & inventory
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent]);

  if (loading) return <PageLoader />;

  const metrics = summary.metrics || {};
  
  const normalizedStatusCounts = {};
  Object.entries(summary.order_status_counts || {}).forEach(([key, val]) => {
    let normalizedKey = key.toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    normalizedStatusCounts[normalizedKey] = (normalizedStatusCounts[normalizedKey] || 0) + val;
  });
  const statusData = Object.entries(normalizedStatusCounts).map(([name, value]) => ({ name, value }));
  
  const trendData = summary.revenue_trend || [];

  const productData = (summary.best_products || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit)
    .map(p => ({ name: p.name, value: p.quantity }));

  const inventoryData = (summary.inventory || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit)
    .map(p => ({ name: p.name, value: p.stock_left }));
  
  const inventory = summary.inventory || [];
  const filteredInventory = (summary.inventory || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit);
  const totalStockLeft = inventory.reduce((s, r) => s + (r.stock_left || 0), 0);
  const categoryAnalytics = (summary.category_analytics || [])
    .filter(c => (c.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const categoryChartData = categoryAnalytics
    .slice(0, topLimit)
    .map(c => ({
      name: c.category || 'Uncategorized',
      revenue: Number(c.revenue || 0),
      stockValue: Number(c.stock_value || 0),
      unitsSold: Number(c.units_sold || 0),
    }));
  const categoryTotals = categoryAnalytics.reduce((acc, c) => ({
    revenue: acc.revenue + Number(c.revenue || 0),
    stockValue: acc.stockValue + Number(c.stock_value || 0),
    unitsSold: acc.unitsSold + Number(c.units_sold || 0),
  }), { revenue: 0, stockValue: 0, unitsSold: 0 });

  const formatValue = (key, value) => {
    if (key === 'total_revenue' || key === 'total_inventory_value') return `₹${Number(value).toLocaleString('en-IN')}`;
    if (key === 'stock_health') return `${value}%`;
    if (key === 'sales_velocity') return `${value} U/D`;
    if (typeof value === 'object' && value !== null) return value.name || 'N/A';
    return Number(value || 0).toLocaleString();
  };

  const handleExport = () => {
    const progressId = startProgress({
      label: `Durgashakti_Analytics_${new Date().toISOString().split('T')[0]}.csv`,
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing analytics data...',
    });

    try {
      if (!summary.inventory || summary.inventory.length === 0) {
        finishProgress(progressId, { message: 'No data available to export', isError: true });
        return;
      }

      updateProgress(progressId, { progress: 30, message: 'Building CSV rows...' });

      const headers = ["Product Name", "SKU", "Stock Left", "Units Sold", "Category"];
      const rows = summary.inventory.map(p => [
        `"${p.name}"`,
        `"${p.sku || 'N/A'}"`,
        p.stock_left,
        p.units_sold,
        `"${p.category || 'General'}"`
      ]);

      updateProgress(progressId, { progress: 60, message: 'Generating file...' });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Durgashakti_Product_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);

      updateProgress(progressId, { progress: 90, message: 'Downloading...' });

      link.click();
      document.body.removeChild(link);
      
      finishProgress(progressId, { message: 'Report downloaded successfully!' });
    } catch (err) {
      finishProgress(progressId, { message: 'Failed to generate export', isError: true });
    }
  };


  const renderEmptyState = () => (
    <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
      <Search className="w-8 h-8 mb-2 opacity-20 text-slate-400" />
      <p className="text-sm font-medium text-slate-500">No data matching filters</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Sales & Stock
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Track your sales and inventory performance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-56"
            />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Download</Button>
        </div>
      </div>

      <div className="bg-slate-50 p-2 rounded-2xl flex flex-wrap items-center gap-4 border border-slate-200 shadow-inner">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <Calendar className="w-4 h-4 text-primary" />
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option>All Time</option>
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
            <option>Fiscal Year</option>
            <option>Custom Range</option>
          </select>
        </div>

        {timeframe === 'Custom Range' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
            <input 
              type="date" 
              value={customStart} 
              onChange={(e) => setCustomStart(e.target.value)} 
              className="text-sm font-bold text-slate-700 outline-none bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
              className="text-sm font-bold text-slate-700 outline-none bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
            />
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 ml-auto">
          <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Show:</span>
          <select value={topLimit} onChange={(e) => setTopLimit(Number(e.target.value))} className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option value={5}>05 Items</option>
            <option value={10}>10 Items</option>
            <option value={20}>20 Items</option>
          </select>
        </div>
      </div>

      {/* Redundant metrics grid removed as requested to focus on advanced charts */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            Revenue Trend
          </h2>
          {(!trendData || trendData.length === 0) ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006e1b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#006e1b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#006e1b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            Order Status
          </h2>
          {(!statusData || statusData.length === 0) ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [value, 'Orders']}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingTop: '15px' }}
                  formatter={(value) => {
                    const item = statusData.find(d => d.name === value);
                    return <span className="text-slate-600 mr-2">{value} ({item ? item.value : 0})</span>;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
              Category Performance
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                Revenue Rs.{Math.round(categoryTotals.revenue).toLocaleString('en-IN')}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                Stock Rs.{Math.round(categoryTotals.stockValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          {(!categoryChartData || categoryChartData.length === 0) ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={categoryChartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                  tickFormatter={(name) => (name || '').length > 16 ? `${(name || '').substring(0, 14)}...` : name}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rs.${Math.round(val / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => [
                    name === 'unitsSold' ? Number(value).toLocaleString('en-IN') : `Rs.${Number(value).toLocaleString('en-IN')}`,
                    name === 'stockValue' ? 'Stock Value' : name === 'unitsSold' ? 'Units Sold' : 'Revenue'
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="revenue" fill="#006e1b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="stockValue" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Category Breakdown</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1 rounded-full border">
              {categoryAnalytics.length} Groups
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[600px] lg:min-w-full">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Sold</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categoryAnalytics.slice(0, topLimit).map((cat) => (
                  <tr key={cat.category} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{cat.category || 'Uncategorized'}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {cat.product_count || 0} Products | {cat.stock_quantity || 0} In Stock
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-primary">{cat.units_sold || 0}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">Rs.{Number(cat.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">Rs.{Number(cat.stock_value || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categoryAnalytics.length === 0 && (
              <div className="p-10 text-center text-slate-500 font-medium italic">
                No category analytics available.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
            Stock Levels
          </h2>
          {(!inventoryData || inventoryData.length === 0) ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={inventoryData}
                margin={{ top: 10, right: 30, left: 110, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(name) => (name || '').length > 20 ? (name || '').substring(0, 18) + '...' : name}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [value, 'Stock Left']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
            Best Sellers
          </h2>
          {(!productData || productData.length === 0) ? renderEmptyState() : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={productData}
                margin={{ top: 10, right: 30, left: 110, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(name) => (name || '').length > 20 ? (name || '').substring(0, 18) + '...' : name}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [value, 'Units Sold']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Stock List</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1 rounded-full border">Sync Active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] lg:min-w-full">
            <thead className="bg-slate-50/30">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Stock Health</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Remaining</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Sold</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInventory.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800 group-hover:text-primary">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.sku || 'N/A'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${p.stock_left <= 0 ? 'bg-rose-500' : p.stock_left <= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (p.stock_left / 100) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className={`px-8 py-5 text-right font-black ${p.stock_left <= 20 ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock_left}</td>
                  <td className="px-8 py-5 text-right font-bold text-slate-600">{p.units_sold}</td>
                  <td className="px-8 py-5 text-center">
                    {p.stock_left <= 0 ? (
                      <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase">Depleted</span>
                    ) : p.stock_left <= 20 ? (
                      <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase">Low</span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Stable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
