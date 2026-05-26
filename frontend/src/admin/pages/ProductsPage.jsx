import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { formatImageUrl } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Package, Plus, Search, Tag, Box,
  IndianRupee, TrendingUp, Filter, Trash2,
  Upload, CheckCircle2, AlertCircle, X, ChevronRight,
  Boxes, Edit, Trash, Activity, Trophy, Zap, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import TablePagination from '../../components/ui/TablePagination';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';

const DEFAULT_CATEGORY = 'Aluminum Foil';
const ADMIN_PRODUCTS_CACHE_PATH = '/admin/products';
const BADGE_OPTIONS = ['', 'New Arrival', 'Best Seller', 'Limited Offer', 'Huge Saving'];

const createVariantRow = (overrides = {}) => ({
  size: '',
  sku: '',
  price: '',
  discount_price: '',
  stock_quantity: '',
  badge: '',
  ...overrides,
});

const ProductsPage = () => {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: 10, search: '' });
    return cached?.items || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: 10, search: '' });
    return !cached;
  });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: DEFAULT_CATEGORY,
    thickness: '',
    width: '',
    image_url: '',
    media_urls: [],
    features: '',
    price: 0,
    discount_price: 0,
    stock_quantity: 0,
    batch_no: '',
    size: '',
    badge: '',
    variants: '',
    is_active: true,
  });
  const [variantRows, setVariantRows] = useState([
    createVariantRow({ size: 'Small', sku: 'SKU-S', price: '99', discount_price: '79', stock_quantity: '100', badge: 'New Arrival' }),
    createVariantRow({ size: 'Large', sku: 'SKU-L', price: '199', discount_price: '149', stock_quantity: '50', badge: 'Best Seller' }),
  ]);
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.metrics || null;
  });
  const [categories, setCategories] = useState([]);
  const [statusSavingIds, setStatusSavingIds] = useState(() => new Set());
  const productFormRef = React.useRef(null);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: categories[0]?.name || DEFAULT_CATEGORY,
      thickness: '',
      width: '',
      image_url: '',
      media_urls: [],
      features: '',
      price: 0,
      discount_price: 0,
      stock_quantity: 0,
      batch_no: '',
      size: '',
      badge: '',
      variants: '',
      is_active: true,
    });
    setImageFile(null);
    setVariantRows([
      createVariantRow({ size: 'Small', sku: 'SKU-S', price: '99', discount_price: '79', stock_quantity: '100', badge: 'New Arrival' }),
      createVariantRow({ size: 'Large', sku: 'SKU-L', price: '199', discount_price: '149', stock_quantity: '50', badge: 'Best Seller' }),
    ]);
  };

  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, { page: 1, limit: 10, search: '' });
    return cached?.data?.total || 0;
  });

  const requestFilters = useCallback(() => ({
    page: undefined,
    limit: undefined,
    search,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    stock: stockFilter === 'all' ? undefined : stockFilter === 'in' ? 'in' : 'out',
  }), [search, categoryFilter, activeFilter, stockFilter]);

  const fetchRows = useCallback(async (pageNum = 1) => {
    const params = { ...requestFilters(), page: pageNum, limit: ITEMS_PER_PAGE };
    const cached = adminService.getCached(ADMIN_PRODUCTS_CACHE_PATH, params);
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getProducts(params);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setPage(pageNum);
      adminService.getDashboardMetrics().then((mRes) => {
        setMetrics(mRes.data?.metrics || null);
      }).catch(() => {});
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [requestFilters]);

  const fetchRowsSilent = useCallback(async (pageNum = 1) => {
    try {
      const params = { ...requestFilters(), page: pageNum, limit: ITEMS_PER_PAGE };
      const response = await apiClient.get(ADMIN_PRODUCTS_CACHE_PATH, { params, silent: true });
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (err) {
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

  const handleEdit = (product) => {
    setIsEdit(true);
    setCurrentId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || DEFAULT_CATEGORY,
      thickness: product.thickness || '11 Micron',
      width: product.width || '295mm',
      image_url: product.image_url || '',
      media_urls: product.media_urls || [],
      features: Array.isArray(product.features) ? product.features.join(', ') : (product.features || ''),
      price: product.price || 0,
      discount_price: product.discount_price || 0,
      stock_quantity: product.stock_quantity || 0,
      batch_no: product.batch_no || '',
      size: product.size || '',
      badge: product.badge || '',
      variants: '', // Not used in edit mode
      is_active: product.is_active !== false,
    });
    setVariantRows([
      createVariantRow({
        size: product.size || '',
        sku: product.batch_no || product.variant_sku || '',
        price: product.price || 0,
        discount_price: product.discount_price || 0,
        stock_quantity: product.stock_quantity || 0,
        badge: product.badge || '',
      })
    ]);
    setShowForm(true);
    setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleToggleProductStatus = async (product) => {
    const nextStatus = product.is_active === false;
    setStatusSavingIds(prev => new Set(prev).add(product.id));
    setRows(prev => prev.map(row => row.id === product.id ? { ...row, is_active: nextStatus } : row));

    try {
      await adminService.toggleProductStatus(product.id, nextStatus);
      toast.success(`Product ${nextStatus ? 'activated' : 'deactivated'}`);
      fetchRowsSilent(page);
    } catch (err) {
      setRows(prev => prev.map(row => row.id === product.id ? { ...row, is_active: product.is_active } : row));
      toast.error(err.response?.data?.detail || 'Failed to update product status');
    } finally {
      setStatusSavingIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminService.deleteProduct(productId);
      toast.success('Product removed');
      fetchRows();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMediaUpload = async (files) => {
    if (!files || files.length === 0) return;

    const currentMediaCount = form.media_urls?.length || 0;
    const remainingSlots = 10 - currentMediaCount;

    if (remainingSlots <= 0) {
      toast.error("Maximum 10 images and videos are allowed.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} slot(s) remaining. Uploading the first ${remainingSlots} file(s).`);
    }

    setMediaUploading(true);

    for (const file of filesToUpload) {
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");

      if (!isImg && !isVid) {
        toast.error(`Unsupported format: ${file.name}`);
        continue;
      }

      const maxSize = isImg ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name} (Max: ${isImg ? '5MB' : '50MB'})`);
        continue;
      }

      const uploadToastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const res = await adminService.uploadProductMedia(file);
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://durgashakti-foils-1.onrender.com';
        const absoluteUrl = res.data.url.startsWith("http") ? res.data.url : `${backendUrl}${res.data.url}`;

        setForm(prev => ({
          ...prev,
          media_urls: [...(prev.media_urls || []), {
            url: absoluteUrl,
            type: res.data.type,
            file_name: file.name
          }]
        }));

        toast.success(`${file.name} uploaded!`, { id: uploadToastId });
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err.message || 'Error'}`, { id: uploadToastId });
      }
    }

    setMediaUploading(false);
  };

  const removeMediaItem = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      media_urls: (prev.media_urls || []).filter((_, idx) => idx !== indexToRemove)
    }));
    toast.success("Media asset removed from gallery");
  };

  const updateVariantRow = (index, key, value) => {
    setVariantRows(prev => prev.map((row, idx) => idx === index ? { ...row, [key]: value } : row));
  };

  const addVariantRow = () => {
    setVariantRows(prev => [...prev, createVariantRow()]);
  };

  const removeVariantRow = (index) => {
    setVariantRows(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index));
  };

  const loadVariantTemplate = () => {
    setVariantRows([
      createVariantRow({ size: 'Small', sku: 'SKU-S', price: '99', discount_price: '79', stock_quantity: '100', badge: 'New Arrival' }),
      createVariantRow({ size: 'Large', sku: 'SKU-L', price: '199', discount_price: '149', stock_quantity: '50', badge: 'Best Seller' }),
    ]);
  };

  const saveProduct = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.category) {
      toast.error('Name, description, and category are required'); return;
    }
    if (categories.length > 0 && !validCategoryNames.has(form.category)) {
      toast.error('Please select a valid category from the list');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await adminService.updateProduct(currentId, {
          ...form,
          features: typeof form.features === 'string' ? form.features.split(',').map(f => f.trim()).filter(Boolean) : form.features
        });
        toast.success('Product updated');
      } else {
        const variants = variantRows.map(row => ({
          size: String(row.size || '').trim(),
          sku: String(row.sku || '').trim(),
          price: Number(row.price),
          discount_price: row.discount_price !== '' && row.discount_price !== null ? Number(row.discount_price) : null,
          stock_quantity: Number(row.stock_quantity || 0),
          in_stock: Number(row.stock_quantity || 0) > 0,
          badge: row.badge || null
        }));
        const skus = variants.map(v => v.sku).filter(Boolean);

        if (!variants.length || variants.some(v => !v.size || !v.sku || isNaN(v.price) || v.price < 0 || isNaN(v.stock_quantity))) {
          toast.error('Please complete size, SKU, price, and stock for every variant');
          setSaving(false); return;
        }
        if (skus.length !== new Set(skus).size) {
          toast.error('Variant SKUs must be unique');
          setSaving(false); return;
        }
        await adminService.createProduct({
          ...form,
          features: form.features.split(',').map(f => f.trim()).filter(Boolean),
          variants,
        });
        toast.success('Catalog updated');
      }
      setShowForm(false);
      setIsEdit(false);
      fetchRows();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRows(1);
    }, 100);
    return () => clearTimeout(timer);
  }, [search, fetchRows]);

  // Periodic silent polling in the background (every 10 seconds) for real-time products & metrics
  useEffect(() => {
    const timer = setInterval(() => {
      fetchRowsSilent(page);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchRowsSilent, page]);

  const totalFilteredPages = Math.ceil(total / ITEMS_PER_PAGE);
  const filterCategoryOptions = Array.from(new Set([
    ...(categories || []).map(category => category.name).filter(Boolean),
  ]));
  const validCategoryNames = new Set((categories || []).map(cat => cat.name).filter(Boolean));
  const categoryOptions = Array.from(new Set([
    ...filterCategoryOptions,
    form.category || DEFAULT_CATEGORY,
  ]));
  const hasInvalidCategory = form.category && !validCategoryNames.has(form.category);
  const paginatedProducts = rows;

  const stats = {
    fastestMover: metrics?.fastest_mover?.name || 'N/A',
    topPerformer: metrics?.top_performer?.name || 'N/A',
    value: metrics?.total_inventory_value || 0,
    lowStock: metrics?.low_stock_count || 0
  };
  const canEditProducts = isSuperAdmin || hasPermission('edit_products');

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Product Catalog
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage inventories and item specifications.</p>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Items..."
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
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900">Product Filters</h3>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                  >
                    <option value="all">All Categories</option>
                    {filterCategoryOptions.map((cat) => (
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
                      onClick={() => { setFilterOpen(false); fetchRows(1); }}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {isSuperAdmin && !showForm && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl flex items-center gap-2 px-6">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fastest Mover</div>
              <div className="text-xs sm:text-sm lg:text-base font-black text-slate-900 leading-tight" title={stats.fastestMover}>
                {stats.fastestMover}
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top Performer</div>
              <div className="text-xs sm:text-sm lg:text-base font-black text-slate-900 leading-tight" title={stats.topPerformer}>
                {stats.topPerformer}
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-secondary-container text-secondary rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Value</div>
              <div className="text-2xl font-black text-slate-900">₹{Math.round(stats.value/1000)}k</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Low Stock</div>
              <div className="text-2xl font-black text-slate-900">{stats.lowStock}</div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div ref={productFormRef} className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 animate-in slide-in-from-top duration-500 overflow-hidden relative scroll-mt-6">
          <div className="absolute top-0 right-0 p-8">
             <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
          </div>

          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
            {isEdit ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {isEdit ? 'Edit Product' : 'Product Details'}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Product Title</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="e.g., Ultra-Hold Foil Roll" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                <textarea rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Technical details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                >
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {hasInvalidCategory && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Current category is not in the saved categories. Please choose a valid category or add it in Categories.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thickness</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="e.g., 11 Micron" value={form.thickness} onChange={e => setForm({...form, thickness: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Width</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="e.g., 295mm" value={form.width} onChange={e => setForm({...form, width: e.target.value})} />
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Product Image</label>
                <div className="flex gap-4">
                  <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all ${form.image_url ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-primary'}`}>
                    {form.image_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={formatImageUrl(form.image_url)} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                        <button onClick={() => setForm({...form, image_url: ''})} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline">Change Image</button>
                      </div>
                    ) : (
                      <label htmlFor="img-up" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center">
                        <Upload className="w-8 h-8 text-slate-300" />
                        <input type="file" className="hidden" id="img-up" onChange={e => setImageFile(e.target.files?.[0])} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors">
                          {imageFile ? imageFile.name : 'Choose File'}
                        </span>
                      </label>
                    )}
                  </div>
                  {imageFile && !form.image_url && (
                    <Button disabled={imageUploading} onClick={async () => {
                      setImageUploading(true);
                      try {
                        const res = await adminService.uploadProductImage(imageFile);
                        setForm({...form, image_url: `${process.env.REACT_APP_BACKEND_URL || 'https://durgashakti-foils-1.onrender.com'}${res.data.url}`});
                        setImageFile(null);
                        toast.success('Asset synced');
                      } catch (err) { toast.error(err.message); }
                      finally { setImageUploading(false); }
                    }} className="h-auto px-4 rounded-2xl text-[10px] uppercase font-black tracking-widest">
                      {imageUploading ? 'Uploading...' : 'Confirm Asset'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Product Gallery (Max 10 Images/Videos)
                  </label>
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {(form.media_urls || []).length} / 10 Assets
                  </span>
                </div>

                <div className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all relative ${
                  mediaUploading ? 'border-primary/20 bg-primary/5' :
                  (form.media_urls || []).length >= 10 ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' :
                  'border-slate-200 hover:border-primary bg-slate-50/30'
                }`}>
                  <label htmlFor="media-up" className={`flex flex-col items-center gap-2 w-full h-full justify-center ${
                    (form.media_urls || []).length >= 10 || mediaUploading ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}>
                    <Upload className={`w-8 h-8 ${mediaUploading ? 'text-primary animate-bounce' : 'text-slate-300'}`} />
                    <input
                      type="file"
                      className="hidden"
                      id="media-up"
                      multiple
                      accept="image/*,video/*"
                      disabled={mediaUploading || (form.media_urls || []).length >= 10}
                      onChange={e => handleMediaUpload(e.target.files)}
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {mediaUploading ? 'Uploading assets...' :
                       (form.media_urls || []).length >= 10 ? 'Gallery Full (10 max)' : 'Upload Images / Videos'}
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">
                      Supports PNG, JPG, WEBP, GIF (Max 5MB) & MP4, WEBM, MOV (Max 50MB)
                    </span>
                  </label>
                </div>

                {(form.media_urls || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                    {(form.media_urls || []).map((item, idx) => (
                      <div key={idx} className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group hover:border-primary transition-colors shadow-sm">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-slate-900 text-white relative">
                            <video src={formatImageUrl(item.url)} className="w-full h-full object-cover opacity-60" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[8px] bg-primary text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                Video
                              </span>
                            </div>
                          </div>
                        ) : (
                          <img src={formatImageUrl(item.url)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeMediaItem(idx); }}
                          className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors shadow shadow-rose-200 z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isEdit ? 'Product Inventory' : 'Variant Inventory Strategy'}
                  </label>
                  {!isEdit && (
                    <button type="button" onClick={loadVariantTemplate} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
                      Load Template
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-[620px] w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Size</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">SKU</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Price</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Offer</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Stock</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Badge</th>
                        {!isEdit && <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isEdit ? (
                        <tr>
                          <td className="px-2 py-2">
                            <input className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={form.size} onChange={e => setForm({...form, size: e.target.value})} />
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm font-mono" value={form.batch_no} onChange={e => setForm({...form, batch_no: e.target.value})} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 bg-emerald-50/40 px-2 py-2 text-sm" value={form.discount_price} onChange={e => setForm({...form, discount_price: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="1" className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: Number(e.target.value)})} />
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}>
                              {BADGE_OPTIONS.map(option => <option key={option || 'none'} value={option}>{option || 'No Badge'}</option>)}
                            </select>
                          </td>
                        </tr>
                      ) : (
                        variantRows.map((row, index) => (
                          <tr key={index}>
                            <td className="px-2 py-2">
                              <input className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={row.size} onChange={e => updateVariantRow(index, 'size', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm font-mono" value={row.sku} onChange={e => updateVariantRow(index, 'sku', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={row.price} onChange={e => updateVariantRow(index, 'price', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-200 bg-emerald-50/40 px-2 py-2 text-sm" value={row.discount_price} onChange={e => updateVariantRow(index, 'discount_price', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min="0" step="1" className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" value={row.stock_quantity} onChange={e => updateVariantRow(index, 'stock_quantity', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" value={row.badge} onChange={e => updateVariantRow(index, 'badge', e.target.value)}>
                                {BADGE_OPTIONS.map(option => <option key={option || 'none'} value={option}>{option || 'No Badge'}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeVariantRow(index)}
                                disabled={variantRows.length <= 1}
                                className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                                title="Remove variant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {!isEdit && (
                  <button type="button" onClick={addVariantRow} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-emerald-700">
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                )}
              </div>

              {false && (isEdit ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Original Price (₹)</label>
                      <input type="number" step="0.01" min="0" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Offer Price (₹)</label>
                      <input type="number" step="0.01" min="0" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium bg-emerald-50/30" value={form.discount_price} onChange={e => setForm({...form, discount_price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Quantity</label>
                      <input type="number" step="1" min="0" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Marketing Tag / Badge</label>
                      <select className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}>
                        <option value="">No Badge</option>
                        <option value="Best Seller">Best Seller</option>
                        <option value="Limited Offer">Limited Offer</option>
                        <option value="Huge Saving">Huge Saving</option>
                        <option value="New Arrival">New Arrival</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variant Inventory Strategy</label>
                    <span className="text-[9px] font-bold text-primary">Size | SKU | Price | Offer | Stock | Badge</span>
                  </div>
                  <textarea rows={5} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50/50"
                    placeholder="Enter one per line:&#10;18 Micron | DSF-18-72 | 199 | 149 | 500 | Best Seller&#10;11 Micron | DSF-11-25 | 129 | 99 | 1000 | Huge Saving"
                    value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} />
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-slate-500 font-medium italic">Use the | character to separate fields.</p>
                    <button onClick={() => setForm({...form, variants: 'Small | SKU-S | 99 | 79 | 100 | New Arrival\nLarge | SKU-L | 199 | 149 | 50 | Best Seller'})} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Load Template</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end gap-4">
             <Button variant="ghost" onClick={() => { setShowForm(false); setIsEdit(false); }} className="rounded-xl font-bold">Discard</Button>
             <Button disabled={saving} onClick={saveProduct} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-emerald-glow">
               {saving ? 'Processing...' : (isEdit ? 'Update Product' : 'Add Product')}
             </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">SKU Code</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Sales</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedProducts.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                         {row.image_url ? (
                           <img src={formatImageUrl(row.image_url)} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300"><Box className="w-5 h-5" /></div>
                         )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{row.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{row.size} • {row.thickness}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-[10px] font-mono font-bold text-slate-500 tracking-widest">{row.batch_no}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-sm font-black text-slate-800">₹{Number(row.discount_price || row.price || 0).toLocaleString()}</div>
                    {row.discount_price > 0 && row.discount_price < row.price && (
                      <div className="text-[9px] text-slate-500 line-through">₹{row.price}</div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`text-sm font-black ${row.stock_quantity <= 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {row.stock_quantity}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-sm font-bold text-primary flex items-center justify-center gap-1">
                      {row.units_sold || 0}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        disabled={!canEditProducts || statusSavingIds.has(row.id)}
                        onClick={() => handleToggleProductStatus(row)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          row.is_active === false
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title={row.is_active === false ? 'Activate product' : 'Deactivate product'}
                      >
                        {row.is_active === false ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                        {row.is_active === false ? 'Inactive' : 'Active'}
                      </button>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        row.stock_quantity > 0 ? 'bg-primary/10 text-primary' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {row.stock_quantity > 0 ? 'In Stock' : 'Out Stock'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              Catalog search returned zero results.
            </div>
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={totalFilteredPages}
          onPageChange={fetchRows}
          totalItems={total}
          pageSize={ITEMS_PER_PAGE}
        />
      </div>
    </div>
  );
};

export default ProductsPage;
