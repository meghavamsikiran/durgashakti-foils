import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import adminApi from '../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Plus, Search, Tag, Box, 
  IndianRupee, TrendingUp, Filter, Trash2, 
  Upload, CheckCircle2, AlertCircle, X, ChevronRight,
  Boxes
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const ProductsPage = () => {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Aluminum Foil',
    thickness: '11 Micron',
    width: '295mm',
    image_url: '',
    features: '',
    variants: '250ml|SKU-250|120|0|100\n500ml|SKU-500|220|0|80',
  });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getProducts({ page: 1, page_size: 100 });
      setRows(response.data.items || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const createProduct = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      toast.error('Name and description are required'); return;
    }
    if (!form.image_url.trim()) {
      toast.error('Please upload a product image'); return;
    }
    const variants = form.variants.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [size, sku, price, discountPrice, stock] = line.split('|').map(cell => (cell || '').trim());
      return {
        size, sku,
        price: Number(price),
        discount_price: discountPrice ? Number(discountPrice) : null,
        stock_quantity: Number(stock || 0),
        in_stock: Number(stock || 0) > 0,
      };
    });
    if (!variants.length || variants.some(v => !v.size || !v.sku || !v.price)) {
      toast.error('Variants format invalid. Use size|sku|price|discount|stock'); return;
    }
    try {
      setSaving(true);
      await adminApi.createProduct({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        features: form.features.split(',').map(f => f.trim()).filter(Boolean),
        variants,
      });
      toast.success('Catalog updated successfully');
      setShowForm(false);
      fetchRows();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter(r => 
    !search || 
    r.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.batch_no?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    skus: rows.length,
    volume: rows.reduce((acc, curr) => acc + (curr.units_sold || 0), 0),
    value: rows.reduce((acc, curr) => acc + (curr.stock_quantity * curr.price), 0),
    lowStock: rows.filter(r => r.stock_quantity <= 10).length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-600" />
            Product Catalog
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage inventories and item specifications.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowForm(!showForm)} className="rounded-xl flex items-center gap-2 px-6">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancel' : 'Add Item'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total SKUs</div>
            <div className="text-2xl font-black text-slate-900">{stats.skus}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Volume</div>
            <div className="text-2xl font-black text-slate-900">{stats.volume}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Value</div>
            <div className="text-2xl font-black text-slate-900">₹{Math.round(stats.value/1000)}k</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Low Stock</div>
            <div className="text-2xl font-black text-slate-900">{stats.lowStock}</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-in slide-in-from-top duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8">
             <div className="w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
          </div>
          
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Product Details
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Title</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="e.g., Ultra-Hold Foil Roll" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <textarea rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="Technical details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thickness</label>
                   <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" value={form.thickness} onChange={e => setForm({...form, thickness: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Width</label>
                   <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" value={form.width} onChange={e => setForm({...form, width: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Image</label>
                <div className="flex gap-4">
                  <div className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all ${form.image_url ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                    {form.image_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Image Ready</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-300" />
                        <input type="file" className="hidden" id="img-up" onChange={e => setImageFile(e.target.files?.[0])} />
                        <label htmlFor="img-up" className="cursor-pointer text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Choose File</label>
                      </div>
                    )}
                  </div>
                  {imageFile && !form.image_url && (
                    <Button disabled={imageUploading} onClick={async () => {
                      setImageUploading(true);
                      try {
                        const res = await adminApi.uploadProductImage(imageFile);
                        setForm({...form, image_url: `${process.env.REACT_APP_BACKEND_URL}${res.data.url}`});
                        toast.success('Asset synced');
                      } catch (err) { toast.error(err.message); }
                      finally { setImageUploading(false); }
                    }} className="h-auto px-4 rounded-2xl text-[10px] uppercase font-black tracking-widest">
                      {imageUploading ? 'Uploading...' : 'Confirm Asset'}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variant Inventory Strategy (Size | SKU | Price | Discount | Stock)</label>
                <textarea rows={5} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
             <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl font-bold">Discard</Button>
             <Button disabled={saving} onClick={createProduct} className="rounded-xl px-12 font-black uppercase tracking-widest shadow-lg shadow-indigo-200">
               {saving ? 'Processing...' : 'Add Product'}
             </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">SKU Code</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Price</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Stock Level</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Sales</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                         {row.image_url ? (
                           <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300"><Box className="w-5 h-5" /></div>
                         )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{row.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{row.size} • {row.thickness}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">{row.batch_no}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-sm font-black text-slate-800">₹{Number(row.price || 0).toLocaleString()}</div>
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
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium italic">
              Catalog search returned zero results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
