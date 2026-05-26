import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  Shield, Activity, Search, ChevronDown, ChevronUp,
  Fingerprint, Clock, User, HardDrive, Filter,
  AlertTriangle, CheckCircle2, RefreshCw, Eye, Download
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import TablePagination from '../../components/ui/TablePagination';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useProgress } from '../../components/ui/ProgressToast';

const PAGE_SIZE = 25;

const AuditLogsPage = () => {
  const { hasPermission } = useAuth();
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached('/admin/audit-logs', { page: 1, limit: PAGE_SIZE, search: '' });
    return cached?.data?.items || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/audit-logs', { page: 1, limit: PAGE_SIZE, search: '' });
    return !cached;
  });
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached('/admin/audit-logs', { page: 1, limit: PAGE_SIZE, search: '' });
    return cached?.data?.total || 0;
  });
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.data?.metrics || null;
  });

  const load = useCallback(async (pageNum = 1) => {
    const params = { page: pageNum, limit: PAGE_SIZE, search };
    const cached = adminService.getCached('/admin/audit-logs', params);
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getAuditLogs(params);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setPage(pageNum);
      adminService.getDashboardMetrics().then((mRes) => {
        setMetrics(mRes.data?.metrics || null);
      }).catch(() => {});
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadSilent = useCallback(async (pageNum = 1) => {
    try {
      const response = await apiClient.get('/admin/audit-logs', { params: { page: pageNum, limit: PAGE_SIZE, search }, silent: true });
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch {
      // Ignore background errors
    }
  }, [search]);

  const handleExport = useCallback(async () => {
    const progressId = startProgress({
      label: 'audit_logs.xlsx',
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing system audit logs...',
    });
    try {
      updateProgress(progressId, { progress: 30, message: 'Fetching logs from server...' });
      const res = await adminService.exportAuditLogs();
      updateProgress(progressId, { progress: 70, message: 'Processing report data...' });
      const contentDisposition = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)|filename="?([^";]+)"?/);
      const filename = filenameMatch?.[1] || filenameMatch?.[2] || 'audit_logs.xlsx';
      const safeFilename = decodeURIComponent(filename).replace(/^["']|["']$/g, '') || 'audit_logs.xlsx';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: res.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.visibility = 'hidden';
      link.href = url;
      link.download = safeFilename;
      document.body.appendChild(link);
      updateProgress(progressId, { progress: 90, message: 'Downloading...' });
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      finishProgress(progressId, { message: 'Audit logs exported successfully!' });
    } catch (error) {
      console.error('Failed to download audit logs', error);
      finishProgress(progressId, { message: 'Failed to download audit logs', isError: true });
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        toast.error('The server is taking longer to respond. Please wait 30 seconds and try again.');
      } else if (error.message?.includes('Network Error') || error.message?.includes('Network') || !navigator.onLine) {
        toast.error('🌐 Live server is waking from sleep mode. Please wait 30 seconds and refresh!');
      } else {
        toast.error('Audit log download failed. Please refresh and try again.');
      }
    }
  }, [startProgress, updateProgress, finishProgress]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const actionInfo = (action) => {
    if (action?.includes('DELETE')) return { color: 'text-rose-600 bg-rose-50', icon: AlertTriangle };
    if (action?.includes('CREATE') || action?.includes('SEED')) return { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 };
    if (action?.includes('UPDATE') || action?.includes('RESET')) return { color: 'text-primary bg-primary/10', icon: RefreshCw };
    return { color: 'text-slate-600 bg-slate-50', icon: Activity };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 100);
    return () => clearTimeout(timer);
  }, [search, load]);

  const filtered = rows;

  const stats = {
    totalEvents: total,
    securityEvents: metrics?.security_events_count || 0,
    destructive: metrics?.destructive_actions_count || 0,
    recentRate: rows.length
  };

  const formatKey = (key) => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (loading && rows.length === 0) return <PageLoader message="Loading System Logs..." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            System Logs
          </h1>
          <p className="text-slate-500 mt-1 font-medium">A record of all changes made in the system.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search Logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <Button variant="outline" type="button" className="rounded-xl ml-3" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Logs</div>
              <div className="text-2xl font-black text-slate-900">{stats.totalEvents}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Login Events</div>
              <div className="text-2xl font-black text-slate-900">{stats.securityEvents}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Changes</div>
              <div className="text-2xl font-black text-slate-900">{stats.destructive}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary-container text-secondary rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Logs</div>
              <div className="text-2xl font-black text-slate-900">{stats.recentRate}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Target</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => {
                const info = actionInfo(row.action);
                const ActionIcon = info.icon;
                const isExpanded = expandedRow === row.id;
                const metadata = row.metadata || {};
                const actorName = row.actor_name || metadata.actor_name || 'System Process';
                const actorRole = row.actor_role_label || metadata.actor_role_label || row.actor_role || metadata.actor_role || 'SYSTEM';
                const actorEmail = row.actor_email || metadata.actor_email;
                
                return (
                  <React.Fragment key={row.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors group ${isExpanded ? 'bg-primary/5' : ''}`}>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${info.color}`}>
                          <ActionIcon className="w-3 h-3" />
                          {row.action}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-slate-700 capitalize">{row.target_type}</div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                          {row.target_id?.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(row.created_at)}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:bg-white transition-all shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="5" className="px-12 py-8">
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-primary" />
                                    Log Details
                                 </h4>
                                 <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="min-w-full">
                                       <tbody className="divide-y divide-slate-50">
                                          {row.metadata && Object.keys(row.metadata).length > 0 ? (
                                            Object.entries(row.metadata).map(([k, v]) => (
                                              <tr key={k}>
                                                 <td className="px-4 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50/30 w-1/3 border-r border-slate-50">{formatKey(k)}</td>
                                                 <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                                   {typeof v === 'boolean' ? (v ? 'Enabled' : 'Disabled') : String(v)}
                                                 </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr><td className="p-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">No details found.</td></tr>
                                          )}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-4 h-4 text-secondary" />
                                    User Details
                                 </h4>
                                 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="space-y-4">
                                       <div>
                                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">User ID</div>
                                          <div className="text-xs font-mono font-bold text-slate-600 bg-slate-50 p-2 rounded-lg truncate">{row.actor_id || 'SYSTEM_PROCESS'}</div>
                                       </div>
                                       <div>
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Updated By Name & Role</div>
                                          <div className="text-xs font-black text-slate-800 bg-primary/5 border border-primary/20 p-2.5 rounded-xl truncate flex items-center gap-2">
                                             <User className="w-3.5 h-3.5 text-primary" />
                                             {actorName} ({actorRole.replaceAll('_', ' ')})
                                          </div>
                                       </div>
                                       {actorEmail && (
                                          <div>
                                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Actor Email</div>
                                             <div className="text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-xl truncate">{actorEmail}</div>
                                          </div>
                                       )}
                                       <div>
                                       </div>
                                       <div>
                                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Target ID</div>
                                          <div className="text-xs font-mono font-bold text-slate-600 bg-slate-50 p-2 rounded-lg truncate">{row.target_id || 'N/A'}</div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No system logs found matching the search criteria.
            </div>
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={(p) => { load(p); setExpandedRow(null); }}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
};

export default AuditLogsPage;
