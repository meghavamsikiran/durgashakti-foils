import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import { 
  Users, ShieldCheck, UserPlus, Search, 
  Mail, Phone, Lock, Edit3, Trash2,
  CheckCircle2, XCircle, ShieldAlert, X,
  CheckSquare, Square
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '../constants/rbac';

const PermissionsSelector = ({ selectedPermissions, onChange, role }) => {
  const allKeys = getAllPermissionKeys();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  
  const handleToggle = (id) => {
    if (isSuperAdmin) return;
    const next = { ...selectedPermissions, [id]: !selectedPermissions[id] };
    onChange(next);
  };

  const handleToggleAll = () => {
    if (isSuperAdmin) return;
    const allSelected = allKeys.every(k => selectedPermissions[k]);
    const next = {};
    if (!allSelected) {
      allKeys.forEach(k => next[k] = true);
    }
    onChange(next);
  };

  if (isSuperAdmin) {
    return (
      <div className="p-6 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-4">
        <ShieldCheck className="w-8 h-8 text-purple-600" />
        <div>
          <h4 className="font-bold text-purple-900">Super Admin Access</h4>
          <p className="text-sm text-purple-700">Super Admins inherently possess all system permissions. Granular restrictions do not apply.</p>
        </div>
      </div>
    );
  }

  const allSelected = allKeys.every(k => selectedPermissions[k]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Permissions</h3>
          <p className="text-xs text-slate-500">Configure granular module access for this administrator.</p>
        </div>
        <button type="button" onClick={handleToggleAll} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg">
          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-6">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.title} className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.title}</h4>
            <div className="grid grid-cols-1 gap-3">
              {group.permissions.map(perm => {
                const checked = !!selectedPermissions[perm.id];
                return (
                  <div 
                    key={perm.id}
                    onClick={() => handleToggle(perm.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      checked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                    }`}>
                      {checked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${checked ? 'text-indigo-900' : 'text-slate-700'}`}>{perm.label}</p>
                      <p className="text-xs text-slate-500">{perm.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const AdminUsersPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: {} });
  const [creating, setCreating] = useState(false);
  
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', role: '', permissions: {} });
  const [editSaving, setEditSaving] = useState(false);
  
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  
  const [search, setSearch] = useState('');
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, meRes] = await Promise.all([
        adminService.getAdminUsers(),
        adminService.getMe()
      ]);
      setRows(usersRes.data || []);
      setMe(meRes.data);
    } catch (err) {
      toast.error(err.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.role) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      setCreating(true);
      await adminService.createAdminUser(form);
      toast.success('Admin created successfully');
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: {} });
      setShowCreate(false);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    try {
      setEditSaving(true);
      await adminService.updateAdminUser(editModal.id, editForm);
      toast.success('Admin info updated');
      setEditModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) { toast.error('Please enter a new password'); return; }
    try {
      setResetSaving(true);
      await adminService.resetAdminPassword(resetModal.id, newPassword);
      toast.success('Password updated successfully');
      setResetModal(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget.id === me?.id) {
      toast.error('You cannot delete your own account');
      setDeleteTarget(null);
      return;
    }
    try {
      setDeleteSaving(true);
      await adminService.deleteAdminUser(deleteTarget.id);
      toast.success('Admin account deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    if (row.id === me?.id) {
      toast.error('You cannot disable your own account');
      return;
    }
    try {
      await adminService.updateAdminStatus(row.id, !row.is_active);
      toast.success(`Admin ${!row.is_active ? 'Enabled' : 'Disabled'}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = rows.filter(a => 
    !search || 
    a.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: rows.length,
    super: rows.filter(a => a.role === 'SUPER_ADMIN').length,
    active: rows.filter(a => a.is_active !== false).length,
    inactive: rows.filter(a => a.is_active === false).length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Admin Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Add and manage admin accounts and configure RBAC permissions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search Admins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <Button onClick={() => { setShowCreate(true); setForm({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: {} }); }} className="rounded-xl flex items-center gap-2 px-6 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all">
            <UserPlus className="w-4 h-4" />
            Add New Admin
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Users</div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Super Admins</div>
            <div className="text-2xl font-black text-slate-900">{stats.super}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status: Active</div>
            <div className="text-2xl font-black text-slate-900">{stats.active}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disabled Accounts</div>
            <div className="text-2xl font-black text-slate-900">{stats.inactive}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Admin Name</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{user.full_name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      {user.phone || '—'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                    {user.role !== 'SUPER_ADMIN' && user.permissions && (
                      <div className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wider">
                        {Object.values(user.permissions).filter(Boolean).length} Permissions
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => toggleStatus(user)}
                      disabled={user.id === me?.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        user.id === me?.id ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-500' :
                        user.is_active !== false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${user.id === me?.id ? 'bg-slate-400' : user.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      {user.is_active !== false ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditModal(user); setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || '', role: user.role, permissions: user.permissions || {} }); }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit Admin">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setResetModal(user); setNewPassword(''); }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Reset Password">
                        <Lock className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(user)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete Admin">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Add New Admin</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-8" autoComplete="off">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                      <input required name="full_name_new" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Full name of admin..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</label>
                      <input type="email" required name="email_new" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@durgashakti.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                        <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 font-bold text-slate-500 select-none">
                          ADMIN
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone Number</label>
                        <input name="phone_new" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                          value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                      <input type="password" required name="password_new" autoComplete="new-password" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Secure password..." />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <PermissionsSelector 
                  selectedPermissions={form.permissions} 
                  onChange={(perms) => setForm({...form, permissions: perms})}
                  role={form.role}
                />
              </div>
              
              <div className="col-span-1 md:col-span-2 flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Discard
                </button>
                <button type="submit" disabled={creating}
                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all">
                  {creating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Admin</h2>
              <button onClick={() => setEditModal(null)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4">Basic Information</h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                  <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                    <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 font-bold text-slate-500 select-none">
                      {editForm.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone Number</label>
                  <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="+91..." />
                </div>
              </div>

              <div>
                <PermissionsSelector 
                  selectedPermissions={editForm.permissions} 
                  onChange={(perms) => setEditForm({...editForm, permissions: perms})}
                  role={editForm.role}
                />
              </div>
              
              <div className="col-span-1 md:col-span-2 flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button onClick={() => setEditModal(null)} className="px-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleEdit} disabled={editSaving} className="px-8 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                   {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Reset Password</h2>
            <p className="text-sm text-slate-500 mb-6">Updating password for <span className="font-bold text-indigo-600">{resetModal.full_name}</span></p>
            <div className="space-y-6">
              <input type="password" autoFocus placeholder="New password..." autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <div className="flex gap-4">
                <button onClick={(e) => { e.stopPropagation(); setResetModal(null); }} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={(e) => { e.stopPropagation(); handleResetPassword(); }} disabled={resetSaving} className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                   {resetSaving ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Admin Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Delete Admin?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Are you sure you want to permanently delete <span className="font-bold text-slate-800">{deleteTarget.full_name}</span>? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(null); }} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={deleteSaving} className="flex-1 px-6 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">
                 {deleteSaving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
