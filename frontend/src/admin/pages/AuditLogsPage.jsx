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
        toast.error('The server is taking longer to respond. Please wait a moment and try again.');
      } else if (error.message?.includes('Network Error') || error.message?.includes('Network') || !navigator.onLine) {
        toast.error('Unable to reach the server right now. Please check your connection and try again.');
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

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading system logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            System Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">A record of all changes made in the system.</p>
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
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Logs</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{stats.totalEvents}</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Login Events</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{stats.securityEvents}</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Changes</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{stats.destructive}</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-secondary-container text-secondary rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Recent Logs</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{stats.recentRate}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`overflow-x-auto overflow-y-auto ${(hasPermission('view_analytics') && metrics) ? 'admin-table-container-audit-logs' : 'admin-table-container-standard'}`}>
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Performed By</th>
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
                const fieldDiffs = metadata.field_diffs || metadata.changes || [];
                
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
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          {actorName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {actorRole.replaceAll('_', ' ')}
                          </span>
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
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 animate-in fade-in duration-200">
                        <td colSpan="6" className="px-8 py-6">
                           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                              {/* Security Event Header Summary */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                 <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${info.color}`}>
                                       <ActionIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                       <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                          {row.action}
                                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                             {row.target_type || 'System Event'}
                                          </span>
                                       </h4>
                                       <p className="text-xs text-slate-500 font-medium mt-0.5">
                                          Audit Log Entry ID: <code className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{row.id}</code>
                                       </p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
                                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                                       {formatDate(row.created_at)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                       Exact Server Timestamp: {row.created_at ? new Date(row.created_at).toISOString() : 'N/A'}
                                    </div>
                                 </div>
                              </div>

                              {/* Field-Level Security Diffs Box */}
                              {fieldDiffs && fieldDiffs.length > 0 && (
                                 <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
                                    <div className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                                       <ShieldAlert className="w-4 h-4 text-emerald-700" />
                                       Field-Level Audit Diffs (Exact Modifications Tracked)
                                    </div>
                                    <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden divide-y divide-emerald-100">
                                       {fieldDiffs.map((diff, idx) => (
                                          <div key={idx} className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs">
                                             <div className="font-black text-slate-800 uppercase text-[10px] tracking-wider">
                                                {formatKey(diff.field || diff.name || `Field #${idx + 1}`)}
                                             </div>
                                             <div className="bg-rose-50 text-rose-800 border border-rose-200/80 p-2 rounded-lg font-mono text-[11px] break-all">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 block mb-0.5">Previous Value:</span>
                                                {String(diff.old_value !== undefined ? diff.old_value : '—')}
                                             </div>
                                             <div className="bg-emerald-50 text-emerald-900 border border-emerald-200/80 p-2 rounded-lg font-mono text-[11px] break-all">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 block mb-0.5">New Value:</span>
                                                {String(diff.new_value !== undefined ? diff.new_value : '—')}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 {/* Column 1: Action Details & Changes Payload */}
                                 <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                       <HardDrive className="w-4 h-4 text-emerald-600" />
                                       System Action & Metadata Payload
                                    </h4>
                                    <div className="bg-slate-50/80 rounded-xl border border-slate-200 overflow-hidden">
                                       {row.metadata && Object.keys(row.metadata).length > 0 ? (
                                         <table className="min-w-full divide-y divide-slate-100">
                                            <tbody>
                                               {Object.entries(row.metadata).map(([k, v]) => (
                                                 <tr key={k} className="hover:bg-slate-100/50 transition-colors">
                                                    <td className="px-4 py-2.5 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100/70 w-1/3 border-r border-slate-200/80">{formatKey(k)}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-800 font-semibold break-all">
                                                       {typeof v === 'object' && v !== null ? (
                                                         <pre className="text-[11px] font-mono bg-white p-2 rounded border border-slate-200 text-slate-700 overflow-x-auto">
                                                           {JSON.stringify(v, null, 2)}
                                                         </pre>
                                                       ) : typeof v === 'boolean' ? (
                                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                           {v ? 'ENABLED / TRUE' : 'DISABLED / FALSE'}
                                                         </span>
                                                       ) : String(v)}
                                                    </td>
                                                 </tr>
                                               ))}
                                            </tbody>
                                         </table>
                                       ) : (
                                         <div className="p-6 text-center text-xs text-slate-500 font-medium italic">
                                            No additional metadata payload recorded for this action.
                                         </div>
                                       )}
                                    </div>
                                 </div>

                                 {/* Column 2: User Audit & Target Context */}
                                 <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                       <User className="w-4 h-4 text-emerald-600" />
                                       User Audit & Target Context
                                    </h4>
                                    <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-5 space-y-4">
                                       <div className="grid grid-cols-2 gap-4">
                                          <div>
                                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performed By User</div>
                                             <div className="text-xs font-black text-slate-900 flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                                                <User className="w-3.5 h-3.5 text-emerald-600" />
                                                {actorName}
                                             </div>
                                          </div>
                                          <div>
                                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User Role</div>
                                             <div className="text-xs font-black text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                   {actorRole.replaceAll('_', ' ')}
                                                </span>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-2 gap-4">
                                          <div>
                                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User Email</div>
                                             <div className="text-xs font-bold text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 truncate">
                                                {actorEmail || 'System Automated Task'}
                                             </div>
                                          </div>
                                          <div>
                                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Actor User ID</div>
                                             <div className="text-xs font-mono font-bold text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 truncate">
                                                {row.actor_id || 'SYSTEM_PROCESS'}
                                             </div>
                                          </div>
                                       </div>

                                       <div>
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Entity ID ({row.target_type || 'Object'})</div>
                                          <div className="text-xs font-mono font-bold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                                             <span className="truncate">{row.target_id || 'N/A'}</span>
                                             {row.target_id && (
                                                <button 
                                                  type="button" 
                                                  onClick={() => { navigator.clipboard.writeText(row.target_id); toast.success('Target ID copied to clipboard'); }}
                                                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer ml-2 shrink-0"
                                                >
                                                  Copy
                                                </button>
                                             )}
                                          </div>
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
