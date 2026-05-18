import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import { formatImageUrl } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Plus, Search, Tag, Box, 
  IndianRupee, TrendingUp, Filter, Trash2, 
  Upload, CheckCircle2, AlertCircle, X, ChevronRight,
  Boxes, Edit, Trash, Activity, Trophy, Zap
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import TablePagination from '../../components/ui/TablePagination';
import PageLoader from '../../components/ui/PageLoader';

const ProductsPage = () => {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Aluminum Foil',
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
  });
  const [metrics, setMetrics] = useState(null);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: 'Aluminum Foil',
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
    });
    setImageFile(null);
  };

  const [total, setTotal] = useState(0);

  const fetchRows = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const [response, mRes] = await Promise.all([
        adminService.getProducts({ page: pageNum, limit: ITEMS_PER_PAGE, search }),
        adminService.getDashboardMetrics()
      ]);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setPage(pageNum);
      setMetrics(mRes.data?.metrics || {});
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchRowsSilent = useCallback(async (pageNum = 1) => {
    try {
      const [response, mRes] = await Promise.all([
        adminService.getProducts({ page: pageNum, limit: ITEMS_PER_PAGE, search }),
        adminService.getDashboardMetrics()
      ]);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setMetrics(mRes.data?.metrics || {});
    } catch (err) {
      // Ignore background errors
    }
  }, [search]);

  const handleEdit = (product) => {
    setIsEdit(true);
    setCurrentId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || 'Aluminum Foil',
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
    });
    setShowForm(true);
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

  const saveProduct = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error('Name and description are required'); return;
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
        const variants = form.variants.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
          const parts = line.split('|').map(cell => (cell || '').trim());
          const [size, sku, price, discountPrice, stock] = parts;
          
          if (parts.length < 3) return null;
          
          return {
            size, 
            sku,
            price: Number(price),
            discount_price: discountPrice ? Number(discountPrice) : null,
            stock_quantity: Number(stock || 0),
            in_stock: Number(stock || 0) > 0,
            badge: parts[5] || null
          };
        });

        if (!variants.length || variants.some(v => !v || !v.size || !v.sku || isNaN(v.price) || v.price < 0)) {
          toast.error('Invalid Variants. Format: Size | SKU | Price | Discount | Stock'); 
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
    const timer = setTimeout(() => fetchRows(1), 300);
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
  const paginatedProducts = rows;

  const stats = {
    fastestMover: metrics?.fastest_mover?.name || 'N/A',
    topPerformer: metrics?.top_performer?.name || 'N/A',
    value: metrics?.total_inventory_value || 0,
    lowStock: metrics?.low_stock_count || 0
  };

  if (loading && rows.length === 0) return <PageLoader message="Loading Catalog..." />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-600" />
            Product Catalog
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage inventories and item specifications.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search Items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          {isSuperAdmin && !showForm && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl flex items-center gap-2 px-6">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
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
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
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

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 animate-in slide-in-from-top duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8">
             <div className="w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
          </div>
          
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
            {isEdit ? <Edit className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
            {isEdit ? 'Edit Product' : 'Product Details'}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Product Title</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="e.g., Ultra-Hold Foil Roll" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                <textarea rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="Technical details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thickness</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                      placeholder="e.g., 11 Micron" value={form.thickness} onChange={e => setForm({...form, thickness: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Width</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                      placeholder="e.g., 295mm" value={form.width} onChange={e => setForm({...form, width: e.target.value})} />
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Product Image</label>
                <div className="flex gap-4">
                  <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all ${form.image_url ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                    {form.image_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={formatImageUrl(form.image_url)} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                        <button onClick={() => setForm({...form, image_url: ''})} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline">Change Image</button>
                      </div>
                    ) : (
                      <label htmlFor="img-up" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center">
                        <Upload className="w-8 h-8 text-slate-300" />
                        <input type="file" className="hidden" id="img-up" onChange={e => setImageFile(e.target.files?.[0])} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">
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
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {(form.media_urls || []).length} / 10 Assets
                  </span>
                </div>
                
                <div className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all relative ${
                  mediaUploading ? 'border-indigo-100 bg-indigo-50/20' : 
                  (form.media_urls || []).length >= 10 ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' :
                  'border-slate-200 hover:border-indigo-300 bg-slate-50/30'
                }`}>
                  <label htmlFor="media-up" className={`flex flex-col items-center gap-2 w-full h-full justify-center ${
                    (form.media_urls || []).length >= 10 || mediaUploading ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}>
                    <Upload className={`w-8 h-8 ${mediaUploading ? 'text-indigo-400 animate-bounce' : 'text-slate-300'}`} />
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
                  <div className="grid grid-cols-5 gap-3 mt-4">
                    {(form.media_urls || []).map((item, idx) => (
                      <div key={idx} className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group hover:border-indigo-300 transition-colors shadow-sm">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-slate-900 text-white relative">
                            <video src={formatImageUrl(item.url)} className="w-full h-full object-cover opacity-60" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[8px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-0.5">
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
              
              {isEdit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Original Price (₹)</label>
                      <input type="number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Offer Price (₹)</label>
                      <input type="number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-emerald-50/30" value={form.discount_price} onChange={e => setForm({...form, discount_price: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock</label>
                      <input type="number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Marketing Tag / Badge</label>
                      <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}>
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
                    <span className="text-[9px] font-bold text-indigo-400">Size | SKU | Price | Offer | Stock | Badge</span>
                  </div>
                  <textarea rows={5} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none bg-slate-50/50"
                    placeholder="Enter one per line:&#10;18 Micron | DSF-18-72 | 199 | 149 | 500 | Best Seller&#10;11 Micron | DSF-11-25 | 129 | 99 | 1000 | Huge Saving"
                    value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} />
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-slate-500 font-medium italic">Use the | character to separate fields.</p>
                    <button onClick={() => setForm({...form, variants: 'Small | SKU-S | 99 | 79 | 100 | New Arrival\nLarge | SKU-L | 199 | 149 | 50 | Best Seller'})} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Load Template</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-200 flex justify-end gap-4">
             <Button variant="ghost" onClick={() => { setShowForm(false); setIsEdit(false); }} className="rounded-xl font-bold">Discard</Button>
             <Button disabled={saving} onClick={saveProduct} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-indigo-200">
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
                    <div className="text-sm font-bold text-indigo-600 flex items-center justify-center gap-1">
                      {row.units_sold || 0}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      row.stock_quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {row.stock_quantity > 0 ? 'In Stock' : 'Out Stock'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-600">
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
