import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../../components/ui/PageLoader';

const OrdersTab = ({ orders, loading, error, onRetry, onCancelOrder }) => {
  const navigate = useNavigate();
  const [ordersPage, setOrdersPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    { value: 'refunded', label: 'Refunded' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Delivery Failed' },
  ];

  const getPaymentMethodLabel = (order) => (
    (order.payment_method || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid'
  );

  const getPaymentStatusLabel = (order) => {
    const status = (order.payment_status || '').toLowerCase();
    if (status === 'cash on delivery') return 'To Collect';
    if (status === 'paid' || status === 'completed') return 'Paid';
    if (status === 'refund_pending') return 'Refund Initiated';
    if (status === 'refunded') return 'Refunded';
    return status ? status.replace(/_/g, ' ') : 'Pending';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    const config = {
      pending: { bg: 'bg-secondary-container text-secondary', label: 'Placed' },
      pending_payment: { bg: 'bg-rose-50 text-rose-600', label: 'Payment Pending' },
      processing: { bg: 'bg-primary/10 text-primary', label: 'Processing' },
      confirmed: { bg: 'bg-secondary-container text-secondary', label: 'Confirmed' },
      packaging: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packed' },
      packed: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packed' },
      shipped: { bg: 'bg-secondary-container text-secondary', label: 'Shipped' },
      in_transit: { bg: 'bg-blue-50 text-blue-600', label: 'In Transit' },
      out_for_delivery: { bg: 'bg-amber-50 text-amber-600', label: 'Out For Delivery' },
      delivered: { bg: 'bg-emerald-50 text-emerald-600', label: 'Delivered' },
      failed: { bg: 'bg-rose-50 text-rose-600', label: 'Delivery Failed' },
      cancelled: { bg: 'bg-rose-50 text-rose-600', label: 'Cancelled' },
      return_requested: { bg: 'bg-orange-50 text-orange-600', label: 'Return Requested' },
      return_approved: { bg: 'bg-teal-50 text-teal-600', label: 'Return Approved' },
      return_rejected: { bg: 'bg-red-50 text-red-600', label: 'Return Rejected' },
      refunded: { bg: 'bg-slate-100 text-slate-600', label: 'Refunded' },
      returned: { bg: 'bg-purple-50 text-purple-600', label: 'Returned' },
    };
    return config[s] || { bg: 'bg-slate-50 text-slate-600', label: s };
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
      const badge = getStatusBadge(order.order_status);
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

    return matchesSearch && matchesStatusFilter && matchesTimeframe && matchesCourier;
  });

  const canReviewOrder = (order) => {
    const status = (order.order_status || '').toLowerCase();
    return ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
  };

  if (loading) return <PageLoader message="Loading orders..." />;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">My Orders</h2>
        <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
      </div>

      {orders.length > 0 && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order, product, status, or payment ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOrdersPage(1);
              }}
              className="w-full pl-12 pr-4 h-[48px] rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground bg-surface shadow-sm"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`inline-flex items-center justify-center w-[48px] h-[48px] rounded-lg border shadow-sm transition-colors ${
                filterOpen || statusFilter !== 'all' || timeframeFilter !== 'all' || courierFilter !== 'all' || startDate !== '' || endDate !== ''
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border-subtle bg-surface text-muted-foreground hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setFilterOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 xl:absolute xl:translate-y-0 xl:inset-auto xl:right-0 xl:mt-2 w-auto xl:w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900">Order Filters</h3>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Order Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setOrdersPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Courier</label>
                      <select
                        value={courierFilter}
                        onChange={(e) => {
                          setCourierFilter(e.target.value);
                          setOrdersPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                      >
                        <option value="all">All Couriers</option>
                        <option value="India Post">India Post</option>
                        <option value="Speed Post">Speed Post</option>
                        <option value="DTDC">DTDC</option>
                        <option value="Blue Dart">Blue Dart</option>
                        <option value="Delhivery">Delhivery</option>
                        <option value="Ecom Express">Ecom Express</option>
                        <option value="XpressBees">XpressBees</option>
                        <option value="Professional Couriers">Professional Couriers</option>
                        <option value="Shadowfax">Shadowfax</option>
                        <option value="Ekart">Ekart</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Timeframe</label>
                      <select
                        value={timeframeFilter}
                        onChange={(e) => {
                          setTimeframeFilter(e.target.value);
                          setOrdersPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="30_days">Last 30 Days</option>
                        <option value="3_months">Last 3 Months</option>
                        <option value="custom">Date Range</option>
                      </select>
                    </div>
                    {timeframeFilter === 'custom' && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              setOrdersPage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
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
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setStatusFilter('all');
                          setCourierFilter('all');
                          setTimeframeFilter('all');
                          setStartDate('');
                          setEndDate('');
                          setFilterOpen(false);
                        }}
                        className="text-xs px-3 py-1.5 h-auto text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={() => setFilterOpen(false)}
                        className="text-xs px-3 py-1.5 h-auto bg-primary hover:bg-primary/90 text-white rounded-lg font-bold"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {error ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <RefreshCw className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">{error}</p>
          <Button onClick={onRetry} className="mt-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">Retry</Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">No orders found yet</p>
          <Button onClick={() => navigate('/shop')} className="mt-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">Start Shopping</Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low/50 rounded-xl border border-dashed border-border-subtle">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-bold">No matching orders found</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Try refining your search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => {
            const badge = getStatusBadge(order.order_status);
            return (
              <div key={order.id} className="p-6 rounded-xl border border-border-subtle hover:border-primary/50 hover:shadow-emerald-glow transition-all bg-surface-container-lowest shadow-sm">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-xs font-mono font-semibold tracking-normal text-muted-foreground">Order #{order.order_number}</span>
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider font-semibold ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider font-semibold ${
                        (order.payment_method || '').toLowerCase() === 'cod'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {getPaymentMethodLabel(order)} • {getPaymentStatusLabel(order)}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-foreground mb-1">
                      {(order.items || []).map(item => item.product_name).join(', ')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                    <div className="text-[11px] text-muted-foreground font-mono mt-1.5 space-y-1">
                      {((order.payment_method || '').toLowerCase() === 'cod') ? (
                        <p className="flex items-center gap-1.5">
                          <span>Payment:</span>
                          <span className="font-extrabold text-foreground bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] select-all">COD</span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <span>Payment ID:</span>
                          {order.razorpay_payment_id || order.transaction_id ? (
                            <span className="font-extrabold text-foreground bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] select-all">
                              {order.razorpay_payment_id || order.transaction_id}
                            </span>
                          ) : order.razorpay_order_id ? (
                            <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] select-all">
                              {order.razorpay_order_id} (Pending)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Available</span>
                          )}
                        </p>
                      )}
                    </div>

                  </div>
                  <div className="text-left md:text-right flex-shrink-0">
                    <div className="text-2xl font-black text-foreground font-mono mb-4">₹{(order.total_amount || 0).toLocaleString()}</div>
                    <div className="flex items-center justify-start md:justify-end gap-2">
                      {['pending', 'pending_payment', 'processing'].includes(order.order_status) && (
                        <Button variant="ghost" onClick={() => onCancelOrder(order.id)} className="text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold px-4">Cancel</Button>
                      )}
                      <Button onClick={() => window.open(`/order/${order.id}`, '_blank')} className="rounded-lg px-6 font-bold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow">View Details</Button>
                    </div>
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
        />
      )}
    </motion.div>
  );
};

export default OrdersTab;
