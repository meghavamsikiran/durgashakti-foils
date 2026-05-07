import React, { useEffect, useState, useCallback } from 'react';
import adminApi from '../services/adminApi';
import { 
  Shield, Activity, Search, ChevronDown, ChevronUp,
  Fingerprint, Clock, User, HardDrive, Filter,
  AlertTriangle, CheckCircle2, RefreshCw, Eye
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import TablePagination from '../../components/ui/TablePagination';

const PAGE_SIZE = 25;

const AuditLogsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await adminApi.getAuditLogs({ page: pageNum, limit: PAGE_SIZE, search });
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(pageNum);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const actionInfo = (action) => {
    if (action?.includes('DELETE')) return { color: 'text-rose-600 bg-rose-50', icon: AlertTriangle };
    if (action?.includes('CREATE') || action?.includes('SEED')) return { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 };
    if (action?.includes('UPDATE') || action?.includes('RESET')) return { color: 'text-indigo-600 bg-indigo-50', icon: RefreshCw };
    return { color: 'text-slate-600 bg-slate-50', icon: Activity };
  };

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  const filtered = rows;

  const stats = {
    totalEvents: total,
    securityEvents: rows.filter(r => r.action?.includes('CREATE') || r.action?.includes('RESET')).length,
    destructive: rows.filter(r => r.action?.includes('DELETE')).length,
    recentRate: rows.length
  };

  const formatKey = (key) => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            System Logs
          </h1>
          <p className="text-slate-500 mt-1 font-medium">A record of all changes made in the system.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Logs</div>
            <div className="text-2xl font-black text-slate-900">{stats.totalEvents}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login Events</div>
            <div className="text-2xl font-black text-slate-900">{stats.securityEvents}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Changes</div>
            <div className="text-2xl font-black text-slate-900">{stats.destructive}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Logs</div>
            <div className="text-2xl font-black text-slate-900">{stats.recentRate}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Target</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => {
                const info = actionInfo(row.action);
                const ActionIcon = info.icon;
                const isExpanded = expandedRow === row.id;
                
                return (
                  <React.Fragment key={row.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors group ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
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
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                          {row.target_id?.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(row.created_at)}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                          className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shadow-sm"
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
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-indigo-500" />
                                    Log Details
                                 </h4>
                                 <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <table className="min-w-full">
                                       <tbody className="divide-y divide-slate-50">
                                          {row.metadata && Object.keys(row.metadata).length > 0 ? (
                                            Object.entries(row.metadata).map(([k, v]) => (
                                              <tr key={k}>
                                                 <td className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30 w-1/3 border-r border-slate-50">{formatKey(k)}</td>
                                                 <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                                   {typeof v === 'boolean' ? (v ? 'Enabled' : 'Disabled') : String(v)}
                                                 </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr><td className="p-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">No details found.</td></tr>
                                          )}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    User Details
                                 </h4>
                                 <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <div className="space-y-4">
                                       <div>
                                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">User ID</div>
                                          <div className="text-xs font-mono font-bold text-slate-600 bg-slate-50 p-2 rounded-lg truncate">{row.actor_id || 'SYSTEM_PROCESS'}</div>
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
