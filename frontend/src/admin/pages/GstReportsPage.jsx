import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/admin.service';
import { toast } from 'sonner';
import { 
  FileText, ClipboardCheck, History, Search, 
  IndianRupee, Scale, Calculator, Download,
  ArrowUpRight, Calendar, AlertCircle
} from 'lucide-react';
import TablePagination from '../../components/ui/TablePagination';
import { useProgress } from '../../components/ui/ProgressToast';
import PageLoader from '../../components/ui/PageLoader';

const GstReportsPage = () => {
  const ITEMS_PER_PAGE = 20;
  const [records, setRecords] = useState(() => {
    const cached = adminService.getCached('/admin/gst/reports', { page: 1, limit: 100, search: '' });
    return cached?.data?.items || [];
  });
  const [imports, setImports] = useState(() => {
    const cached = adminService.getCached('/admin/gst/imports');
    return cached?.data || [];
  });
  const [loading, setLoading] = useState(() => {
    const cachedRecords = adminService.getCached('/admin/gst/reports', { page: 1, limit: 100, search: '' });
    const cachedImports = adminService.getCached('/admin/gst/imports');
    return !(cachedRecords && cachedImports);
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached('/admin/gst/reports', { page: 1, limit: 100, search: '' });
    return cached?.data?.total || 0;
  });
  const { startProgress, updateProgress, finishProgress } = useProgress();

  const handleExportGST = () => {
    const pid = startProgress({
      label: `GST_Report_${new Date().toISOString().split('T')[0]}.csv`,
      type: 'export',
      fileType: 'spreadsheet',
      message: 'Preparing GST report...',
    });
    try {
      if (!records.length) {
        finishProgress(pid, { message: 'No GST records to export', isError: true });
        return;
      }
      updateProgress(pid, { progress: 40, message: 'Building CSV...' });
      const headers = ['Invoice #', 'Date', 'Customer', 'GST Amount', 'Total Amount'];
      const rows = records.map(r => [
        `"${r.invoice_number || ''}"`,
        `"${r.invoice_date || ''}"`,
        `"${r.customer_name || ''}"`,
        r.gst_amount || 0,
        r.total_amount || 0,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `GST_Report_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      updateProgress(pid, { progress: 85, message: 'Downloading...' });
      link.click();
      document.body.removeChild(link);
      finishProgress(pid, { message: 'GST report exported!' });
    } catch {
      finishProgress(pid, { message: 'Export failed', isError: true });
    }
  };

  const load = useCallback(async (pageNum = 1) => {
    const cachedRecords = adminService.getCached('/admin/gst/reports', { page: pageNum, limit: 100, search });
    const cachedImports = adminService.getCached('/admin/gst/imports');
    if (!(cachedRecords && cachedImports)) {
      setLoading(true);
    }
    try {
      const [recordsRes, importsRes] = await Promise.all([
        adminService.getGSTRecords({ page: pageNum, limit: 100, search }), 
        adminService.getGSTImports()
      ]);
      setRecords(recordsRes.data.items || []);
      setTotal(recordsRes.data.total || 0);
      setPage(pageNum);
      setImports(importsRes.data || []);
    } catch (err) {
      toast.error('Failed to load GST data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadSilent = useCallback(async (pageNum = 1) => {
    try {
      const [recordsRes, importsRes] = await Promise.all([
        apiClient.get('/admin/gst/reports', { params: { page: pageNum, limit: 100, search }, silent: true }), 
        apiClient.get('/admin/gst/imports', { silent: true })
      ]);
      setRecords(recordsRes.data?.items || []);
      setTotal(recordsRes.data?.total || 0);
      setImports(importsRes.data || []);
    } catch (err) {
      // Ignore background errors
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
      loadSilent(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load, loadSilent]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const stats = {
    totalGst: records.reduce((s, r) => s + (r.gst_amount || 0), 0),
    totalRevenue: records.reduce((s, r) => s + (r.total_amount || 0), 0),
    invoices: records.length,
    lastImport: imports[0]?.upload_date ? formatDate(imports[0].upload_date) : 'N/A'
  };

  const totalFilteredPages = Math.ceil(total / ITEMS_PER_PAGE);
  const paginatedRecords = records;

  if (loading && records.length === 0) return <PageLoader />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            Compliance Ledger
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Verify GST filings and historical invoice reporting.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Invoice # or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <button onClick={handleExportGST} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Output GST</div>
            <div className="text-2xl font-black text-slate-900">₹{stats.totalGst.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Taxable Turnover</div>
            <div className="text-2xl font-black text-slate-900">₹{(stats.totalRevenue/100000).toFixed(2)}L</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Invoices</div>
            <div className="text-2xl font-black text-slate-900">{stats.invoices}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Last Synced</div>
            <div className="text-sm font-black text-slate-900 uppercase">{stats.lastImport}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Active Reporting Records
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Invoice</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Party</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Tax (₹)</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedRecords.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="text-xs font-black text-slate-900">{row.invoice_number}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{row.invoice_date}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-bold text-slate-700">{row.customer_name}</div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-indigo-600 text-xs">
                        ₹{(row.gst_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-900 text-xs">
                        ₹{(row.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedRecords.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-500 font-medium italic">
                  No active reporting records found.
                </div>
              )}
            </div>
            <TablePagination
              currentPage={page}
              totalPages={totalFilteredPages}
              onPageChange={load}
              totalItems={total}
              pageSize={ITEMS_PER_PAGE}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-8 py-5 border-b border-slate-50">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Import Integrity
                </h3>
             </div>
             <div className="divide-y divide-slate-50">
                {imports.map((imp, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{imp.file_name}</span>
                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${imp.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                         {imp.status}
                       </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                       <div className="flex items-center gap-1.5">
                          <AlertCircle className={`w-3 h-3 ${imp.error_count > 0 ? 'text-rose-400' : 'text-slate-200'}`} />
                          {imp.record_count} Records
                       </div>
                       <div>{formatDate(imp.upload_date)}</div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GstReportsPage;
