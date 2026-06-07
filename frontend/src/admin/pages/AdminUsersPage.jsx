import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  Users, ShieldCheck, UserPlus, Search, 
  Mail, Phone, Lock, Edit3, Trash2,
  CheckCircle2, XCircle, ShieldAlert, X,
  CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PERMISSION_GROUPS, ROLE_TEMPLATES, getAllPermissionKeys } from '../constants/rbac';
import PageLoader from '../../components/ui/PageLoader';
import TablePagination from '../../components/ui/TablePagination';
import { useAuth } from '../../contexts/AuthContext';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const PermissionsSelector = ({ selectedPermissions, onChange, role }) => {
  const allKeys = getAllPermissionKeys();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [expandedGroup, setExpandedGroup] = React.useState(null);
  
  const handleToggle = (id) => {
    if (isSuperAdmin) return;
    const next = { ...selectedPermissions, [id]: !Boolean(selectedPermissions[id]) };
    onChange(next);
  };

  const handleToggleAll = () => {
    if (isSuperAdmin) return;
    const allSelected = allKeys.every(k => Boolean(selectedPermissions[k]));
    const next = {};
    if (!allSelected) {
      allKeys.forEach(k => (next[k] = true));
    }
    onChange(next);
  };

  if (isSuperAdmin) {
    return (
      <div className="p-6 rounded-xl bg-secondary-container border border-outline-variant flex items-center gap-4">
        <ShieldCheck className="w-8 h-8 text-secondary" />
        <div>
          <h4 className="font-bold text-secondary">Super Admin Access</h4>
          <p className="text-sm text-secondary">Super Admins inherently possess all system permissions. Granular restrictions do not apply.</p>
        </div>
      </div>
    );
  }

  const allSelected = allKeys.every(k => Boolean(selectedPermissions[k]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Permissions</h3>
          <p className="text-xs text-slate-500">Configure module access for this administrator. Click group titles to expand.</p>
        </div>
        <button type="button" onClick={handleToggleAll} className="text-xs font-bold text-primary hover:text-primary flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg">
          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {PERMISSION_GROUPS.map(group => {
          const groupCount = group.permissions.filter(p => Boolean(selectedPermissions[p.id])).length;
          const allGroupSelected = group.permissions.every(p => Boolean(selectedPermissions[p.id]));
          const isExpanded = expandedGroup === group.title;
          const permissionButtonText = allGroupSelected ? 'All' : groupCount === 0 ? 'None' : 'Partial';
          const permissionButtonTitle = allGroupSelected ? 'Deselect all' : groupCount === 0 ? 'Select all' : 'Select remaining';
          
          const handleToggleGroup = () => {
            const next = { ...selectedPermissions };
            if (allGroupSelected) {
              group.permissions.forEach(p => next[p.id] = false);
            } else {
              group.permissions.forEach(p => next[p.id] = true);
            }
            onChange(next);
          };
          
          return (
            <div key={group.title} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="w-full flex items-center justify-between p-3 bg-slate-50/50 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.title)}
                  className="flex-1 flex items-center gap-3 hover:opacity-75 transition-opacity text-left"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">{group.title}</h4>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{groupCount}/{group.permissions.length}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleToggleGroup}
                  className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 transition-all border border-primary/20"
                  title={permissionButtonTitle}
                >
                  {allGroupSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  <span className="hidden sm:inline">{permissionButtonText}</span>
                </button>
              </div>
              
              {isExpanded && (
                <div className="border-t border-slate-200 p-3 space-y-2 bg-white">
                  {group.permissions.map(perm => {
                    const checked = !!selectedPermissions[perm.id];
                    const isSelected = Boolean(selectedPermissions[perm.id]);
                    return (
                      <div 
                        key={perm.id}
                        onClick={() => handleToggle(perm.id)}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${checked ? 'text-primary' : 'text-slate-700'}`}>{perm.label}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{perm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


const TEMPLATE_COLORS = {
  OPERATIONS_ADMIN: 'from-secondary to-secondary',
  ORDER_MANAGER: 'from-secondary to-emerald-hover',
  PRODUCT_MANAGER: 'from-emerald-500 to-teal-600',
  INVENTORY_MANAGER: 'from-amber-500 to-orange-600',
  CUSTOMER_SUPPORT: 'from-pink-500 to-rose-600',
  SHIPPING_MANAGER: 'from-cyan-500 to-sky-600',
  FINANCE_ADMIN: 'from-green-500 to-emerald-600',
  ANALYTICS_VIEWER: 'from-secondary to-secondary',
  CUSTOM: 'from-slate-400 to-slate-500'
};

const RoleTemplateSelector = ({ selectedTemplate, onSelectTemplate }) => {
  const templates = Object.entries(ROLE_TEMPLATES);
  return (
    <div className="space-y-3 mb-6">
      <div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Role Template</h3>
        <p className="text-xs text-slate-500">Choose a predefined role to auto-assign permissions, or select Custom.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {templates.map(([key, tmpl]) => {
          const isActive = selectedTemplate === key;
          const gradientClass = TEMPLATE_COLORS[key] || 'from-slate-400 to-slate-500';
          const permCount = Object.keys(tmpl.permissions || {}).length;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectTemplate(key)}
              className={`relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] bg-gradient-to-br ${gradientClass} ${isActive ? 'opacity-20' : 'opacity-10'}`} />
              <div className="relative z-10">
                <div className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-primary' : 'text-slate-700'}`}>
                  {tmpl.label}
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {key === 'CUSTOM' ? 'Manual selection' : `${permCount} permissions`}
                </div>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <CheckSquare className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PERMISSION_META_KEYS = new Set(['is_first_login', 'role_template']);

const getPermissionCount = (permissions = {}) =>
  Object.entries(permissions).filter(([key, value]) => !PERMISSION_META_KEYS.has(key) && value === true).length;

const normalizeTemplateKey = (key) => (ROLE_TEMPLATES[key] ? key : 'CUSTOM');

const getTemplateKeyForUser = (user) => {
  if (user?.role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  return normalizeTemplateKey(user?.permissions?.role_template || 'CUSTOM');
};

const permissionsWithTemplate = (permissions = {}, templateKey = 'CUSTOM') => ({
  ...permissions,
  role_template: normalizeTemplateKey(templateKey)
});

const templatePermissions = (templateKey) => {
  const key = normalizeTemplateKey(templateKey);
  return permissionsWithTemplate({ ...(ROLE_TEMPLATES[key]?.permissions || {}) }, key);
};

const RoleTemplateSelect = ({ value, onChange, disabled = false }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role Template</label>
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
      >
        {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
          <option key={key} value={key}>{tmpl.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  </div>
);


const AdminUsersPage = () => {
  const PAGE_SIZE = 10;
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached('/superadmin/admins');
    return cached?.data || [];
  });
  const [loading, setLoading] = useState(() => {
    const cachedUsers = adminService.getCached('/superadmin/admins');
    const cachedMe = adminService.getCached('/auth/me');
    return !(cachedUsers && cachedMe);
  });
  
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: templatePermissions('CUSTOM') });
  const [selectedTemplate, setSelectedTemplate] = useState('CUSTOM');
  const [creating, setCreating] = useState(false);
  
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', role: '', permissions: templatePermissions('CUSTOM') });
  const [editSelectedTemplate, setEditSelectedTemplate] = useState('CUSTOM');
  const [editSaving, setEditSaving] = useState(false);
  
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [me, setMe] = useState(() => {
    const cached = adminService.getCached('/auth/me');
    return cached?.data || null;
  });

  const load = useCallback(async () => {
    const cachedUsers = adminService.getCached('/superadmin/admins');
    const cachedMe = adminService.getCached('/auth/me');
    if (!(cachedUsers && cachedMe)) {
      setLoading(true);
    }
    try {
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

  const loadSilent = useCallback(async () => {
    try {
      const [usersRes, meRes] = await Promise.all([
        apiClient.get('/superadmin/admins', { silent: true }),
        apiClient.get('/auth/me', { silent: true })
      ]);
      setRows(usersRes.data || []);
      setMe(meRes.data);
    } catch (err) {
      // Ignore background errors
    }
  }, []);

  useEffect(() => {
    load();
    loadSilent();
  }, [load, loadSilent]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.role) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      setCreating(true);
      await adminService.createAdminUser({
        ...form,
        permissions: permissionsWithTemplate(form.permissions, selectedTemplate),
        role_template: selectedTemplate
      });
      toast.success('Admin created successfully');
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: templatePermissions('CUSTOM') });
      setSelectedTemplate('CUSTOM');
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
      const payload = editForm.role === 'SUPER_ADMIN'
        ? { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, role: editForm.role }
        : {
            ...editForm,
            permissions: permissionsWithTemplate(editForm.permissions, editSelectedTemplate),
            role_template: editSelectedTemplate
          };
      await adminService.updateAdminUser(editModal.id, payload);
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
    const nextStatus = row.is_active === false;
    const previousRows = rows;
    setRows((prev) => prev.map((admin) => (
      admin.id === row.id ? { ...admin, is_active: nextStatus } : admin
    )));
    toast.success(`Admin ${nextStatus ? 'enabled' : 'disabled'}`);
    try {
      await adminService.updateAdminStatus(row.id, nextStatus);
      loadSilent();
    } catch (err) {
      setRows(previousRows);
      toast.error(err.message);
    }
  };

  const filtered = rows.filter(a => 
    !search || 
    a.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFilteredPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalFilteredPages);
  const paginatedAdmins = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = {
    total: rows.length,
    super: rows.filter(a => a.role === 'SUPER_ADMIN').length,
    active: rows.filter(a => a.is_active !== false).length,
    inactive: rows.filter(a => a.is_active === false).length,
  };

  if (loading && rows.length === 0) return <PageLoader message="Loading Administrators..." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
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
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <Button onClick={() => { setShowCreate(true); setForm({ full_name: '', email: '', phone: '', password: '', role: 'admin', permissions: templatePermissions('CUSTOM') }); setSelectedTemplate('CUSTOM'); }} className="rounded-xl flex items-center gap-2 px-6 shadow-lg shadow-emerald-glow hover:shadow-emerald-glow transition-all">
            <UserPlus className="w-4 h-4" />
            Add New Admin
          </Button>
        </div>
      </div>

      {hasPermission('view_analytics') && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Users</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.total}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-secondary-container text-secondary rounded-lg flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Super Admins</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.super}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status: Active</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.active}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Disabled Accounts</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.inactive}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)]">
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Admin Name</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedAdmins.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{user.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-1">
                      Admin ID: {(user.admin_id || user.id || '').slice(0, 12)}
                    </div>
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
                      user.role === 'SUPER_ADMIN' ? 'bg-secondary-container text-secondary' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {user.role_label || ROLE_TEMPLATES[getTemplateKeyForUser(user)]?.label || user.role?.replace('_', ' ')}
                    </span>
                    {user.role !== 'SUPER_ADMIN' && user.permissions && (
                      <div className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wider">
                        {user.permission_count ?? getPermissionCount(user.permissions)} Permissions
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
                      <button onClick={() => { const templateKey = getTemplateKeyForUser(user); setEditModal(user); setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || '', role: user.role, permissions: permissionsWithTemplate(user.permissions || {}, templateKey) }); setEditSelectedTemplate(templateKey === 'SUPER_ADMIN' ? 'CUSTOM' : templateKey); }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all" title="Edit Admin">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button onClick={() => { setResetModal(user); setNewPassword(''); }}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Reset Password">
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      {user.id !== me?.id && user.role !== 'SUPER_ADMIN' && (
                        <button onClick={() => setDeleteTarget(user)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete Admin">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No administrator accounts found.
            </div>
          )}
        </div>
        {filtered.length > 0 && (
          <TablePagination
            currentPage={safePage}
            totalPages={totalFilteredPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      {/* Add Modal */}
      {showCreate && createPortal((
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-5xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Add New Admin</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={create} className="space-y-8" autoComplete="off">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                    <input required name="full_name_new" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Full name of admin..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</label>
                    <input type="email" required name="email_new" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@durgashakti.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone Number</label>
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      value={form.phone}
                      onChange={val => setForm({...form, phone: val || ''})}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none"
                      numberInputProps={{
                        className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm text-slate-800 font-medium",
                        placeholder: "Enter phone number"
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                    <input type="password" required name="password_new" autoComplete="new-password" 
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Secure password..." />
                  </div>
                  <RoleTemplateSelect
                    value={selectedTemplate}
                    onChange={(key) => {
                      setSelectedTemplate(key);
                      setForm({ ...form, permissions: templatePermissions(key) });
                    }}
                  />
                </div>
              </div>

              <div>
                <PermissionsSelector 
                  selectedPermissions={form.permissions} 
                  onChange={(perms) => { setForm({...form, permissions: permissionsWithTemplate(perms, 'CUSTOM')}); setSelectedTemplate('CUSTOM'); }}
                  role={form.role}
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Discard
                </button>
                <button type="submit" disabled={creating}
                  className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all">
                  {creating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Edit Modal */}
      {editModal && createPortal((
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-5xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Admin</h2>
              <button onClick={() => setEditModal(null)} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</label>
                    <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone Number</label>
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      value={editForm.phone}
                      onChange={val => setEditForm({...editForm, phone: val || ''})}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none"
                      numberInputProps={{
                        className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm text-slate-800 font-medium",
                        placeholder: "Enter phone number"
                      }}
                    />
                  </div>
                  {editForm.role === 'SUPER_ADMIN' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                      <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 font-bold text-slate-500 select-none">
                        SUPER ADMIN
                      </div>
                    </div>
                  ) : (
                    <RoleTemplateSelect
                      value={editSelectedTemplate}
                      onChange={(key) => {
                        setEditSelectedTemplate(key);
                        setEditForm({ ...editForm, permissions: templatePermissions(key) });
                      }}
                    />
                  )}
                </div>
              </div>

              <div>
                <PermissionsSelector 
                  selectedPermissions={editForm.permissions} 
                  onChange={(perms) => { setEditForm({...editForm, permissions: permissionsWithTemplate(perms, 'CUSTOM')}); setEditSelectedTemplate('CUSTOM'); }}
                  role={editForm.role}
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button onClick={() => setEditModal(null)} className="px-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleEdit} disabled={editSaving} className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow transition-all">
                   {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Reset Password Modal */}
      {resetModal && createPortal((
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Reset Password</h2>
            <p className="text-sm text-slate-500 mb-6">Updating password for <span className="font-bold text-primary">{resetModal.full_name}</span></p>
            <div className="space-y-6">
              <input type="password" autoFocus placeholder="New password..." autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <div className="flex gap-4">
                <button onClick={(e) => { e.stopPropagation(); setResetModal(null); }} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={(e) => { e.stopPropagation(); handleResetPassword(); }} disabled={resetSaving} className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow">
                   {resetSaving ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Delete Admin Modal */}
      {deleteTarget && createPortal((
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur p-4">
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
      ), document.body)}
    </div>
  );
};

export default AdminUsersPage;
