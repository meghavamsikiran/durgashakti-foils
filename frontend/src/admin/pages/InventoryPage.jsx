import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminApi from '../services/adminApi';
import { 
  Boxes, TrendingDown, IndianRupee, BarChart3, 
  Search, RefreshCw, PlusCircle, MinusCircle, 
  X, AlertTriangle, ArrowRight, PackageOpen,
  LayoutGrid
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const InventoryPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getInventory();
      setRows(response.data.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdjust = async (direction) => {
    const delta = parseInt(adjustQty, 10);
    if (!delta || delta <= 0) { toast.error('Please enter a valid quantity'); return; }
    const finalDelta = direction === 'remove' ? -delta : delta;
    try {
      setSaving(true);
      await adminApi.adjustInventory(adjustModal.id, { delta_quantity: finalDelta });
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

  const filtered = rows.filter(r =>
    !search || 
    r.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalValue: rows.reduce((s, r) => s + (r.stock_quantity * r.price), 0),
    outOfStock: rows.filter(r => r.stock_quantity <= 0).length,
    lowStock: rows.filter(r => r.stock_quantity > 0 && r.stock_quantity <= r.low_stock_threshold).length,
    soldVolume: rows.reduce((s, r) => s + r.units_sold, 0),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Boxes className="w-8 h-8 text-indigo-600" />
            Inventory
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor and update your product stock levels.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <Button onClick={load} variant="outline" className="rounded-xl p-2.5 bg-white hover:bg-slate-50 border-slate-100 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Value</div>
            <div className="text-2xl font-black text-slate-900">₹{(stats.totalValue / 1000).toFixed(1)}k</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Low Stock</div>
            <div className="text-2xl font-black text-slate-900">{stats.outOfStock + stats.lowStock}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Units Sold</div>
            <div className="text-2xl font-black text-slate-900">{stats.soldVolume}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</div>
            <div className="text-2xl font-black text-slate-900">{rows.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Product Name</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">SKU Code</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Price</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Quantity</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Stock Status</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-800">{row.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                      {row.size} • {row.category}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">{row.sku}</div>
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
                      className="rounded-xl h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-100 hover:shadow-indigo-200 transition-all"
                    >
                      Update Stock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium italic">
              No products found.
            </div>
          )}
        </div>
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-100 scale-in-center overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Update Stock Quantity</h2>
              <button onClick={() => setAdjustModal(null)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-8">
               <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</div>
                  <div className="text-lg font-black text-slate-900">{adjustModal.stock_quantity} Units</div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change Quantity</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
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
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-8 leading-relaxed">
              All stock changes are logged for records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
