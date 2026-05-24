import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import { Layers, Plus, Edit, Trash2, ShieldAlert, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import PageLoader from '../../components/ui/PageLoader';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      toast.error('Failed to load categories');
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
      await adminService.createCategory({ name: name.trim() });
      toast.success('Category added successfully');
      setName('');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (cat) => {
    const nextStatus = !cat.is_active;
    try {
      await adminService.updateCategory(cat.id, { is_active: nextStatus });
      toast.success(`Category ${nextStatus ? 'enabled' : 'disabled'} successfully`);
      
      // Update state instantly for a premium responsive feel
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: nextStatus } : c));
    } catch (err) {
      toast.error('Failed to toggle category status');
    }
  };

  const handleEditSave = async (id) => {
    if (!editingName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      await adminService.updateCategory(id, { name: editingName.trim() });
      toast.success('Category updated successfully');
      setEditingId(null);
      setEditingName('');
      fetchCategories();
    } catch (err) {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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
            <table className="min-w-full">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      {editingId === cat.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
                            value={editingName} 
                            onChange={e => setEditingName(e.target.value)} 
                          />
                          <Button size="sm" onClick={() => handleEditSave(cat.id)} className="rounded-lg px-3">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-lg">Cancel</Button>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                          {cat.name}
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
                            Enabled
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Disabled
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditingName(cat.name);
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
                      </div>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-medium italic">
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
