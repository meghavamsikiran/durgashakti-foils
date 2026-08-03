import React, { useState, useEffect } from 'react';
import apiClient from '../../services/core/apiClient';
import { 
  Wallet, PlusCircle, Ticket, User, Search, 
  CheckCircle2, AlertCircle, Clock, ShieldAlert, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';

const AdminWalletPage = () => {
  const [customers, setCustomers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Direct Credit State
  const [selectedUser, setSelectedUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditRemark, setCreditRemark] = useState('Superadmin Wallet Credit');
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMsg, setCreditMsg] = useState({ type: '', text: '' });

  // Create Voucher State
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherTargetUser, setVoucherTargetUser] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, vouchersRes, txsRes] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/wallet/vouchers').catch(() => ({ data: [] })),
        apiClient.get('/admin/wallet/transactions').catch(() => ({ data: [] }))
      ]);

      setCustomers(usersRes.data?.users || usersRes.data || []);
      setVouchers(vouchersRes.data || []);
      setTransactions(txsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDirectCredit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !creditAmount || Number(creditAmount) <= 0) return;
    setCreditLoading(true);
    setCreditMsg({ type: '', text: '' });

    try {
      const res = await apiClient.post('/admin/wallet/credit', {
        userId: selectedUser,
        amount: Number(creditAmount),
        remark: creditRemark.trim()
      });

      if (res.data?.success) {
        setCreditMsg({ type: 'success', text: res.data.message || 'Amount credited successfully!' });
        setCreditAmount('');
        loadData();
      }
    } catch (err) {
      setCreditMsg({ type: 'error', text: err.response?.data?.error || 'Failed to credit wallet' });
    } finally {
      setCreditLoading(false);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim() || !voucherAmount || Number(voucherAmount) <= 0) return;
    setVoucherLoading(true);
    setVoucherMsg({ type: '', text: '' });

    try {
      const res = await apiClient.post('/admin/wallet/vouchers', {
        code: voucherCode.trim().toUpperCase(),
        title: voucherTitle.trim() || 'Wallet Bonus Voucher',
        amount: Number(voucherAmount),
        assignedUserId: voucherTargetUser || null
      });

      if (res.data?.success) {
        setVoucherMsg({ type: 'success', text: `Voucher ${voucherCode.trim().toUpperCase()} generated!` });
        setVoucherCode('');
        setVoucherTitle('');
        setVoucherAmount('');
        setVoucherTargetUser('');
        loadData();
      }
    } catch (err) {
      setVoucherMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create voucher' });
    } finally {
      setVoucherLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#25D958]/10 text-[#25D958] rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              Wallet & Voucher Control
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-medium">
            Superadmin panel to assign wallet credits, issue customer vouchers, and audit transaction logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* DIRECT WALLET CREDIT PANEL */}
        <div className="bg-white dark:bg-[#070b09] border border-slate-100 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
            <PlusCircle className="w-5 h-5 text-[#25D958]" />
            <h3 className="text-sm font-black uppercase tracking-wider">Direct Customer Wallet Credit</h3>
          </div>

          <form onSubmit={handleDirectCredit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Select Customer</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold focus:outline-none"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.full_name || 'Customer'} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Credit Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Remark / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Compensation Bonus"
                  value={creditRemark}
                  onChange={(e) => setCreditRemark(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creditLoading || !selectedUser || !creditAmount}
              className="w-full py-3 rounded-xl bg-[#25D958] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#25D958]/90 disabled:opacity-50 transition-all"
            >
              {creditLoading ? 'Processing Credit...' : 'Credit Wallet Amount'}
            </button>
          </form>

          {creditMsg.text && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              creditMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {creditMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{creditMsg.text}</span>
            </div>
          )}
        </div>

        {/* CREATE VOUCHER PANEL */}
        <div className="bg-white dark:bg-[#070b09] border border-slate-100 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
            <Ticket className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-wider">Generate Wallet Voucher Code</h3>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Voucher Code</label>
                <input
                  type="text"
                  placeholder="e.g. DSF-WAL-500"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-mono font-extrabold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Voucher Value (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assign to Customer (Optional)</label>
              <select
                value={voucherTargetUser}
                onChange={(e) => setVoucherTargetUser(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold focus:outline-none"
              >
                <option value="">-- All Customers (Public Voucher) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.full_name || 'Customer'} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={voucherLoading || !voucherCode || !voucherAmount}
              className="w-full py-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50 transition-all"
            >
              {voucherLoading ? 'Generating...' : 'Issue Wallet Voucher'}
            </button>
          </form>

          {voucherMsg.text && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              voucherMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {voucherMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{voucherMsg.text}</span>
            </div>
          )}
        </div>

      </div>

      {/* RECENT GENERATED VOUCHERS LIST */}
      <div className="bg-white dark:bg-[#070b09] border border-slate-100 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <Ticket className="w-4.5 h-4.5 text-[#25D958]" />
          Issued Wallet Vouchers ({vouchers.length})
        </h3>

        {vouchers.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No vouchers generated yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {vouchers.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-[#25D958]">{v.code}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    v.isRedeemed ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {v.isRedeemed ? 'Redeemed' : 'Active'}
                  </span>
                </div>
                <p className="text-lg font-black">{formatCurrency(v.amount)}</p>
                <p className="text-[10px] text-slate-400">Assigned: {v.assignedUserEmail || 'All Customers'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminWalletPage;
