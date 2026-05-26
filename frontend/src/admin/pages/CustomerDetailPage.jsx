import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, MapPin, 
  ShoppingBag, Star, ArrowLeft, Trash2, ShieldCheck, 
  ExternalLink, IndianRupee, Clock, CheckCircle2, ShieldAlert,
  MessageSquareReply, Eye, EyeOff, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import reviewService from '../../services/review.service';
import PageLoader from '../../components/ui/PageLoader';
import StarRating from '../../components/reviews/StarRating';
import { formatImageUrl } from '../../utils/api';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [activeReplyId, setActiveReplyId] = useState(null);

  const loadCustomer = useCallback(async () => {
    try {
      const response = await adminService.getCustomerDetails(id);
      setData(response.data);
      if (response.data && response.data.reviews) {
        setReplyDrafts(response.data.reviews.reduce((acc, r) => {
          acc[r.id] = r.admin_reply || '';
          return acc;
        }, {}));
      }
    } catch {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const setReviewStatus = async (review, nextStatus) => {
    setSavingId(review.id);
    try {
      await reviewService.updateAdminReviewStatus(review.id, nextStatus);
      toast.success(nextStatus === 'published' ? 'Review published' : 'Review hidden');
      await loadCustomer();
    } catch {
      toast.error('Failed to update review status');
    } finally {
      setSavingId(null);
    }
  };

  const saveReply = async (review) => {
    setSavingId(review.id);
    try {
      await reviewService.replyToReview(review.id, replyDrafts[review.id] || '');
      toast.success('Official reply saved');
      await loadCustomer();
    } catch {
      toast.error('Failed to save reply');
    } finally {
      setSavingId(null);
    }
  };

  const deleteReply = async (review) => {
    if (!window.confirm('Delete the official reply on this review?')) return;
    setSavingId(review.id);
    try {
      await reviewService.deleteReviewReply(review.id);
      setReplyDrafts((prev) => ({ ...prev, [review.id]: '' }));
      toast.success('Official reply deleted');
      await loadCustomer();
    } catch {
      toast.error('Failed to delete reply');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review permanently?')) return;
    setSavingId(reviewId);
    try {
      await reviewService.deleteAdminReview(reviewId);
      toast.success('Review deleted');
      await loadCustomer();
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setSavingId(null);
    }
  };

  const getOrderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    const config = {
      pending: { bg: 'bg-secondary-container text-secondary', label: 'Placed' },
      pending_payment: { bg: 'bg-rose-50 text-rose-600', label: 'Payment Pending' },
      processing: { bg: 'bg-primary/10 text-primary', label: 'Processing' },
      confirmed: { bg: 'bg-secondary-container text-secondary', label: 'Confirmed' },
      packaging: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packaging' },
      packed: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packaging' },
      shipped: { bg: 'bg-secondary-container text-secondary', label: 'Shipped' },
      out_for_delivery: { bg: 'bg-amber-50 text-amber-600', label: 'Out For Delivery' },
      delivered: { bg: 'bg-emerald-50 text-emerald-600', label: 'Delivered' },
      failed: { bg: 'bg-rose-50 text-rose-600', label: 'Failed' },
      cancelled: { bg: 'bg-rose-50 text-rose-600', label: 'Cancelled' },
      return_requested: { bg: 'bg-orange-50 text-orange-600', label: 'Return Requested' },
      return_approved: { bg: 'bg-teal-50 text-teal-600', label: 'Return Approved' },
      return_rejected: { bg: 'bg-red-50 text-red-600', label: 'Return Rejected' },
      refunded: { bg: 'bg-slate-100 text-slate-600', label: 'Refunded' },
    };
    return config[s] || { bg: 'bg-slate-50 text-slate-600', label: s };
  };

  if (loading) return <PageLoader message="Loading intelligence profile..." />;
  if (!data) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
        Customer profile not found.
      </div>
    );
  }

  const { customer, addresses, orders, reviews } = data;
  const totalVolume = customer.orders_count !== undefined ? customer.orders_count : orders.filter(o => 
    ['completed', 'paid', 'cash on delivery'].includes((o.payment_status || '').toLowerCase()) &&
    (o.order_status || '').toLowerCase() !== 'cancelled'
  ).length;
  const lifetimeSpend = customer.total_spent !== undefined ? customer.total_spent : orders.filter(o => 
    ['completed', 'paid', 'cash on delivery'].includes((o.payment_status || '').toLowerCase()) &&
    (o.order_status || '').toLowerCase() !== 'cancelled'
  ).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                const isAdmin = window.location.pathname.startsWith('/superadmin');
                navigate(isAdmin ? '/superadmin/customers' : '/admin/customers');
              }
            }} 
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Customer Intelligence Profile
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">Reviewing customer behavior, ratings, and purchase history.</p>
          </div>
        </div>
      </div>

      {/* Grid: Profile Summary & Address Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: profile summary */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-2xl">
              {customer.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{customer.name || 'Anonymous'}</h2>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {customer.id}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 bg-[#f7faf8] p-4 rounded-2xl border border-[#DDE5DF]">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</div>
                <a href={`mailto:${customer.email}`} className="text-sm font-bold text-slate-800 hover:underline">{customer.email}</a>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#f7faf8] p-4 rounded-2xl border border-[#DDE5DF]">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</div>
                <div className="text-sm font-bold text-slate-800">{customer.phone || '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#f7faf8] p-4 rounded-2xl border border-[#DDE5DF]">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined Date</div>
                <div className="text-sm font-bold text-slate-800">
                  {new Date(customer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#f7faf8] p-4 rounded-2xl border border-[#DDE5DF]">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Status</div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mt-0.5 ${
                  customer.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {customer.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: LTV Analytics & addresses */}
        <div className="space-y-6">
          <div className="bg-primary rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-glow relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Customer Value</h3>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Lifetime Volume</div>
                <div className="text-3xl font-black">{totalVolume} Orders</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Lifetime Spend</div>
                <div className="text-3xl font-black">₹{lifetimeSpend.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Shipping Directory ({addresses.length})
            </h3>
            {addresses.length === 0 ? (
              <div className="text-slate-400 font-medium italic text-xs">No registered addresses found.</div>
            ) : (
              <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1">
                {addresses.map((addr) => (
                  <div key={addr.id} className="text-xs border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      {addr.full_name}
                      {addr.is_default && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">Default</span>
                      )}
                    </div>
                    <div className="text-slate-500 mt-1 font-medium leading-relaxed">
                      {addr.address_line1}, {addr.address_line2 && `${addr.address_line2}, `}{addr.city}, {addr.state} — {addr.pincode}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-1">Phone: {addr.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Purchase History & Reviews */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Purchase History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Purchase History
          </h3>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium italic text-sm">
              No purchases recorded for this customer yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {orders.map((order) => {
                const badge = getOrderStatusBadge(order.order_status);
                return (
                  <div key={order.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-[#f7faf8] transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500">#{order.order_number}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-mono tracking-wider font-semibold ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <button
                          onClick={() => window.open(`/order/${order.id}`, '_blank')}
                          className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
                          title="View Order Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm font-black text-slate-900 mb-2 truncate">
                      {(order.items || []).map(item => `${item.product_name} (x${item.quantity})`).join(', ')}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold font-mono">
                      <div>Placed on: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-slate-950 font-black text-sm">₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Reviews */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Ratings & Reviews ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium italic text-sm">
              This customer has not submitted any product reviews yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 rounded-2xl border border-slate-100 bg-[#f7faf8] space-y-3 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={formatImageUrl(review.product_image)} 
                        alt={review.product_name} 
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">{review.product_name}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRating value={review.rating} size="sm" />
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${review.status === 'hidden' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                            {review.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border-t border-slate-200/50 pt-2 space-y-1.5">
                    <div className="text-sm font-black text-slate-800">“{review.title}”</div>
                    {review.comment && <p className="text-xs text-slate-600 leading-relaxed font-medium">{review.comment}</p>}
                    
                    {/* Media attachments */}
                    {(() => {
                      let mediaUrls = [];
                      try {
                        mediaUrls = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
                      } catch {
                        mediaUrls = [];
                      }
                      return Array.isArray(mediaUrls) && mediaUrls.length > 0 && (
                        <div className="flex gap-2 pt-1.5 overflow-x-auto">
                          {mediaUrls.map((media, idx) => (
                            <div key={`${review.id}-${idx}`} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                              {media.type === 'video' ? (
                                <video src={formatImageUrl(media.url)} className="w-full h-full object-cover" controls />
                              ) : (
                                <img src={formatImageUrl(media.url)} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="text-[10px] text-slate-400 font-mono font-bold pt-1.5">
                      Submitted on: {new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Official Reply Section */}
                    <div className="border-t border-slate-200/60 pt-3 mt-3">
                      {activeReplyId === review.id ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-label-caps">
                            <MessageSquareReply className="w-3.5 h-3.5 text-primary" />
                            Official Reply Editor
                          </label>
                          <textarea
                            value={replyDrafts[review.id] || ''}
                            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                            rows={2}
                            placeholder="Reply as Durga Shakti Foils..."
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <button 
                              onClick={async () => {
                                await saveReply(review);
                                setActiveReplyId(null);
                              }} 
                              disabled={savingId === review.id} 
                              className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-primary hover:bg-[#005a14] border border-transparent rounded-full text-white transition-all disabled:opacity-50"
                            >
                              {review.admin_reply ? 'Update' : 'Submit'}
                            </button>
                            {review.admin_reply && (
                              <button 
                                onClick={async () => {
                                  await deleteReply(review);
                                  setActiveReplyId(null);
                                }} 
                                disabled={savingId === review.id} 
                                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full text-rose-600 transition-all disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                            <button 
                              onClick={() => setReviewStatus(review, review.status === 'hidden' ? 'published' : 'hidden')} 
                              disabled={savingId === review.id} 
                              className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-700 transition-all disabled:opacity-50"
                            >
                              {review.status === 'hidden' ? 'Publish' : 'Hide'}
                            </button>
                            <button 
                              onClick={() => {
                                setReplyDrafts((prev) => ({ ...prev, [review.id]: review.admin_reply || '' }));
                                setActiveReplyId(null);
                              }} 
                              className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-500 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {review.admin_reply ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2 relative">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                    REPLY FROM DURGA SHAKTI FOILS
                                  </span>
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-150 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5 select-none">
                                    <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                                    OFFICIAL VERIFIED
                                  </span>
                                </div>
                                <button 
                                  onClick={() => {
                                    setActiveReplyId(review.id);
                                    setReplyDrafts((prev) => ({ ...prev, [review.id]: review.admin_reply || '' }));
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                                  title="Edit Official Reply"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                                {review.admin_reply}
                              </p>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                              <span className="text-xs text-slate-400 font-medium">No official reply posted yet.</span>
                              <button
                                onClick={() => {
                                  setActiveReplyId(review.id);
                                  setReplyDrafts((prev) => ({ ...prev, [review.id]: '' }));
                                }}
                                className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider bg-primary hover:bg-[#005a14] text-white rounded-full transition-all flex items-center gap-1.5"
                              >
                                <MessageSquareReply className="w-3.5 h-3.5" />
                                Reply
                              </button>
                            </div>
                          )}
                          
                          {/* Publish/Hide button if not editing */}
                          <div className="flex justify-end">
                            <button 
                              onClick={() => setReviewStatus(review, review.status === 'hidden' ? 'published' : 'hidden')} 
                              disabled={savingId === review.id} 
                              className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-700 transition-all disabled:opacity-50"
                            >
                              {review.status === 'hidden' ? 'Publish Review' : 'Hide Review'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
