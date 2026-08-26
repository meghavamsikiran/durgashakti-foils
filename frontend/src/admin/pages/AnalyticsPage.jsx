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
  AlertTriangle, CheckCircle, Percent, Clock, CreditCard, Wallet
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import { useProgress } from '../../components/ui/ProgressToast';
import { downloadXlsx } from '../../utils/xlsxExport';

const COLORS = [
  '#006e1b', // Brand Green (DSF Wallet)
  '#3b82f6', // Blue (Razorpay Online)
  '#f59e0b', // Amber (COD)
  '#ef4444', // Red (Failed)
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const AnalyticsPage = () => {
  const [summary, setSummary] = useState({ metrics: {}, order_status_counts: {}, best_products: [], inventory: [], wallet_analytics: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topLimit, setTopLimit] = useState(10);
  const [timeframe, setTimeframe] = useState('All Time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { startProgress, updateProgress, finishProgress } = useProgress();

  const load = useCallback(async () => {
    setLoading(true);
    const isCustom = timeframe === 'Date Range';
    const params = {};
    if (isCustom) {
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
    }
    
    try {
      const response = await adminService.getDashboardMetrics(timeframe, params);
      setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [], wallet_analytics: {} });
    } catch (error) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [], wallet_analytics: {} });
    } catch (error) {
      // Ignore background errors
    }
  }, [timeframe, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  // Periodic silent polling in the background (every 12 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent();
    }, 12000);
    return () => clearInterval(timer);
  }, [loadSilent]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading analytics engine...</p>
      </div>
    );
  }

  const metrics = summary.metrics || {};
  const walletAnalytics = summary.wallet_analytics || {};
  
  const normalizedStatusCounts = {};
  Object.entries(summary.order_status_counts || {}).forEach(([key, val]) => {
    const normKey = key.toLowerCase();
    normalizedStatusCounts[normKey] = (normalizedStatusCounts[normKey] || 0) + val;
  });

  const totalOrdersCount = Object.values(normalizedStatusCounts).reduce((acc, curr) => acc + curr, 0);

  const statusData = Object.entries(normalizedStatusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  }));

  const trendData = (summary.revenue_trend || []).map(item => ({
    name: item.name,
    value: Number(item.value || 0)
  }));

  const categoryAnalytics = summary.category_analytics || [];
  
  const filteredCategoryAnalytics = categoryAnalytics.filter(c => 
    !searchQuery || (c.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryChartData = filteredCategoryAnalytics.map(c => ({
    name: c.category || 'Uncategorized',
    revenue: Number(c.revenue || 0),
    stockValue: Number(c.stock_value || 0),
  }));

  const categoryTotals = categoryAnalytics.reduce((acc, c) => ({
    revenue: acc.revenue + Number(c.revenue || 0),
    stockValue: acc.stockValue + Number(c.stock_value || 0),
    unitsSold: acc.unitsSold + Number(c.units_sold || 0),
  }), { revenue: 0, stockValue: 0, unitsSold: 0 });

  // Payment method data calculations featuring DSF Wallet
  const rawOnlineCount = metrics.online_payments_count || Math.max(0, (metrics.paid_payments_count || 0) - (metrics.cod_payments_count || 0) - (metrics.wallet_payments_count || 0));

  const paymentBreakdownData = [
    { name: 'DSF Wallet', value: metrics.wallet_payments_count || walletAnalytics.wallet_order_count || 0, color: '#006e1b' },
    { name: 'Razorpay / Online', value: rawOnlineCount, color: '#3b82f6' },
    { name: 'Cash On Delivery', value: metrics.cod_payments_count || 0, color: '#f59e0b' },
    { name: 'Failed / Overdue', value: metrics.failed_payments_count || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const handleExport = () => {
    const progressId = startProgress({
      label: `Durgashakti_Business_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing full business analytics report...',
    });

    try {
      updateProgress(progressId, { progress: 20, message: 'Structuring executive summary KPIs...' });

      const rows = [];
      
      // Title Block
      rows.push(["DURGASHAKTI FOILS - BUSINESS ANALYTICS REPORT"]);
      rows.push(["Generated On:", new Date().toLocaleString()]);
      rows.push(["Timeframe:", timeframe]);
      rows.push([]);

      // Executive KPIs
      rows.push(["EXECUTIVE KPI SUMMARY"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Revenue (INR)", Number(metrics.total_revenue || 0)]);
      rows.push(["Total Orders Count", Number(metrics.total_orders || 0)]);
      rows.push(["Orders Placed Today", Number(metrics.orders_today || 0)]);
      rows.push(["Stock Health Rate", `${metrics.stock_health || 100}%`]);
      rows.push(["Out Of Stock Products", Number(metrics.out_of_stock_count || 0)]);
      rows.push(["Low Stock Products", Number(metrics.low_stock_count || 0)]);
      rows.push(["Average Delivery Time", `${metrics.avg_delivery_time_hours || 0} hrs`]);
      rows.push(["DSF Wallet Orders Count", Number(metrics.wallet_payments_count || 0)]);
      rows.push(["DSF Wallet Revenue (INR)", Number(metrics.wallet_payments_amount || 0)]);
      rows.push(["Total Customer Wallet Liability Float (INR)", Number(metrics.total_wallet_liability || walletAnalytics.total_liability || 0)]);
      rows.push(["Active Wallet Customers Count", Number(metrics.active_wallet_users || walletAnalytics.active_users_count || 0)]);
      rows.push(["Refunds Credited to Wallet (INR)", Number(metrics.total_wallet_refunds_credited || walletAnalytics.total_refunds_credited || 0)]);
      rows.push(["Prepaid (Online) Orders", Number(rawOnlineCount)]);
      rows.push(["Cash On Delivery (COD) Orders", Number(metrics.cod_payments_count || 0)]);
      rows.push(["Average Order Value (AOV)", metrics.total_orders > 0 ? Math.round(metrics.total_revenue / metrics.total_orders) : 0]);
      rows.push([]);

      // Category Performance
      updateProgress(progressId, { progress: 50, message: 'Structuring category performance...' });
      rows.push(["CATEGORY BREAKDOWN PERFORMANCE"]);
      rows.push(["Category Name", "Revenue (INR)", "Units Sold", "Stock In Warehouse", "Stock Value (INR)", "Product Count"]);
      if (categoryAnalytics && categoryAnalytics.length > 0) {
        categoryAnalytics.forEach(cat => {
          rows.push([
            cat.category || 'Uncategorized',
            Number(cat.revenue || 0),
            Number(cat.units_sold || 0),
            Number(cat.stock_quantity || 0),
            Number(cat.stock_value || 0),
            Number(cat.product_count || 0)
          ]);
        });
      } else {
        rows.push(["No category data available"]);
      }
      rows.push([]);

      // Top Selling Products
      rows.push(["TOP SELLING PRODUCTS"]);
      rows.push(["Product Name", "Units Sold"]);
      const bestProducts = summary.best_products || [];
      if (bestProducts.length > 0) {
        bestProducts.forEach(p => {
          rows.push([p.name || 'Product', Number(p.quantity || 0)]);
        });
      } else {
        rows.push(["No top seller data available"]);
      }
      rows.push([]);

      // Inventory Stock Level
      rows.push(["INVENTORY WAREHOUSE MONITOR"]);
      rows.push(["Product Name", "SKU / Batch", "Remaining Stock", "Units Sold"]);
      const inventory = summary.inventory || [];
      if (inventory.length > 0) {
        inventory.forEach(inv => {
          rows.push([inv.name || 'Product', inv.sku || 'N/A', Number(inv.stock_left || 0), Number(inv.units_sold || 0)]);
        });
      } else {
        rows.push(["No inventory data available"]);
      }

      updateProgress(progressId, { progress: 85, message: 'Generating Excel file...' });
      downloadXlsx({
        filename: `Durgashakti_Business_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Business Analytics',
        rows: rows
      });

      finishProgress(progressId, {
        label: `Durgashakti_Business_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
        type: 'export',
        fileType: 'spreadsheet',
        message: 'Business analytics report downloaded successfully!',
      });
    } catch (err) {
      toast.error('Failed to export business report Excel');
    }
  };

  const inventoryData = (summary.inventory || []).slice(0, 10).map(p => ({
    name: p.name,
    value: Number(p.stock_left || 0)
  }));

  const productData = (summary.best_products || []).slice(0, 10).map(p => ({
    name: p.name,
    value: Number(p.quantity || 0)
  }));

  const filteredInventory = (summary.inventory || []).filter(p => 
    !searchQuery || (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CustomChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md">
          <p className="font-mono text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="font-extrabold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || '#10b981' }} />
              <span className="capitalize">{entry.name}:</span> 
              <span className="text-emerald-400 font-black">{prefix}{Number(entry.value).toLocaleString('en-IN')}{suffix}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderEmptyState = (title) => (
    <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-xs font-bold text-slate-500">No {title} Data Available</p>
      <p className="text-[10px] text-slate-400 mt-1">Try selecting a broader timeframe filter.</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
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
            <Download className="w-4 h-4 text-slate-500" /> Download Data
          </Button>
        </div>
      </div>

      {/* DSF WALLET EXECUTIVE SYSTEM INTELLIGENCE */}
      <div className="bg-white border border-slate-200/80 dark:bg-gradient-to-br dark:from-emerald-950 dark:via-slate-900 dark:to-emerald-900 p-8 rounded-3xl text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden space-y-6 dark:border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-emerald-800/50 pb-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">DSF Wallet System Analytics</h2>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-300 dark:border-emerald-400/30">
                Revenue Growth Driver
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1.5">
              Tracks customer float liability, order payment redemptions, retained ecosystem refunds, and active wallet balances.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/70 rounded-2xl border border-emerald-200/80 dark:border-emerald-700/50 text-right backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active Wallet Customers</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{metrics.active_wallet_users || walletAnalytics.active_users_count || 0} Account Holders</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
          {/* Card 1: Wallet Revenue */}
          <div className="bg-slate-50/80 border border-slate-200/80 dark:bg-white/5 dark:border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Wallet Orders Volume</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{Number(metrics.wallet_payments_amount || walletAnalytics.wallet_order_amount || 0).toLocaleString('en-IN')}</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">{metrics.wallet_payments_count || walletAnalytics.wallet_order_count || 0} Orders Paid via Wallet</p>
              </div>
              <div className="p-2.5 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/20 rounded-xl dark:text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2: Float Liability */}
          <div className="bg-slate-50/80 border border-slate-200/80 dark:bg-white/5 dark:border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Outstanding Wallet Float</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{Number(metrics.total_wallet_liability || walletAnalytics.total_liability || 0).toLocaleString('en-IN')}</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Unspent Customer Deposits</p>
              </div>
              <div className="p-2.5 bg-amber-100/70 text-amber-700 dark:bg-amber-500/20 rounded-xl dark:text-amber-400">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3: Retained Ecosystem Refunds */}
          <div className="bg-slate-50/80 border border-slate-200/80 dark:bg-white/5 dark:border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-blue-500/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">Retained Store Refunds</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{Number(metrics.total_wallet_refunds_credited || walletAnalytics.total_refunds_credited || 0).toLocaleString('en-IN')}</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Credited to Customer Wallets</p>
              </div>
              <div className="p-2.5 bg-blue-100/70 text-blue-700 dark:bg-blue-500/20 rounded-xl dark:text-blue-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4: Promotional Top-ups */}
          <div className="bg-slate-50/80 border border-slate-200/80 dark:bg-white/5 dark:border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">Promos & Admin Credits</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{Number(metrics.total_wallet_topups_credited || walletAnalytics.total_topups_credited || 0).toLocaleString('en-IN')}</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Vouchers & Top-up Credits</p>
              </div>
              <div className="p-2.5 bg-purple-100/70 text-purple-700 dark:bg-purple-500/20 rounded-xl dark:text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
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
                <Tooltip content={<CustomChartTooltip prefix="₹" />} cursor={false} />
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
                <Tooltip content={<CustomChartTooltip prefix="" suffix=" in stock" />} cursor={false} />
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
                <Tooltip content={<CustomChartTooltip prefix="" suffix=" Units" />} cursor={false} />
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
