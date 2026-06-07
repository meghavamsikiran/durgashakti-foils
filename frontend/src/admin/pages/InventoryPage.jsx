import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { formatImageUrl } from '../../utils/api';
import { 
  Boxes, TrendingDown, IndianRupee, BarChart3, 
  Search, RefreshCw, PlusCircle, MinusCircle, 
  X, AlertTriangle, ArrowRight, PackageOpen,
  LayoutGrid, Zap, Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import TablePagination from '../../components/ui/TablePagination';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_PRODUCTS_CACHE_PATH = '/admin/products';

const InventoryPage = () => {
  const { hasPermission } = useAuth();
  const ITEMS_PER_PAGE = 15;
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: ITEMS_PER_PAGE, search: '' });
    const rawItems = cached?.items || [];
    return rawItems.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.batch_no || product.variant_sku || '—',
      size: product.size || '—',
      stock_quantity: Number(product.stock_quantity || 0),
      units_sold: Number(product.units_sold || 0),
      low_stock_threshold: Number(product.low_stock_threshold || 20),
      in_stock: product.in_stock,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
    }));
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: ITEMS_PER_PAGE, search: '' });
    return !cached;
  });
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: ITEMS_PER_PAGE, search: '' });
    return cached?.total || 0;
  });
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.data?.metrics || null;
  });

  const categoryOptions = Array.from(new Set((categories || []).map(cat => cat.name).filter(Boolean)));

  const requestFilters = useCallback(() => ({
    search,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    stock: stockFilter === 'all' ? undefined : stockFilter === 'in' ? 'in' : stockFilter === 'out' ? 'out' : stockFilter === 'low' ? 'low' : undefined,
  }), [search, categoryFilter, activeFilter, stockFilter]);

  const load = useCallback(async (pageNum = 1) => {
    const params = { ...requestFilters(), page: pageNum, limit: ITEMS_PER_PAGE };
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, params);
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getInventory(params);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setPage(pageNum);
      adminService.getDashboardMetrics().then((mRes) => {
        setMetrics(mRes.data?.metrics || null);
      }).catch(() => {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestFilters]);

  const loadSilent = useCallback(async (pageNum = 1) => {
    try {
      const params = { ...requestFilters(), page: pageNum, limit: ITEMS_PER_PAGE };
      const response = await apiClient.get(ADMIN_PRODUCTS_CACHE_PATH, { params, silent: true });
      const rawItems = response.data?.items || [];
      const items = rawItems.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.batch_no || product.variant_sku || '—',
        size: product.size || '—',
        stock_quantity: Number(product.stock_quantity || 0),
        units_sold: Number(product.units_sold || 0),
        low_stock_threshold: Number(product.low_stock_threshold || 20),
        in_stock: product.in_stock,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
      }));
      setRows(items);
      setTotal(response.data?.total || 0);
    } catch {
      // Ignore background errors
    }
  }, [requestFilters]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await adminService.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      try {
        const fallback = await adminService.getPublicCategories();
        setCategories(fallback.data || []);
      } catch {
        toast.error('Failed to load categories');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 100);
    return () => clearTimeout(timer);
    // Only refresh immediately on search changes; filters apply when the user clicks Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdjust = async (direction) => {
    const delta = parseInt(adjustQty, 10);
    if (!delta || delta <= 0) { toast.error('Please enter a valid quantity'); return; }
    const finalDelta = direction === 'remove' ? -delta : delta;
    try {
      setSaving(true);
      await adminService.adjustInventory(adjustModal.id, { delta_quantity: finalDelta });
      toast.success(`Stock Updated: ${direction === 'remove' ? 'Removed' : 'Added'} ${delta} units`);
      setAdjustModal(null);
      setAdjustQty('');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };


  const stats = {
    totalValue: metrics?.total_inventory_value || 0,
    outOfStock: metrics?.out_of_stock_count || 0,
    lowStock: metrics?.low_stock_count || 0,
    soldVolume: metrics?.total_units_sold || 0,
    salesVelocity: metrics?.sales_velocity || 0
  };

  if (loading && rows.length === 0) return <PageLoader message="Loading Inventory..." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Boxes className="w-8 h-8 text-primary" />
            Product Stock
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor and update your product stock levels.</p>
        </div>
        
        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search Products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
            >
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Filter</span>
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setFilterOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:absolute md:translate-y-0 md:inset-auto md:right-0 md:mt-2 w-auto md:w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-slate-900">Stock Filters</h3>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                    >
                      <option value="all">All Categories</option>
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Status</label>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Stock</label>
                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                    >
                      <option value="all">All Stock</option>
                      <option value="in">In Stock</option>
                      <option value="out">Out of Stock</option>
                      <option value="low">Low Stock</option>
                    </select>
                    <div className="flex justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter('all');
                          setActiveFilter('all');
                          setStockFilter('all');
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFilterOpen(false); load(1); }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button onClick={load} variant="outline" className="rounded-xl p-2.5 bg-white hover:bg-slate-50 border-slate-200 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Stock Value</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{(stats.totalValue / 1000).toFixed(1)}k</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Low Stock</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.outOfStock + stats.lowStock}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Units Sold</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.soldVolume}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-secondary-container text-secondary rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sales Velocity</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.salesVelocity}<span className="text-[9px] text-slate-500 ml-1 font-bold tracking-widest">U/DAY</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-290px)]">
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Product Name</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">SKU Code</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Stock Status</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                         {row.image_url ? (
                           <img src={formatImageUrl(row.image_url)} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300"><LayoutGrid className="w-5 h-5" /></div>
                         )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{row.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                          {row.size} • {row.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-[10px] font-mono font-bold text-slate-500 tracking-widest">{row.sku}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-sm font-black text-slate-800">₹{row.price?.toLocaleString()}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`text-sm font-black ${
                      row.stock_quantity <= 0 ? 'text-rose-600' : 
                      row.stock_quantity <= row.low_stock_threshold ? 'text-amber-600' : 'text-slate-800'
                    }`}>
                      {row.stock_quantity}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      row.stock_quantity <= 0 ? 'bg-rose-50 text-rose-600' : 
                      row.stock_quantity <= row.low_stock_threshold ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {row.stock_quantity <= 0 ? 'Out Stock' : 
                       row.stock_quantity <= row.low_stock_threshold ? 'Low Stock' : 'Optimal'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <Button 
                      onClick={() => { setAdjustModal(row); setAdjustQty(''); }}
                      className="rounded-xl h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm shadow-emerald-glow hover:shadow-emerald-glow transition-all"
                    >
                      Update Stock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No products found.
            </div>
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
          onPageChange={load}
          totalItems={total}
          pageSize={ITEMS_PER_PAGE}
        />
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 scale-in-center overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Update Stock Quantity</h2>
              <button onClick={() => setAdjustModal(null)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-8">
               <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Stock</div>
                  <div className="text-lg font-black text-slate-900">{adjustModal.stock_quantity} Units</div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Change Quantity</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Enter quantity..." 
                  value={adjustQty} 
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={saving} 
                  onClick={() => handleAdjust('add')}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 transition-all group"
                >
                  <PlusCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Stock</span>
                </button>
                <button 
                  disabled={saving} 
                  onClick={() => handleAdjust('remove')}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 transition-all group"
                >
                  <MinusCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Remove Stock</span>
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-8 leading-relaxed">
              All stock changes are logged for records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
