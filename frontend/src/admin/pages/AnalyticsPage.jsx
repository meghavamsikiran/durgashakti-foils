import React, { useEffect, useState, useCallback, useRef } from 'react';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Package, Users, ShoppingBag, IndianRupee, 
  Download, Calendar, Search, Activity, Zap, Trophy,
  AlertTriangle, CheckCircle, Percent, Clock, CreditCard
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import { useProgress } from '../../components/ui/ProgressToast';
import { downloadXlsx } from '../../utils/xlsxExport';

const COLORS = [
  '#006e1b', // Brand Green
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const AnalyticsPage = () => {
  const [summary, setSummary] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary', { timeframe: 'All Time' });
    return cached?.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] };
  });
  
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary', { timeframe: 'All Time' });
    return !cached;
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topLimit, setTopLimit] = useState(10);
  const [timeframe, setTimeframe] = useState('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { startProgress, updateProgress, finishProgress } = useProgress();

  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    const isCustom = timeframe === 'Date Range';
    const params = {};
    if (isCustom) {
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
    }

    // Use background refreshing instead of unmounting page loader after first load
    if (!isFirstLoad.current) {
      setRefreshing(true);
    }
    
    try {
      const response = await adminService.getDashboardMetrics(timeframe, params);
      setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] });
    } catch (error) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, [timeframe, customStart, customEnd]);

  const loadSilent = useCallback(async () => {
    const isCustom = timeframe === 'Date Range';
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

  // Periodic silent polling in the background (every 10 seconds)
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
  const totalOrdersCount = statusData.reduce((acc, curr) => acc + curr.value, 0);
  
  const trendData = summary.revenue_trend || [];

  const productData = (summary.best_products || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit)
    .map(p => ({ name: p.name, value: p.quantity }));

  const inventoryData = (summary.inventory || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit)
    .map(p => ({ name: p.name, value: p.stock_left }));
  
  const filteredInventory = (summary.inventory || [])
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, topLimit);

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

  // Payment method data calculations
  const paymentBreakdownData = [
    { name: 'Razorpay / Prepaid', value: (metrics.paid_payments_count || 0) - (metrics.cod_payments_count || 0) },
    { name: 'Cash On Delivery', value: metrics.cod_payments_count || 0 },
    { name: 'Failed / Overdue', value: metrics.failed_payments_count || 0 },
  ].filter(d => d.value > 0);

  const handleExport = () => {
    const progressId = startProgress({
      label: `Durgashakti_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`,
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing analytics data...',
    });

    try {
      if (!summary.inventory || summary.inventory.length === 0) {
        finishProgress(progressId, { message: 'No data available to export', isError: true });
        return;
      }

      updateProgress(progressId, { progress: 30, message: 'Building workbook rows...' });

      const headers = ["Product Name", "SKU", "Stock Left", "Units Sold", "Category"];
      const rows = summary.inventory.map(p => [
        `"${p.name}"`,
        `"${p.sku || 'N/A'}"`,
        p.stock_left,
        p.units_sold,
        `"${p.category || 'General'}"`
      ]);

      updateProgress(progressId, { progress: 60, message: 'Generating file...' });
      updateProgress(progressId, { progress: 90, message: 'Downloading...' });

      downloadXlsx({
        filename: `Durgashakti_Product_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Product Analytics',
        rows: [headers, ...rows.map((row) => row.map((cell) => String(cell).replace(/^"|"$/g, '')))]
      });
      
      finishProgress(progressId, { message: 'Report downloaded successfully!' });
    } catch (err) {
      finishProgress(progressId, { message: 'Failed to generate export', isError: true });
    }
  };

  const renderEmptyState = (title) => (
    <div className="h-64 flex flex-col items-center justify-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
      <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
        <Search className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-bold text-slate-700">No {title} Data</p>
      <p className="text-xs text-slate-400 mt-1 max-w-[220px]">There is no record matching the selected filters for this timeframe.</p>
    </div>
  );

  // Custom tooltips with styled readability overlays
  const CustomChartTooltip = ({ active, payload, label, prefix = '₹', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[170px]"
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', zIndex: 9999 }}
        >
          <p className="font-bold border-b border-slate-800 pb-1 mb-1" style={{ color: '#cbd5e1' }}>{label}</p>
          {payload.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color || item.fill }} />
                {item.name === 'revenue' ? 'Revenue' : item.name === 'stockValue' ? 'Stock Value' : item.name === 'value' ? 'Quantity' : item.name}
              </span>
              <span className="font-extrabold" style={{ color: '#ffffff' }}>
                {item.name === 'unitsSold' || item.name === 'value' ? '' : prefix}
                {Number(item.value).toLocaleString('en-IN')}
                {suffix}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 relative">
      {/* Visual background loader line when background updates are fetching */}
      {refreshing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 animate-pulse z-50 rounded-full" />
      )}

      {/* Top Banner and Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-green-500 rounded-2xl shadow-md text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            Real-time business performance overview for Durgashakti Foils.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search products/categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 outline-none w-64"
            />
          </div>
          <Button 
            variant="outline" 
            className="rounded-2xl border-slate-200 font-semibold shadow-sm hover:bg-slate-50 gap-2 h-10 px-4" 
            onClick={handleExport}
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Sheet
          </Button>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="bg-slate-50/80 p-3 rounded-3xl flex flex-wrap items-center gap-3 border border-slate-100 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-150">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-500 mr-1">Timeframe:</span>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)} 
            className="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer pr-4 border-0 p-0 focus:ring-0"
          >
            <option>All Time</option>
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
            <option>Fiscal Year</option>
            <option>Date Range</option>
          </select>
        </div>
 
        {timeframe === 'Date Range' && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-150 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Start</span>
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)} 
                className="text-xs font-bold text-slate-700 outline-none border-0 p-0 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">End</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)} 
                className="text-xs font-bold text-slate-700 outline-none border-0 p-0 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="ml-auto text-xs font-bold text-slate-400 px-3">
          Showing data for <span className="text-emerald-700 font-extrabold">{timeframe}</span>
        </div>
      </div>

      {/* Executive KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-200/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                ₹{Number(metrics.total_revenue || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span>Success Rate: {metrics.payment_success_rate || 100}%</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Orders Overview */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-200/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Orders Summary</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.total_orders || 0}
              </h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>Today: {metrics.orders_today || 0} placed</span>
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Inventory Valuation & Health */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-200/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Stock Health</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.stock_health || 100}%
              </h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{metrics.out_of_stock_count || 0} Depleted | {metrics.low_stock_count || 0} Low</span>
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Avg Delivery Time */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-200/80 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Avg Delivery Time</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {metrics.avg_delivery_time_hours || 0} hrs
              </h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-violet-600" />
                <span>Range stats active</span>
              </p>
            </div>
            <div className="p-3 bg-violet-50 rounded-2xl text-violet-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts: Revenue Trend & Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Area Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              Revenue Trend Analysis
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              Total Invoiced: ₹{Number(metrics.total_revenue || 0).toLocaleString('en-IN')}
            </span>
          </div>
          {(!trendData || trendData.length === 0) ? renderEmptyState("Revenue Trend") : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006e1b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#006e1b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  tickFormatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} 
                />
                <Tooltip content={<CustomChartTooltip prefix="₹" />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="revenue"
                  stroke="#006e1b" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Doughnut (1/3 width) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 mb-1 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Order Status Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Distribution across fulfillment stages</p>
          </div>

          <div className="relative flex justify-center items-center my-2">
            {(!statusData || statusData.length === 0) ? renderEmptyState("Order Status") : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={65}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip prefix="" suffix=" Orders" />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text inside Doughnut */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{totalOrdersCount}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Orders</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 border-t border-slate-50 pt-4">
            {statusData.slice(0, 4).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <div className="truncate">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{entry.name}</p>
                  <p className="text-sm font-black text-slate-800">{entry.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Performance Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-3 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Category Performance
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Revenue generated vs Stock value locking</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-widest">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                Revenue: ₹{Math.round(categoryTotals.revenue).toLocaleString('en-IN')}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                Stock: ₹{Math.round(categoryTotals.stockValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {(!categoryChartData || categoryChartData.length === 0) ? renderEmptyState("Category Performance") : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                  tickFormatter={(name) => (name || '').length > 15 ? `${(name || '').substring(0, 13)}...` : name}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`} 
                />
                <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                <Bar dataKey="revenue" fill="#006e1b" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="stockValue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown listing */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-slate-800">Category Share List</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Sales contribution breakdown</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-150">
              {categoryAnalytics.length} Groups
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {categoryAnalytics.slice(0, 10).map((cat, idx) => {
              const contribution = categoryTotals.revenue > 0 
                ? Math.round((Number(cat.revenue || 0) / categoryTotals.revenue) * 100) 
                : 0;

              return (
                <div key={idx} className="p-5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {cat.category || 'Uncategorized'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {cat.product_count || 0} Products | {cat.stock_quantity || 0} In Stock
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">₹{Number(cat.revenue || 0).toLocaleString('en-IN')}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">Share:</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {contribution}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {categoryAnalytics.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm font-semibold italic">
                No category details available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW: Financial, Payments, and Success Rate Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Methods Breakdown Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 mb-1 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Payment Gateway Share
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Breakdown of online vs COD transactions</p>
          </div>

          <div className="relative flex justify-center items-center my-2">
            {paymentBreakdownData.length === 0 ? renderEmptyState("Payment Breakdown") : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentBreakdownData}
                      innerRadius={65}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip prefix="" suffix=" Payments" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{metrics.paid_payments_count || 0}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Paid Logs</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 mt-4 border-t border-slate-50 pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Razorpay / Prepaid:
              </span>
              <span className="font-extrabold text-slate-800">{((metrics.paid_payments_count || 0) - (metrics.cod_payments_count || 0))} txns</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Cash On Delivery (COD):
              </span>
              <span className="font-extrabold text-slate-800">{metrics.cod_payments_count || 0} txns</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Overdue / Failed:
              </span>
              <span className="font-extrabold text-slate-800">{metrics.failed_payments_count || 0} txns</span>
            </div>
          </div>
        </div>

        {/* Sales Velocity Meter (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 mb-1 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Sales Velocity & Business Pace
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Daily average sales and replenishment indexes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center flex-1 my-2">
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">AOV (Average Order)</span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                ₹{metrics.total_orders > 0 ? Math.round(metrics.total_revenue / metrics.total_orders).toLocaleString('en-IN') : 0}
              </h4>
              <p className="text-[10px] font-bold text-slate-400">Total average spent per invoice</p>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Daily Velocity</span>
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                {metrics.sales_velocity || 0} Units/D
              </h4>
              <p className="text-[10px] font-bold text-slate-400">Total units sold daily</p>
            </div>

            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">Total Units Dispatched</span>
                <Trophy className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                {metrics.total_units_sold || 0} Units
              </h4>
              <p className="text-[10px] font-bold text-slate-400">Total product units sold all-time</p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold pt-4 border-t border-slate-50">
            * Stock Value locked: <span className="font-extrabold text-slate-800">₹{Number(metrics.total_inventory_value || 0).toLocaleString('en-IN')}</span>. Top Performer Product: <span className="font-extrabold text-emerald-700">{metrics.top_performer?.name || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Stock Levels & Best Sellers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Level Matrix */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-950 mb-1 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Stock Health Status
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Current warehouse levels of best-performing SKUs</p>
          </div>
          {(!inventoryData || inventoryData.length === 0) ? renderEmptyState("Stock Health") : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={inventoryData}
                margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(name) => (name || '').length > 12 ? (name || '').substring(0, 10) + '...' : name}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  width={65}
                />
                <Tooltip content={<CustomChartTooltip prefix="" suffix=" in stock" />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value <= 20 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Best Sellers Board */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 mb-1 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Top Selling Products
            </h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Highest volume products by total units sold</p>
          </div>
          {(!productData || productData.length === 0) ? renderEmptyState("Top Sellers") : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={productData}
                margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(name) => (name || '').length > 12 ? (name || '').substring(0, 10) + '...' : name}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  width={65}
                />
                <Tooltip content={<CustomChartTooltip prefix="" suffix=" Units" />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stock List table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Inventory Status Monitor</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time alerts for replenishment cycles</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Monitor Sync Active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Stock Level</th>
                <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining</th>
                <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Sold</th>
                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4.5">
                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">{p.sku || 'N/A'}</div>
                  </td>
                  <td className="px-8 py-4.5">
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${p.stock_left <= 0 ? 'bg-red-500' : p.stock_left <= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (p.stock_left / 100) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {Math.min(100, Math.round((p.stock_left / 120) * 100))}%
                      </span>
                    </div>
                  </td>
                  <td className={`px-8 py-4.5 text-right font-extrabold text-sm ${p.stock_left <= 20 ? 'text-red-600' : 'text-slate-800'}`}>{p.stock_left}</td>
                  <td className="px-8 py-4.5 text-right font-extrabold text-slate-600 text-sm">{p.units_sold}</td>
                  <td className="px-8 py-4.5 text-center">
                    {p.stock_left <= 0 ? (
                      <span className="px-3 py-1 rounded-xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider border border-red-100">Depleted</span>
                    ) : p.stock_left <= 20 ? (
                      <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-100">Low Stock</span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">Healthy</span>
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
