import React, { useEffect, useState } from 'react';
import adminApi from '../services/adminApi';
import { 
  Users, UserCheck, Star, IndianRupee, 
  Search, Mail, Phone, Calendar
} from 'lucide-react';

const CustomersPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getCustomers({ page: 1, page_size: 200 });
        setRows(response.data.items || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const filtered = rows.filter(r =>
    !search || 
    r.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    r.email?.toLowerCase().includes(search.toLowerCase()) || 
    r.phone?.includes(search)
  );

  const stats = {
    total: rows.length,
    loyal: rows.filter(r => (r.orders_count || 0) > 1).length,
    revenue: rows.reduce((acc, curr) => acc + (curr.total_spent || 0), 0),
    avg: rows.length > 0 ? (rows.reduce((acc, curr) => acc + (curr.total_spent || 0), 0) / rows.length) : 0
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-indigo-600" />
            Customer Intelligence
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Analyze buyer behavior and lifetime value metrics.</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search Customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-80 transition-all focus:w-96"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Database</div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loyal Users</div>
            <div className="text-2xl font-black text-slate-900">{stats.loyal}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Lifetime</div>
            <div className="text-2xl font-black text-slate-900">₹{stats.revenue.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Average LTV</div>
            <div className="text-2xl font-black text-slate-900">₹{Math.round(stats.avg).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Customer Identity</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Contact Details</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Volume</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Lifetime Spend</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {row.full_name || row.name || 'Anonymous'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
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
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(row.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium italic">
              No matching customer data found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;
