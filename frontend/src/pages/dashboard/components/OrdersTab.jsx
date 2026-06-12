import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Search, Filter, RefreshCw, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../../components/ui/PageLoader';

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative w-full text-white" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-[#26322B] p-2.5 text-sm bg-[#131B17] text-left focus:outline-none focus:ring-1 focus:ring-[#25D958]/30 font-semibold transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#26322B] bg-[#19231F] shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[#131B17] ${
                option.value === value ? 'text-[#25D958] bg-[#25D958]/10 font-bold' : 'text-slate-350'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const OrdersTab = ({ orders, loading, error, onRetry, onCancelOrder }) => {
  const navigate = useNavigate();
  const [ordersPage, setOrdersPage] = useState(1);
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(text);
    setTimeout(() => setCopiedOrderId(null), 1500);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const ORDERS_PER_PAGE = 5;
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Placed' },
    { value: 'pending_payment', label: 'Payment Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'packaging', label: 'Packed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'out_for_delivery', label: 'Out For Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'return_requested', label: 'Return Requested' },
    { value: 'return_approved', label: 'Return Approved' },
    { value: 'return_rejected', label: 'Return Rejected' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Delivery Failed' },
  ];

  const courierOptions = [
    { value: 'all', label: 'All Couriers' },
    { value: 'India Post', label: 'India Post' },
    { value: 'Speed Post', label: 'Speed Post' },
    { value: 'DTDC', label: 'DTDC' },
    { value: 'Blue Dart', label: 'Blue Dart' },
    { value: 'Delhivery', label: 'Delhivery' },
    { value: 'Ecom Express', label: 'Ecom Express' },
    { value: 'XpressBees', label: 'XpressBees' },
    { value: 'Professional Couriers', label: 'Professional Couriers' },
    { value: 'Shadowfax', label: 'Shadowfax' },
    { value: 'Ekart', label: 'Ekart' },
  ];

  const timeframeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '30_days', label: 'Last 30 Days' },
    { value: '3_months', label: 'Last 3 Months' },
    { value: 'custom', label: 'Date Range' },
  ];

  const getPaymentMethodLabel = (order) => (
    (order.payment_method || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid'
  );

  const getPaymentStatusLabel = (order) => {
    const status = (order.payment_status || '').toLowerCase();
    if (status === 'cash on delivery') return 'To Collect';
    if (status === 'paid' || status === 'completed') return 'Paid';
    if (status === 'refund_pending') return 'Refund Initiated';
    if (status === 'refund_failed') return 'Refund Failed';
    if (status === 'refunded') return 'Refund Credited';
    return status ? status.replace(/_/g, ' ') : 'Pending';
  };

  const getStatusBadge = (order) => {
    if (!order) return { bg: 'bg-[#131B17] text-slate-400 border border-[#26322B]', label: 'Pending' };
    const s = (order.order_status || 'pending').toLowerCase();
    const payStatus = (order.payment_status || '').toLowerCase();
    if (payStatus === 'refund_pending') {
      return { bg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20', label: 'Refund Initiated' };
    }
    if (payStatus === 'refund_failed') {
      return { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Refund Failed' };
    }
    if (payStatus === 'refunded') {
      return { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Refund Credited' };
    }
    
    if (s === 'return_approved') {
      const items = order.items || [];
      const hasReceived = items.some(i => i.return_status === 'RETURN_RECEIVED');
      const hasSelfShipped = items.some(i => i.return_status === 'SELF_SHIPPED');
      const hasApproved = items.some(i => i.return_status === 'RETURN_APPROVED');
      
      if (hasReceived) return { bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', label: 'Return Received' };
      if (hasSelfShipped) return { bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20', label: 'Self-Shipped (Verification Pending)' };
      if (hasApproved) return { bg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20', label: 'Return Approved (Self-Ship Pending)' };
    }

    const config = {
      pending: { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Placed' },
      pending_payment: { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Payment Pending' },
      processing: { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Processing' },
      confirmed: { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Confirmed' },
      packaging: { bg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20', label: 'Packed' },
      packed: { bg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20', label: 'Packed' },
      shipped: { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Shipped' },
      in_transit: { bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'In Transit' },
      out_for_delivery: { bg: 'bg-amber-500/10 text-[#fedb41] border border-amber-500/20', label: 'Out For Delivery' },
      delivered: { bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Delivered' },
      failed: { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Delivery Failed' },
      cancelled: { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Cancelled' },
      return_requested: { bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', label: 'Return Requested' },
      return_approved: { bg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20', label: 'Return Approved' },
      return_rejected: { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Return Rejected' },
      refund_failed: { bg: 'bg-rose-500/10 text-rose-450 border border-rose-500/20', label: 'Refund Failed' },
      refunded: { bg: 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20', label: 'Refund Credited' },
      returned: { bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', label: 'Returned' },
    };
    return config[s] || { bg: 'bg-[#131B17] text-slate-350 border border-[#26322B]', label: s };
  };

  const filteredOrders = (orders || []).filter(order => {
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      const matchesOrderNumber = (order.order_number || '').toLowerCase().includes(query);
      const matchesProducts = (order.items || []).some(item => 
        (item.product_name || '').toLowerCase().includes(query)
      );
      const badge = getStatusBadge(order);
      const matchesStatus = (badge.label || '').toLowerCase().includes(query) || (order.order_status || '').toLowerCase().includes(query);
      const matchesPayment =
        (order.transaction_id || '').toLowerCase().includes(query) ||
        (order.razorpay_payment_id || '').toLowerCase().includes(query) ||
        (order.razorpay_order_id || '').toLowerCase().includes(query) ||
        getPaymentMethodLabel(order).toLowerCase().includes(query) ||
        getPaymentStatusLabel(order).toLowerCase().includes(query);
      matchesSearch = matchesOrderNumber || matchesProducts || matchesStatus || matchesPayment;
    }

    // 2. Status Filter
    let matchesStatusFilter = true;
    if (statusFilter !== 'all') {
      const oStatus = (order.order_status || '').toLowerCase();
      if (statusFilter === 'pending') {
        matchesStatusFilter = ['pending', 'placed'].includes(oStatus);
      } else if (statusFilter === 'packaging') {
        matchesStatusFilter = ['packaging', 'packed'].includes(oStatus);
      } else {
        matchesStatusFilter = oStatus === statusFilter;
      }
    }

    // 3. Timeframe Filter
    let matchesTimeframe = true;
    if (timeframeFilter !== 'all' && order.created_at) {
      const createdDate = new Date(order.created_at);
      const now = new Date();
      if (timeframeFilter === 'today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        matchesTimeframe = createdDate >= startOfToday && createdDate <= endOfToday;
      } else if (timeframeFilter === '30_days') {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        matchesTimeframe = createdDate >= thirtyDaysAgo;
      } else if (timeframeFilter === '3_months') {
        const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
        matchesTimeframe = createdDate >= threeMonthsAgo;
      } else if (timeframeFilter === 'custom') {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          matchesTimeframe = matchesTimeframe && createdDate >= s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          matchesTimeframe = matchesTimeframe && createdDate <= e;
        }
      }
    }

    // 4. Courier Filter
    let matchesCourier = true;
    if (courierFilter !== 'all') {
      const oCourier = (order.carrier || order.courier_name || '').toLowerCase();
      matchesCourier = oCourier === courierFilter.toLowerCase();
    }

    // 5. Quick status chip Filter
    let matchesQuickFilter = true;
    if (quickFilter !== 'all') {
      const oStatus = (order.order_status || '').toLowerCase();
      const pStatus = (order.payment_status || '').toLowerCase();
      if (quickFilter === 'paid') {
        matchesQuickFilter = pStatus === 'paid' || pStatus === 'completed' || oStatus === 'delivered';
      } else if (quickFilter === 'shipped') {
        matchesQuickFilter = ['shipped', 'in_transit', 'out_for_delivery'].includes(oStatus);
      } else if (quickFilter === 'returned') {
        matchesQuickFilter = oStatus.includes('return') || oStatus === 'returned' || pStatus.includes('refund') || pStatus === 'refunded';
      }
    }

    return matchesSearch && matchesStatusFilter && matchesTimeframe && matchesCourier && matchesQuickFilter;
  });

  const canReviewOrder = (order) => {
    const status = (order.order_status || '').toLowerCase();
    return ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
  };

  const stats = {
    totalSpent: (orders || [])
      .filter(o => ['paid', 'completed', 'success', 'delivered'].includes(String(o.payment_status || '').toLowerCase()) || ['delivered'].includes(String(o.order_status || '').toLowerCase()))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      
    pendingAmount: (orders || [])
      .filter(o => ['pending', 'unpaid', 'processing', 'pending_payment'].includes(String(o.payment_status || '').toLowerCase()) && !['cancelled', 'failed'].includes(String(o.order_status || '').toLowerCase()))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      
    doneCount: (orders || [])
      .filter(o => ['delivered', 'completed'].includes(String(o.order_status || '').toLowerCase()))
      .length,
      
    refundedAmount: (orders || [])
      .filter(o => ['refunded', 'refund_credited', 'refund credited', 'refund_pending', 'refund initiated', 'refund_initiated'].includes(String(o.payment_status || '').toLowerCase()))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  };

  if (loading) return <PageLoader message="Loading orders..." />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {orders.length > 0 && (
        <div className="bg-[#19231F] p-5 rounded-2xl border border-[#26322B] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Quick Stats Pills inline */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Total Spent: <span className="font-bold text-white">₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Pending: <span className="font-bold text-white">₹{stats.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Done: <span className="font-bold text-[#25D958]">{stats.doneCount}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Refunds: <span className="font-bold text-white">₹{stats.refundedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
            </div>

            {/* Search Box & Filter Row */}
            <div className="flex gap-2.5 flex-1 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="w-full pl-10 pr-4 h-[40px] rounded-xl border border-[#26322B] focus:border-[#25D958] focus:ring-0 outline-none transition-all text-sm text-white bg-[#131B17]"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border shadow-sm transition-colors shrink-0 ${
                  filterOpen || statusFilter !== 'all' || timeframeFilter !== 'all' || courierFilter !== 'all' || startDate !== '' || endDate !== ''
                    ? 'border-[#25D958] bg-[#25D958]/10 text-[#25D958]'
                    : 'border-[#26322B] bg-[#131B17] text-slate-400 hover:text-white'
                }`}
                title="Advanced Filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters drawer details if open */}
          {filterOpen && (
            <div className="p-4 border-t border-[#26322B]/60 bg-[#131B17]/60 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Quick status chips inside the filter section */}
              <div className="space-y-1.5 pb-2 border-b border-[#26322B]/40">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Filters</label>
                <div className="flex flex-wrap items-center gap-2">
                  {['all', 'paid', 'shipped', 'returned'].map((filterVal) => {
                    const active = quickFilter === filterVal;
                    return (
                      <button
                        key={filterVal}
                        type="button"
                        onClick={() => {
                          setQuickFilter(filterVal);
                          setOrdersPage(1);
                        }}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                          active 
                            ? 'bg-[#25D958] text-[#0C1310] border-[#25D958] font-bold shadow-sm'
                            : 'bg-[#131B17] text-slate-300 border-[#26322B] hover:bg-[#19231F]/50 hover:text-white'
                        }`}
                      >
                        {filterVal.charAt(0).toUpperCase() + filterVal.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Order Status</label>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setOrdersPage(1);
                    }}
                    options={statusOptions}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Courier</label>
                  <CustomSelect
                    value={courierFilter}
                    onChange={(val) => {
                      setCourierFilter(val);
                      setOrdersPage(1);
                    }}
                    options={courierOptions}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Timeframe</label>
                  <CustomSelect
                    value={timeframeFilter}
                    onChange={(val) => {
                      setTimeframeFilter(val);
                      setOrdersPage(1);
                    }}
                    options={timeframeOptions}
                  />
                </div>
              </div>

              {timeframeFilter === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setOrdersPage(1);
                      }}
                      className="w-full rounded-xl border border-[#26322B] p-2 text-sm bg-[#131B17] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setOrdersPage(1);
                      }}
                      className="w-full rounded-xl border border-[#26322B] p-2 text-sm bg-[#131B17] text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#26322B]/60">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter('all');
                    setCourierFilter('all');
                    setTimeframeFilter('all');
                    setQuickFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setFilterOpen(false);
                  }}
                  className="text-xs px-3 py-1.5 h-auto text-slate-400 hover:bg-white/5 hover:text-white rounded-lg"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setFilterOpen(false)}
                  className="text-xs px-3 py-1.5 h-auto bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] rounded-lg font-bold"
                >
                  Apply & Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {error ? (
        <div className="text-center py-20 bg-[#19231F] rounded-2xl border border-dashed border-[#26322B]">
          <RefreshCw className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-350 font-bold">{error}</p>
          <Button onClick={onRetry} className="mt-6 rounded-lg bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-bold px-6">Retry</Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-[#19231F] rounded-2xl border border-dashed border-[#26322B]">
          <Clock className="w-12 h-12 text-slate-550 mx-auto mb-4" />
          <p className="text-slate-350 font-bold">No orders found yet</p>
          <Button onClick={() => navigate('/shop')} className="mt-6 rounded-lg bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] font-bold px-6">Start Shopping</Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[#19231F] rounded-2xl border border-dashed border-[#26322B]">
          <Search className="w-10 h-10 text-slate-550 mx-auto mb-3" />
          <p className="text-slate-350 font-bold">No matching orders found</p>
          <p className="text-slate-500 text-xs mt-1">Try refining your search terms</p>
        </div>
      ) : (
        <div className="overflow-y-auto customer-table-container pr-2 sidebar-scrollbar space-y-4">
          {filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => {
            const badge = getStatusBadge(order);
            return (
              <div key={order.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-[#19231F] p-6 rounded-2xl border border-[#26322B] shadow-sm hover:shadow-lg transition-shadow gap-6">
                {/* Left Column */}
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-450 font-medium">
                    <span className="font-mono">Order #{order.order_number}</span>
                    <span>•</span>
                    <span>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                  
                  {/* Status Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {badge.label && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#131B17] text-slate-300 border border-[#26322B] ${
                      (order.payment_method || '').toLowerCase() === 'cod'
                        ? 'text-slate-300'
                        : 'text-[#25D958]/90 border-[#25D958]/20'
                    }`}>
                      {['refund_pending', 'refund_failed', 'refunded'].includes((order.payment_status || '').toLowerCase())
                        ? getPaymentMethodLabel(order)
                        : `${getPaymentMethodLabel(order)} • ${getPaymentStatusLabel(order)}`}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 pt-1">
                    Payment ID: <span className="font-mono text-slate-300">{order.razorpay_payment_id || order.transaction_id || 'COD'}</span>
                  </div>
                </div>

                {/* Middle Column (Items) */}
                <div className="flex-[2] min-w-[280px] flex flex-wrap gap-2">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="bg-[#131B17] border border-[#26322B] px-3 py-1 rounded-xl text-xs text-slate-355 flex items-center gap-2 font-medium">
                      <span>{item.product_name}</span>
                      <span className="bg-[#fedb41] text-[#0C1310] font-black rounded px-1.5 py-0.5 text-[9px] font-mono leading-none">
                        {item.quantity || 1}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Right Column */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-4 flex-shrink-0">
                  <span className="text-2xl font-black text-white font-mono">
                    ₹{Number(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="flex gap-2">
                    {['pending', 'pending_payment', 'processing'].includes(order.order_status) && (
                      <Button variant="ghost" onClick={() => onCancelOrder(order.id)} className="text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-bold px-3">Cancel</Button>
                    )}
                    <button 
                      onClick={() => window.open(`/order/${order.id}`, '_blank')}
                      className="px-5 py-2 text-sm font-semibold text-[#0C1310] bg-[#25D958] hover:bg-[#1bb847] rounded-lg transition-colors whitespace-nowrap font-bold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredOrders.length > ORDERS_PER_PAGE && (
        <TablePagination
          currentPage={ordersPage}
          totalPages={Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)}
          onPageChange={setOrdersPage}
          totalItems={filteredOrders.length}
          pageSize={ORDERS_PER_PAGE}
          variant="dark"
        />
      )}
    </motion.div>
  );
};

export default OrdersTab;
