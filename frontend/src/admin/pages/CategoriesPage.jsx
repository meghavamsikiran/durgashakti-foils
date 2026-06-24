import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import { Layers, Plus, Edit, Trash2, ShieldAlert, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const CategoriesPage = () => {
  const [categories, setCategories] = useState(() => {
    const cached = adminService.getCached('/admin/categories');
    return cached?.data || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/categories');
    return !cached;
  });
  const [name, setName] = useState('');
  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState(false);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDiscountEnabled, setEditingDiscountEnabled] = useState(false);
  const [editingDiscountPercent, setEditingDiscountPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async (isSilent = false) => {
    try {
      setError(null);
      if (!isSilent) {
        const cached = adminService.getCached('/admin/categories');
        if (!cached) setLoading(true);
      }
      const res = await adminService.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      setCategories(prev => {
        if (!prev || prev.length === 0) {
          setError(err.message || 'Failed to load categories. Please try again.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      await adminService.createCategory({ 
        name: name.trim(),
        global_discount_enabled: globalDiscountEnabled,
        global_discount_percent: globalDiscountEnabled ? globalDiscountPercent : 0
      });
      toast.success('Category added successfully');
      setName('');
      setGlobalDiscountEnabled(false);
      setGlobalDiscountPercent(0);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (cat) => {
    const nextStatus = !cat.is_active;
    // Update state instantly for a premium responsive feel
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: nextStatus } : c));
    toast.success(`Category ${nextStatus ? 'active' : 'inactive'} successfully`);
    
    try {
      await adminService.updateCategory(cat.id, { is_active: nextStatus });
    } catch (err) {
      // Revert if failed
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !nextStatus } : c));
      toast.error('Failed to toggle category status');
    }
  };

  const handleEditSave = async (id) => {
    if (!editingName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    const oldCategories = [...categories];
    const updatedCategory = {
      name: editingName.trim(),
      global_discount_enabled: editingDiscountEnabled,
      global_discount_percent: editingDiscountEnabled ? Number(editingDiscountPercent) : 0
    };

    // Update state instantly for a responsive feel
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedCategory } : c));
    setEditingId(null);
    setEditingName('');
    setEditingDiscountEnabled(false);
    setEditingDiscountPercent(0);

    try {
      setSubmitting(true);
      await adminService.updateCategory(id, updatedCategory);
      toast.success('Category updated successfully');
      fetchCategories(true);
    } catch (err) {
      setCategories(oldCategories);
      toast.error(err.response?.data?.detail || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Any products currently referencing this category will lose the association.')) {
      return;
    }

    try {
      await adminService.deleteCategory(id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  if (loading && categories.length === 0) return <PageLoader />;

  if (error && categories.length === 0) return (
    <div className="text-center py-20 bg-white dark:bg-[#131B17] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-sm max-w-md mx-auto mt-12">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <p className="text-lg font-bold text-slate-800 dark:text-white">Failed to load categories</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      <button 
        onClick={() => fetchCategories()} 
        className="mt-6 px-6 py-2.5 bg-primary text-white font-bold uppercase tracking-wider rounded-xl text-xs hover:bg-[#1bb847] transition-all"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />
            Product Categories
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage product grouping, tags, and visibility rules.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 h-fit space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1">Create Category</h2>
            <p className="text-xs font-semibold text-slate-500">Add a new category for catalog filtering.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category Name</label>
              <input 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="e.g., Heavy Duty Foils" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required
              />
            </div>

            <div className="space-y-3 p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-emerald-400">Apply Global Discount</label>
                  <p className="text-[9px] text-slate-500 dark:text-emerald-300/70 mt-0.5">Enable to apply discount % to all products in this category</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalDiscountEnabled(!globalDiscountEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${globalDiscountEnabled ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalDiscountEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {globalDiscountEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-emerald-400">Discount Percent (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 dark:border-emerald-800 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white dark:bg-[#131B17] text-slate-800 dark:text-white"
                    placeholder="e.g., 10, 15.5" 
                    value={globalDiscountPercent} 
                    onChange={e => setGlobalDiscountPercent(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full rounded-xl py-3 font-black uppercase tracking-widest shadow-md shadow-emerald-glow flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Adding...' : 'Add Category'}
            </Button>
          </form>
        </div>

        {/* Right Side: Category List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Categories List</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1 rounded-full border">
              {categories.length} Category{categories.length !== 1 ? 'ies' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[800px] lg:min-w-full">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Global Discount</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      {editingId === cat.id ? (
                        <input 
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none w-full max-w-xs"
                          value={editingName} 
                          onChange={e => setEditingName(e.target.value)} 
                        />
                      ) : (
                        <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                          {cat.name}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      {editingId === cat.id ? (
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDiscountEnabled(!editingDiscountEnabled)}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${editingDiscountEnabled ? 'bg-primary' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${editingDiscountEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          {editingDiscountEnabled && (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                              value={editingDiscountPercent}
                              onChange={e => setEditingDiscountPercent(Number(e.target.value))}
                            />
                          )}
                        </div>
                      ) : (
                        <div>
                          {cat.global_discount_enabled ? (
                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
                              {cat.global_discount_percent}% OFF
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No Global</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => handleToggle(cat)}
                        className="inline-flex items-center gap-2 outline-none"
                      >
                        {cat.is_active ? (
                          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === cat.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEditSave(cat.id)} className="rounded-lg px-3 text-xs">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-lg text-xs">Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                                setEditingDiscountEnabled(cat.global_discount_enabled || false);
                                setEditingDiscountPercent(cat.global_discount_percent || 0);
                              }} 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(cat.id)} 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-rose-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium italic">
                      No categories created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
