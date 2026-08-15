import React, { useState, useEffect } from 'react';
import apiClient from '../../services/core/apiClient';
import { toast } from 'react-hot-toast';
import { 
  Wallet, PlusCircle, Ticket, User, Search, 
  CheckCircle2, AlertCircle, Clock, ShieldAlert, ArrowDownLeft, ArrowUpRight, Copy, RefreshCw
} from 'lucide-react';

const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, allowAll = false, allLabel = "All Customers" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase())));
  const isAllSelected = selectedValues.length === options.length && options.length > 0;

  const toggleAll = () => {
    if (isAllSelected) onChange([]);
    else onChange(options.map(o => o.value));
  };

  const toggleOne = (val) => {
    if (selectedValues.includes(val)) onChange(selectedValues.filter(v => v !== val));
    else onChange([...selectedValues, val]);
  };

  useEffect(() => {
    const clickHandler = (e) => {
      if (!e.target.closest('.multi-select-container')) setIsOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, []);

  return (
    <div className="relative multi-select-container">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold cursor-pointer flex justify-between items-center"
      >
        <span className="truncate">
          {selectedValues.length === 0 ? placeholder : selectedValues.length === options.length ? allLabel : `${selectedValues.length} selected`}
        </span>
        <ArrowDownLeft className="w-4 h-4 opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#0c1310] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
          <div className="sticky top-0 bg-white dark:bg-[#0c1310] p-2 border-b border-slate-100 dark:border-white/10 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-[#25D958] outline-none"
              />
            </div>
          </div>
          
          <div className="p-1">
            {allowAll && !search && (
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={toggleAll}
                  className="rounded text-[#25D958] focus:ring-[#25D958] bg-slate-100 dark:bg-white/5 border-transparent cursor-pointer"
                />
                <span className="text-xs font-bold">{allLabel}</span>
              </label>
            )}
            
            {filtered.map(o => (
              <label key={o.value} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={selectedValues.includes(o.value)}
                    onChange={() => toggleOne(o.value)}
                    className="rounded text-[#25D958] focus:ring-[#25D958] bg-slate-100 dark:bg-white/5 border-transparent cursor-pointer"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight mb-0.5">{o.label}</span>
                  {o.sublabel && <span className="text-[10px] text-slate-400 leading-tight">{o.sublabel}</span>}
                </div>
              </label>
            ))}
            
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminWalletPage = () => {
  const [customers, setCustomers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Direct Credit State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditRemark, setCreditRemark] = useState('Credit from DurgaShakti Foils Pvt Ltd');
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMsg, setCreditMsg] = useState({ type: '', text: '' });

  // Create Voucher State
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherTargetUsers, setVoucherTargetUsers] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState({ type: '', text: '' });

  // Wallet System Toggle State
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [disabledReason, setDisabledReason] = useState('DSF Wallet system is currently disabled by store management.');
  const [savingWalletSettings, setSavingWalletSettings] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, vouchersRes, txsRes, publicSettingsRes] = await Promise.all([
        apiClient.get('/admin/customers', { params: { limit: 500 } }),
        apiClient.get('/admin/wallet/vouchers').catch(() => ({ data: [] })),
        apiClient.get('/admin/wallet/transactions').catch(() => ({ data: [] })),
        apiClient.get('/settings/public', { silent: true }).catch(() => ({ data: {} }))
      ]);

      const custData = customersRes.data;
      setCustomers(custData?.items || custData?.customers || custData?.rows || (Array.isArray(custData) ? custData : []));
      setVouchers(vouchersRes.data || []);
      setTransactions(txsRes.data || []);

      if (publicSettingsRes.data?.wallet_settings) {
        const ws = publicSettingsRes.data.wallet_settings;
        setWalletEnabled(ws.enabled !== false);
        if (ws.disabled_reason) setDisabledReason(ws.disabled_reason);
      }
    } catch (err) {
      console.error('Failed to load admin wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWalletSystem = async (targetState) => {
    setSavingWalletSettings(true);
    try {
      await apiClient.post('/admin/settings', {
        key: 'wallet_settings',
        value: {
          enabled: targetState,
          disabled_reason: disabledReason.trim()
        }
      });
      setWalletEnabled(targetState);
      toast.success(`DSF Digital Wallet System has been ${targetState ? 'ENABLED' : 'DISABLED'} successfully!`);
    } catch (err) {
      toast.error('Failed to update wallet system status');
    } finally {
      setSavingWalletSettings(false);
    }
  };

  const handleDirectCredit = async (e) => {
    e.preventDefault();
    setCreditMsg({ type: '', text: '' });
    
    if (selectedUsers.length === 0) {
      setCreditMsg({ type: 'error', text: 'Please select at least one customer' });
      return;
    }
    if (!creditAmount || Number(creditAmount) <= 0) {
      setCreditMsg({ type: 'error', text: 'Please enter a valid credit amount' });
      return;
    }
    
    setCreditLoading(true);

    try {
      const res = await apiClient.post('/admin/wallet/credit', {
        userIds: selectedUsers,
        amount: Number(creditAmount),
        remark: creditRemark.trim()
      });

      if (res.data?.success) {
        setCreditMsg({ type: 'success', text: res.data.message || 'Amount credited successfully!' });
        setCreditAmount('');
        setSelectedUsers([]);
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
    setVoucherMsg({ type: '', text: '' });
    
    if (!voucherCode.trim()) {
      setVoucherMsg({ type: 'error', text: 'Please enter a voucher code' });
      return;
    }
    if (!voucherAmount || Number(voucherAmount) <= 0) {
      setVoucherMsg({ type: 'error', text: 'Please enter a valid voucher amount' });
      return;
    }
    
    setVoucherLoading(true);

    try {
      const res = await apiClient.post('/admin/wallet/vouchers', {
        code: voucherCode.trim().toUpperCase(),
        title: voucherTitle.trim() || 'Wallet Bonus Voucher',
        amount: Number(voucherAmount),
        assignedUserIds: voucherTargetUsers
      });

      if (res.data?.success) {
        setVoucherMsg({ type: 'success', text: res.data.message || `Voucher ${voucherCode.trim().toUpperCase()} generated!` });
        setVoucherCode('');
        setVoucherTitle('');
        setVoucherAmount('');
        setVoucherTargetUsers([]);
        loadData();
      }
    } catch (err) {
      setVoucherMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create voucher' });
    } finally {
      setVoucherLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAssignedLabel = (v) => {
    if (v.assignedUserEmail && v.assignedUserEmail.trim()) return v.assignedUserEmail;
    if (v.assignedUserId || v.assigned_user_id) {
      const uId = v.assignedUserId || v.assigned_user_id;
      const match = (Array.isArray(customers) ? customers : []).find(c => c.id === uId);
      if (match) return match.email || match.fullName || match.full_name || 'Assigned Customer';
      return 'Assigned Customer';
    }
    return 'All Customers';
  };

  const customerOptions = (Array.isArray(customers) ? customers : []).map(c => ({
    label: c.fullName || c.full_name || 'Customer',
    sublabel: c.email,
    value: c.id
  }));

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#25D958]/10 text-[#25D958] rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 dark:text-white">
              Wallet & Voucher Control
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-medium">
            Superadmin panel to assign wallet credits, issue customer vouchers, control wallet status, and audit transaction logs.
          </p>
        </div>
      </div>

      {/* WALLET SYSTEM MASTER TOGGLE CONTROL */}
      <div className={`p-6 rounded-3xl border transition-all ${
        walletEnabled 
          ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10' 
          : 'bg-amber-500/5 border-amber-500/20 dark:bg-amber-500/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${walletEnabled ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  DSF Digital Wallet System Control
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  walletEnabled 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {walletEnabled ? 'ACTIVE / ENABLED' : 'DISABLED / PAUSED'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                {walletEnabled 
                  ? 'DSF Wallet is active. Customers can pay via wallet at checkout, top-up, redeem vouchers, and receive wallet refunds.'
                  : 'DSF Wallet is disabled. Customers CANNOT select wallet at checkout, top-up, redeem vouchers, or return/cancel orders for wallet refunds.'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleToggleWalletSystem(!walletEnabled)}
              disabled={savingWalletSettings}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 ${
                walletEnabled 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {savingWalletSettings && <RefreshCw className="w-4 h-4 animate-spin" />}
              {walletEnabled ? 'Disable Wallet System' : 'Enable Wallet System'}
            </button>
          </div>
        </div>

        {!walletEnabled && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase text-amber-700 dark:text-amber-300 mb-1">
                Custom Disabled Notice for Customers:
              </label>
              <input
                type="text"
                value={disabledReason}
                onChange={(e) => setDisabledReason(e.target.value)}
                placeholder="Message shown to customers when wallet is disabled"
                className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-black/40 border border-amber-500/30 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleToggleWalletSystem(false)}
                disabled={savingWalletSettings}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Save Notice
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* DIRECT WALLET CREDIT PANEL */}
        <div className="bg-white dark:bg-[#070b09] border border-slate-100 dark:border-[#19231F] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
            <PlusCircle className="w-5 h-5 text-[#25D958]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Direct Customer Wallet Credit</h3>
          </div>

          <form onSubmit={handleDirectCredit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Select Customers</label>
              <MultiSelectDropdown 
                options={customerOptions}
                selectedValues={selectedUsers}
                onChange={setSelectedUsers}
                placeholder="-- Choose Customers --"
                allowAll={true}
                allLabel="All Customers"
              />
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
              disabled={creditLoading}
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
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Generate Wallet Voucher Code</h3>
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
              <MultiSelectDropdown 
                options={customerOptions}
                selectedValues={voucherTargetUsers}
                onChange={setVoucherTargetUsers}
                placeholder="-- All Customers (Public Voucher) --"
                allowAll={false}
              />
            </div>

            <button
              type="submit"
              disabled={voucherLoading}
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
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Ticket className="w-4.5 h-4.5 text-[#25D958]" />
          Issued Wallet Vouchers ({(Array.isArray(vouchers) ? vouchers : []).length})
        </h3>

        {(!Array.isArray(vouchers) || vouchers.length === 0) ? (
          <p className="text-xs text-slate-400 py-6 text-center">No vouchers generated yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(Array.isArray(vouchers) ? vouchers : []).map((v) => (
              <div key={v.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-[#25D958]">{v.code}</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(v.code)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      title="Copy Voucher Code"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    v.isRedeemed ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {v.isRedeemed ? 'Redeemed' : 'Active'}
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(v.amount)}</p>
                <p className="text-[10px] text-slate-400">Assigned: {getAssignedLabel(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminWalletPage;
