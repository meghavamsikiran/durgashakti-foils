import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Filter, MessageSquareReply, Search, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
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

  const setReviewStatus = async (review, nextStatus) => {
    setSavingId(review.id);
    try {
      await reviewService.updateAdminReviewStatus(review.id, nextStatus);
      toast.success(nextStatus === 'published' ? 'Review published' : 'Review hidden');
      await load(page);
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
      await load(page);
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
      await load(page);
    } catch {
      toast.error('Failed to delete reply');
    } finally {
      setSavingId(null);
    }
  };

  const deleteReview = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setSavingId(review.id);
    try {
      await reviewService.deleteAdminReview(review.id);
      toast.success('Review deleted');
      await load(page);
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setSavingId(null);
    }
  };

  if (loading && rows.length === 0) return <PageLoader message="Loading Reviews..." />;

  const activeFilterCount = (status !== 'all' ? 1 : 0) + (rating !== 'all' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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
        </div>
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                >
                  <option value="all">All Ratings</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} Star</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Date</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateRange === 'custom' && (
                <div className="grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">From</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">To</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatus('all');
                  setRating('all');
                  setDateRange('all');
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {rows.map((review) => {
          const hidden = review.status === 'hidden';
          return (
            <article key={review.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${hidden ? 'border-slate-200 opacity-75' : 'border-slate-200'}`}>
              <div className="flex flex-col xl:flex-row gap-5">
                <div className="flex gap-4 min-w-0 flex-1">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                    <img src={formatImageUrl(review.product_image)} alt={review.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StarRating value={review.rating} />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${hidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                        {review.status}
                      </span>
                    </div>
                    <h2 className="font-black text-slate-900 leading-tight">{review.title}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 truncate">
                      {review.product_name} by {review.public_name || review.customer_name}
                    </p>
                    {review.customer_email && <p className="text-[11px] text-slate-400 font-mono mt-1">{review.customer_email}</p>}
                    {review.comment && <p className="text-sm text-slate-700 leading-relaxed mt-3">{review.comment}</p>}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">
                      {new Date(review.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="xl:w-[420px] space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    Official Reply
                  </label>
                  <textarea
                    value={replyDrafts[review.id] || ''}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    rows={3}
                    placeholder="Reply as Durga Shakti Foils..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => saveReply(review)} disabled={savingId === review.id} className="rounded-xl">
                      {review.admin_reply ? 'Update Reply' : 'Save Reply'}
                    </Button>
                    {review.admin_reply && (
                      <Button variant="outline" size="sm" onClick={() => deleteReply(review)} disabled={savingId === review.id} className="rounded-xl text-rose-600 hover:text-rose-700">
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Delete Reply
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewStatus(review, hidden ? 'published' : 'hidden')}
                      disabled={savingId === review.id}
                      className="rounded-xl"
                    >
                      {hidden ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
                      {hidden ? 'Publish' : 'Hide'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteReview(review)} disabled={savingId === review.id} className="rounded-xl text-rose-600 hover:text-rose-700">
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {rows.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <p className="font-black text-slate-800">No reviews found</p>
          <p className="text-sm text-slate-500 mt-1">Reviews will appear here after customers submit verified purchase feedback.</p>
        </div>
      )}

      <TablePagination
        currentPage={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        onPageChange={load}
        totalItems={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
};

export default ReviewsPage;
