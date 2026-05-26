import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Filter, MessageSquareReply, Pencil, Search, ShieldCheck, Star, Trash2, X, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import TablePagination from '../../components/ui/TablePagination';
import StarRating from '../../components/reviews/StarRating';
import reviewService from '../../services/review.service';
import { formatImageUrl } from '../../utils/api';

const PAGE_SIZE = 20;

const ReviewsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [rating, setRating] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [selectedModalMedia, setSelectedModalMedia] = useState(null);

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const data = await reviewService.getAdminReviews({
        page: pageNum,
        limit: PAGE_SIZE,
        search,
        status: status === 'all' ? undefined : status,
        rating: rating === 'all' ? undefined : rating,
        date_range: dateRange === 'all' ? undefined : dateRange,
        start_date: dateRange === 'custom' ? customStart || undefined : undefined,
        end_date: dateRange === 'custom' ? customEnd || undefined : undefined,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
      setPage(pageNum);
      setReplyDrafts((data.items || []).reduce((acc, review) => {
        acc[review.id] = review.admin_reply || '';
        return acc;
      }, {}));
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, dateRange, rating, search, status]);

  useEffect(() => {
    const timer = setTimeout(() => load(1), 250);
    return () => clearTimeout(timer);
  }, [load]);

  /* ── Optimistic: Toggle status ── */
  const setReviewStatus = async (review, nextStatus) => {
    const prevRows = [...rows];
    setRows((prev) => prev.map((r) => r.id === review.id ? { ...r, status: nextStatus } : r));
    setSavingId(review.id);
    try {
      await reviewService.updateAdminReviewStatus(review.id, nextStatus);
      toast.success(nextStatus === 'published' ? 'Review published' : 'Review hidden');
    } catch {
      toast.error('Failed to update review status');
      setRows(prevRows);
    } finally {
      setSavingId(null);
    }
  };

  /* ── Optimistic: Save / update reply ── */
  const saveReply = async (review) => {
    const replyText = (replyDrafts[review.id] || '').trim();
    if (!replyText) { toast.error('Reply cannot be empty'); return; }
    const prevRows = [...rows];
    setRows((prev) => prev.map((r) => r.id === review.id ? { ...r, admin_reply: replyText } : r));
    setReplyOpenId(null);
    setSavingId(review.id);
    try {
      await reviewService.replyToReview(review.id, replyText);
      toast.success('Reply saved');
    } catch {
      toast.error('Failed to save reply');
      setRows(prevRows);
      setReplyOpenId(review.id);
    } finally {
      setSavingId(null);
    }
  };

  /* ── Optimistic: Delete reply ── */
  const deleteReply = async (review) => {
    if (!window.confirm('Delete the official reply?')) return;
    const prevRows = [...rows];
    setRows((prev) => prev.map((r) => r.id === review.id ? { ...r, admin_reply: null } : r));
    setReplyDrafts((prev) => ({ ...prev, [review.id]: '' }));
    setReplyOpenId(null);
    setSavingId(review.id);
    try {
      await reviewService.deleteReviewReply(review.id);
      toast.success('Reply deleted');
    } catch {
      toast.error('Failed to delete reply');
      setRows(prevRows);
    } finally {
      setSavingId(null);
    }
  };

  /* ── Optimistic: Delete review ── */
  const deleteReview = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return;
    const prevRows = [...rows];
    const prevTotal = total;
    setRows((prev) => prev.filter((r) => r.id !== review.id));
    setTotal((prev) => Math.max(0, prev - 1));
    setSavingId(review.id);
    try {
      await reviewService.deleteAdminReview(review.id);
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete review');
      setRows(prevRows);
      setTotal(prevTotal);
    } finally {
      setSavingId(null);
    }
  };

  if (loading && rows.length === 0) return <PageLoader message="Loading Reviews..." />;

  const activeFilterCount = (status !== 'all' ? 1 : 0) + (rating !== 'all' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Star className="w-8 h-8 text-primary" />
            Reviews
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Moderate customer reviews and reply as Durga Shakti Foils.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-72"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`h-11 inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest shadow-sm transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowFilters(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:absolute lg:translate-y-0 lg:inset-auto lg:right-0 lg:mt-2 w-auto lg:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900">Review Filters</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25">
                          <option value="all">All Statuses</option>
                          <option value="published">Published</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Rating</label>
                        <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25">
                          <option value="all">All Ratings</option>
                          {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} Star</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Date</label>
                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25">
                          <option value="all">All Dates</option>
                          <option value="today">Today</option>
                          <option value="yesterday">Yesterday</option>
                          <option value="this_week">This Week</option>
                          <option value="this_month">This Month</option>
                          <option value="this_year">This Year</option>
                          <option value="custom">Date Range</option>
                        </select>
                      </div>
                      {dateRange === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                          <div>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">From</label>
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">To</label>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={() => { setStatus('all'); setRating('all'); setDateRange('all'); setCustomStart(''); setCustomEnd(''); }}
                          className="mr-auto text-xs px-3.5 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 font-bold"
                        >
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="text-xs px-4 py-2 bg-primary hover:bg-[#005a14] text-white rounded-lg font-bold"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Review cards ── */}
      <div className="flex-1 space-y-4">
        {rows.map((review) => {
          const hidden = review.status === 'hidden';
          const isReplying = replyOpenId === review.id;
          const isBusy = savingId === review.id;

          return (
            <article
              key={review.id}
              className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden ${
                hidden ? 'border-slate-300 border-dashed' : 'border-slate-200'
              }`}
            >
              {/* ── Card top bar with status + actions ── */}
              <div className={`flex items-center justify-between px-5 py-2.5 border-b ${
                hidden ? 'bg-slate-50 border-slate-200' : 'bg-[#f7faf8] border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    hidden ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {review.status}
                  </span>
                  <StarRating value={review.rating} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReviewStatus(review, hidden ? 'published' : 'hidden')}
                    disabled={isBusy}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
                      hidden
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                    title={hidden ? 'Publish review' : 'Hide review'}
                  >
                    {hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {hidden ? 'Publish' : 'Hide'}
                  </button>
                  <button
                    onClick={() => deleteReview(review)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all disabled:opacity-50"
                    title="Delete review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* ── Card body ── */}
              <div className="p-5">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                    <img src={formatImageUrl(review.product_image)} alt={review.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black text-slate-900 leading-tight text-[15px]">{review.title}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                      {review.product_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs font-semibold text-slate-600">{review.public_name || review.customer_name}</span>
                      {review.customer_email && <span className="text-[11px] text-slate-400 font-mono">{review.customer_email}</span>}
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(review.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-slate-700 leading-relaxed mt-3">{review.comment}</p>}
                    
                    {/* Media attachments */}
                    {(() => {
                      let mediaUrls = [];
                      try {
                        mediaUrls = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
                      } catch {
                        mediaUrls = [];
                      }
                      return Array.isArray(mediaUrls) && mediaUrls.length > 0 && (
                        <div className="flex gap-2.5 mt-3 flex-wrap">
                          {mediaUrls.map((media, idx) => (
                            <button
                              key={`${review.id}-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedModalMedia({
                                  urls: mediaUrls,
                                  currentIndex: idx,
                                  title: review.title,
                                  public_name: review.public_name || review.customer_name,
                                  created_at: review.created_at
                                });
                              }}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 hover:border-primary focus:outline-none transition-all group"
                            >
                              {media.type === 'video' ? (
                                <>
                                  <video src={`${formatImageUrl(media.url)}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm group-hover:scale-110 transition-transform">
                                      <Play className="h-4 w-4 fill-current translate-x-[1px]" />
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <img src={formatImageUrl(media.url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── Official Reply (display mode) ── */}
                {review.admin_reply && !isReplying && (
                  <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Official Reply</span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full select-none">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setReplyOpenId(review.id); setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' })); }}
                          className="p-1.5 text-emerald-600 hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                          title="Edit reply"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteReply(review)}
                          disabled={isBusy}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-rose-100 disabled:opacity-50"
                          title="Delete reply"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{review.admin_reply}</p>
                  </div>
                )}

                {/* ── Reply editor ── */}
                {isReplying && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <MessageSquareReply className="w-3.5 h-3.5 text-primary" />
                      {review.admin_reply ? 'Edit Reply' : 'New Reply'}
                    </label>
                    <textarea
                      value={replyDrafts[review.id] || ''}
                      onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                      rows={3}
                      placeholder="Reply as Durga Shakti Foils..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                      autoFocus
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => { setReplyOpenId(null); setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' })); }}
                        className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 transition-all"
                      >
                        Cancel
                      </button>
                      {review.admin_reply && (
                        <button
                          onClick={() => deleteReply(review)}
                          disabled={isBusy}
                          className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 transition-all disabled:opacity-50"
                        >
                          Delete Reply
                        </button>
                      )}
                      <button
                        onClick={() => saveReply(review)}
                        disabled={isBusy}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-primary hover:bg-[#005a14] border border-transparent rounded-lg text-white transition-all disabled:opacity-50"
                      >
                        {review.admin_reply ? 'Update' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Reply button (when no reply and not editing) ── */}
                {!review.admin_reply && !isReplying && (
                  <div className="mt-4 flex items-center justify-between bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3">
                    <span className="text-xs text-slate-400 font-medium">No official reply yet</span>
                    <button
                      onClick={() => { setReplyOpenId(review.id); setReplyDrafts((d) => ({ ...d, [review.id]: '' })); }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-primary hover:bg-[#005a14] text-white rounded-lg transition-all"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {rows.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="font-black text-slate-800">No reviews found</p>
          <p className="text-sm text-slate-500 mt-1">Reviews will appear here after customers submit verified purchase feedback.</p>
        </div>
      )}

      <div className="mt-auto border-t border-slate-200 pt-4">
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={load}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>

      {selectedModalMedia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedModalMedia(null)}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm hover:bg-white transition-all hover:scale-105"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Media box */}
            <div className="relative flex-1 min-h-[320px] md:min-h-[480px] bg-slate-950 flex items-center justify-center">
              {selectedModalMedia.urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModalMedia(prev => ({
                      ...prev,
                      currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length
                    }));
                  }}
                  className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white hover:scale-105 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              
              {(() => {
                const activeItem = selectedModalMedia.urls[selectedModalMedia.currentIndex];
                if (activeItem.type === 'video') {
                  return (
                    <video
                      key={activeItem.url}
                      src={formatImageUrl(activeItem.url)}
                      className="max-h-[70vh] w-full object-contain"
                      controls
                      autoPlay
                      playsInline
                    />
                  );
                } else {
                  return (
                    <img
                      src={formatImageUrl(activeItem.url)}
                      alt=""
                      className="max-h-[70vh] w-full object-contain"
                    />
                  );
                }
              })()}

              {selectedModalMedia.urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModalMedia(prev => ({
                      ...prev,
                      currentIndex: (prev.currentIndex + 1) % prev.urls.length
                    }));
                  }}
                  className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white hover:scale-105 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Sidebar or metadata */}
            <div className="w-full md:w-[300px] p-6 flex flex-col justify-between bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Review Attachment</span>
                <h3 className="mt-3 text-lg font-black text-slate-900 leading-tight">"{selectedModalMedia.title}"</h3>
                <p className="mt-1.5 text-xs font-bold text-slate-600">
                  By <span className="font-extrabold text-slate-900">{selectedModalMedia.public_name}</span>
                </p>
                {selectedModalMedia.created_at && (
                  <p className="text-[10px] text-slate-400 font-mono font-bold mt-1">
                    {new Date(selectedModalMedia.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              {selectedModalMedia.urls.length > 1 && (
                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Attached files ({selectedModalMedia.urls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedModalMedia.urls.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedModalMedia(prev => ({ ...prev, currentIndex: idx }))}
                        className={`h-12 w-12 overflow-hidden rounded-lg border bg-white transition-all ${selectedModalMedia.currentIndex === idx ? 'border-primary ring-2 ring-primary/25 scale-105 shadow-sm' : 'border-slate-200 hover:border-slate-400'}`}
                      >
                        {item.type === 'video' ? (
                          <div className="relative h-full w-full">
                            <video src={`${formatImageUrl(item.url)}#t=0.001`} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </span>
                          </div>
                        ) : (
                          <img src={formatImageUrl(item.url)} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
