import React, { useEffect, useState } from 'react';
import adminService from '../services/admin.service';
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
import { useProgress } from '../../components/ui/ProgressToast';

const metricConfigs = {
  total_orders: { label: 'Total Orders', icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  orders_today: { label: 'Orders Today', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  total_products: { label: 'Total Products', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
  total_customers: { label: 'Total Customers', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  total_revenue: { label: 'Total Revenue', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_inventory_value: { label: 'Stock Value', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
  total_units_sold: { label: 'Units Sold', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  stock_health: { label: 'Stock Health', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  sales_velocity: { label: 'Daily Velocity', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  top_performer: { label: 'Top Performer', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  fastest_mover: { label: 'Fastest Mover', icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const AnalyticsPage = () => {
  const [summary, setSummary] = useState({ metrics: {}, order_status_counts: {}, best_products: [], inventory: [] });
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('BAR'); // BAR, PIE, LINE, DONUT
  const [searchQuery, setSearchQuery] = useState('');
  const [topLimit, setTopLimit] = useState(10);
  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const { startProgress, updateProgress, finishProgress } = useProgress();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await adminService.getDashboardMetrics(timeframe);
        setSummary(response.data || { metrics: {}, order_status_counts: {}, best_products: [], inventory: [] });
      } catch (error) {
        toast.error("Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [timeframe]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading data...</p>
      </div>
    </div>
  );

  const metrics = summary.metrics || {};
  const statusData = Object.entries(summary.order_status_counts || {}).map(([name, value]) => ({ name, value }));
  
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
  const totalStockLeft = inventory.reduce((s, r) => s + (r.stock_left || 0), 0);

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

  const renderChart = (data, dataKey = "value") => {
    if (!data || data.length === 0) return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
        <Search className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">No data matching filters</p>
      </div>
    );

    switch (chartType) {
      case 'PIE':
      case 'DONUT':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                innerRadius={chartType === 'DONUT' ? 80 : 0}
                outerRadius={120}
                paddingAngle={4}
                dataKey={dataKey}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => [value, name.length > 20 ? name.substring(0, 20) + '...' : name]}
              />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                wrapperStyle={{ paddingLeft: '20px', fontSize: '11px', fontWeight: '600' }}
                formatter={(value) => (
                  <span className="text-slate-600">
                    {value.length > 25 ? value.substring(0, 25) + '...' : value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'LINE':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey={dataKey} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      default: // BAR
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
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
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-56"
            />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>

      <div className="bg-slate-50 p-2 rounded-2xl flex flex-wrap items-center gap-4 border border-slate-200 shadow-inner">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
            <option>Fiscal Year</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 ml-auto">
          <ChevronDown className="w-4 h-4 text-indigo-600" />
          <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option value="BAR">Bar Display</option>
            <option value="LINE">Area Trend</option>
            <option value="PIE">Pie Distribution</option>
            <option value="DONUT">Donut Summary</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
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
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            Revenue Trend
          </h2>
          {renderChart(trendData)}
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            Order Status
          </h2>
          {renderChart(statusData)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
            Stock Levels
          </h2>
          {renderChart(inventoryData)}
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
            Best Sellers
          </h2>
          {renderChart(productData)}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Stock List</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1 rounded-full border">Sync Active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
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
              {inventory.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600">{p.name}</div>
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
