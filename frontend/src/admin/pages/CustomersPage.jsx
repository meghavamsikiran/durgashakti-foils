import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import { 
  Users, UserCheck, Star, IndianRupee, 
  Search, Mail, Phone, Calendar, ToggleLeft, ToggleRight
} from 'lucide-react';
import TablePagination from '../../components/ui/TablePagination';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';

const CustomersPage = () => {
  const { hasPermission } = useAuth();
  const ITEMS_PER_PAGE = 15;
  
  const [segment, setSegment] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached('/admin/customers', { page: 1, limit: ITEMS_PER_PAGE, search: '', segment: undefined });
    return cached?.data?.items || [];
  });
  const rowsLengthRef = React.useRef(rows.length);
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/customers', { page: 1, limit: ITEMS_PER_PAGE, search: '', segment: undefined });
    return !cached;
  });
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.metrics || null;
  });
  const [customerStats, setCustomerStats] = useState(() => {
    const cached = adminService.getCached('/admin/customers', { page: 1, limit: ITEMS_PER_PAGE, search: '', segment: undefined });
    return cached?.data?.stats || null;
  });
  const [loyaltySettings, setLoyaltySettings] = useState({ enabled: true, minimum_orders: 10, minimum_spend: 15000, criteria_mode: 'either' });
  const skipNextLoadRef = React.useRef(false);

  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached('/admin/customers', { page: 1, limit: ITEMS_PER_PAGE, search: '', segment: undefined });
    return cached?.data?.total || 0;
  });

  const getCustomerParams = useCallback((pageNum = 1, nextSegment = segment, nextSearch = search) => ({ 
    page: pageNum, 
    limit: ITEMS_PER_PAGE, 
    search: nextSearch,
    segment: nextSegment !== 'all' ? nextSegment : undefined
  }), [search, segment]);

  const applyCachedCustomers = useCallback((pageNum = 1, nextSegment = segment, nextSearch = search) => {
    const cached = adminService.getCached('/admin/customers', getCustomerParams(pageNum, nextSegment, nextSearch));
    if (!cached) return false;
    setRows(cached.data?.items || []);
    setTotal(cached.data?.total || 0);
    setCustomerStats(cached.data?.stats || null);
    setPage(pageNum);
    return true;
  }, [getCustomerParams, search, segment]);

  const load = useCallback(async (pageNum = 1, nextSegment = segment, nextSearch = search) => {
    const params = getCustomerParams(pageNum, nextSegment, nextSearch);
    const cached = adminService.getCached('/admin/customers', params);
    if (cached) {
      setRows(cached.data?.items || []);
      setTotal(cached.data?.total || 0);
      setCustomerStats(cached.data?.stats || null);
      setPage(pageNum);
    }
    if (!cached && rowsLengthRef.current === 0) {
      setLoading(true);
    }
    try {
      const response = await adminService.getCustomers(params);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setCustomerStats(response.data?.stats || null);
      setPage(pageNum);
      adminService.getDashboardMetrics().then((mRes) => {
        setMetrics(mRes.data?.metrics || null);
      }).catch(() => {});
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getCustomerParams, search, segment]);

  useEffect(() => {
    rowsLengthRef.current = rows.length;
  }, [rows.length]);

  const loadSilent = useCallback(async (pageNum = 1) => {
    const params = { 
      page: pageNum, 
      limit: ITEMS_PER_PAGE, 
      search,
      segment: segment !== 'all' ? segment : undefined
    };
    try {
      const response = await apiClient.get('/admin/customers', { 
        params, 
        silent: true 
      });
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setCustomerStats(response.data?.stats || null);
    } catch {
      // Ignore background errors
    }
  }, [search, segment]);

  const loadLoyaltySettings = useCallback(async () => {
    try {
      let response;
      try {
        response = await adminService.getSettings({ silent: true });
      } catch {
        response = await apiClient.cachedGet('/settings/public', { silent: true });
      }
      setLoyaltySettings(prev => ({ ...prev, ...(response.data?.loyalty_settings || {}) }));
    } catch {
      // Some admin roles can view customers without settings access.
    }
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    applyCachedCustomers(1);
    load(1);
    loadLoyaltySettings();
  }, [search, load, loadLoyaltySettings, applyCachedCustomers]);

  const handleSegmentChange = (nextSegment) => {
    if (nextSegment === 'loyal' && !loyaltyEnabled) return;
    if (nextSegment === segment) return;
    setSegment(nextSegment);
    setPage(1);
    skipNextLoadRef.current = true;
    const hadCache = applyCachedCustomers(1, nextSegment, search);
    if (!hadCache && nextSegment === 'loyal') {
      const visibleRows = rows.filter(row => row.is_loyal);
      setRows(visibleRows);
      setTotal(visibleRows.length);
    }
    load(1, nextSegment, search);
  };

  // Periodic silent polling in the background (every 10 seconds) for real-time customer directory
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent(page);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent, page]);

  const totalFilteredPages = Math.ceil(total / ITEMS_PER_PAGE);
  const loyaltyEnabled = loyaltySettings.enabled !== false;
  const paginatedCustomers = rows;

  const stats = {
    total: customerStats?.total_customers || metrics?.total_customers || total,
    loyal: customerStats?.loyal_customers || (loyaltyEnabled ? rows.filter(r => r.is_loyal).length : 0),
    revenue: customerStats?.total_spend || rows.reduce((sum, row) => sum + Number(row.total_spent || 0), 0),
    avg: customerStats?.avg_spend || (rows.length ? rows.reduce((sum, row) => sum + Number(row.total_spent || 0), 0) / rows.length : 0)
  };

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-primary" />
            Customer Intelligence
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Analyze buyer behavior and lifetime value metrics.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:flex w-full sm:w-auto bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {[
              { id: 'all', label: 'All' },
              { id: 'loyal', label: 'Loyal Customers' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleSegmentChange(item.id)}
                className={`text-center px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  item.id === 'loyal' && !loyaltyEnabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : segment === item.id ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search Customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-80 transition-all focus:w-96"
            />
          </div>
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Database</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.total}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Loyal Users</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.loyal}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Liable Lifetime</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{stats.revenue.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary-container text-secondary rounded-lg flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Average LTV</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{Math.round(stats.avg).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 480px)' }}>
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Customer Identity</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Contact Details</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Liable Orders</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Liable Lifetime Spend</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Joined Date</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedCustomers.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                      {row.full_name || row.name || 'Anonymous'}
                    </div>
                    {row.is_loyal && (
                      <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-wider">
                        Loyal Customer
                      </span>
                    )}
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                      <Mail className="w-3 h-3" />
                      {row.email}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      {row.phone || '—'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      (row.orders_count || 0) > 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {row.orders_count || 0} Orders
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-sm font-black text-slate-900">
                      ₹{Number(row.total_spent || 0).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(row.created_at)}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={() => window.open(`${window.location.pathname.startsWith('/superadmin') ? '/superadmin' : '/admin'}/customers/${row.id}`, '_blank')}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-emerald-hover text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-emerald-glow transition-all"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginatedCustomers.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No matching customer data found.
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
  );
};

export default CustomersPage;
