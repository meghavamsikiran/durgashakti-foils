import React, { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Edit2, Eye, EyeOff, MessageSquareReply, Play, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import reviewService from '../../services/review.service';
import apiClient from '../../services/core/apiClient';
import { formatImageUrl } from '../../utils/api';
import StarRating from './StarRating';
import { useAuth } from '../../contexts/AuthContext';

const ProductReviews = ({ productId, summary }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Synchronously look up cached review data to display instantly without waiting
  const getInitialReviews = () => {
    if (!productId) return [];
    try {
      const cached = reviewService.getAdminReviewsCached ? reviewService.getAdminReviewsCached({ limit: 50 }) : null; // fallback or custom sync check
      const customCache = apiClient.getCachedDataSync(`/products/${productId}/reviews`, { limit: 50 });
      return customCache?.data?.items || [];
    } catch {
      return [];
    }
  };

  const getInitialSummary = () => {
    if (!productId) return summary || {};
    try {
      const customCache = apiClient.getCachedDataSync(`/products/${productId}/reviews`, { limit: 50 });
      return customCache?.data || summary || {};
    } catch {
      return summary || {};
    }
  };

  const [reviews, setReviews] = useState(() => getInitialReviews());
  const [ratingSummary, setRatingSummary] = useState(() => getInitialSummary());
  const [loading, setLoading] = useState(() => !getInitialReviews().length);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [newReplyId, setNewReplyId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [selectedRating, setSelectedRating] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Edit Review Modal States
  const [editingReview, setEditingReview] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editPublicName, setEditPublicName] = useState('');
  const [editExistingMedia, setEditExistingMedia] = useState([]);
  const [editFiles, setEditFiles] = useState([]);
  const [editFilePreviews, setEditFilePreviews] = useState([]);

  useEffect(() => {
    const urls = editFiles.map(file => {
      return { url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name };
    });
    setEditFilePreviews(urls);
    return () => {
      urls.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [editFiles]);

  useEffect(() => {
    setVisibleCount(3);
  }, [selectedRating, sortBy]);

  const filteredAndSortedReviews = React.useMemo(() => {
    let result = [...reviews];
    if (selectedRating !== 'all') {
      if (selectedRating === '5') {
        result = result.filter(r => Number(r.rating) === 5);
      } else if (selectedRating === '4_above') {
        result = result.filter(r => Number(r.rating) >= 4);
      } else if (selectedRating === '3_above') {
        result = result.filter(r => Number(r.rating) >= 3);
      } else if (selectedRating === '2_above') {
        result = result.filter(r => Number(r.rating) >= 2);
      } else if (selectedRating === '1_above') {
        result = result.filter(r => Number(r.rating) >= 1);
      } else if (selectedRating === '1_only') {
        result = result.filter(r => Number(r.rating) === 1);
      } else {
        result = result.filter(r => Number(r.rating) === Number(selectedRating));
      }
    }
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return result;
  }, [reviews, selectedRating, sortBy]);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const data = await reviewService.getProductReviews(productId, { limit: 50 });
        if (!active) return;
        const nextReviews = data.items || [];
        setReviews(nextReviews);
        setRatingSummary(data);
        setReplyDrafts(nextReviews.reduce((acc, review) => {
          acc[review.id] = review.admin_reply || '';
          return acc;
        }, {}));
      } catch {
        if (active) setReviews([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchReviews();
    return () => { active = false; };
  }, [productId]);

  const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN';

  /* ── Optimistic: Delete review ── */
  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    const prev = [...reviews];
    setReviews((r) => r.filter((x) => x.id !== reviewId));
    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Review deleted');
      const data = await reviewService.getProductReviews(productId);
      setRatingSummary(data);
    } catch {
      toast.error('Failed to delete review');
      setReviews(prev);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editRating) {
      toast.error('Please select a star rating');
      return;
    }
    if (!editTitle.trim()) {
      toast.error('Please add a review title');
      return;
    }
    if (!editPublicName.trim()) {
      toast.error('Please enter your public name');
      return;
    }

    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('order_id', editingReview.order_id);
    formData.append('rating', String(editRating));
    formData.append('title', editTitle);
    formData.append('comment', editComment);
    formData.append('public_name', editPublicName);
    formData.append('existing_media', JSON.stringify(editExistingMedia));
    editFiles.forEach(file => formData.append('files', file));

    setSubmittingEdit(true);
    try {
      await reviewService.submitReview(formData);
      toast.success('Review updated successfully');
      setEditingReview(null);
      
      // Fetch fresh reviews from server to update list instantly
      const data = await reviewService.getProductReviews(productId, { limit: 50 });
      setReviews(data.items || []);
      setRatingSummary(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update review');
    } finally {
      setSubmittingEdit(false);
    }
  };

  /* ── Optimistic: Hide/Publish review ── */
  const handleToggleStatus = async (review) => {
    const nextStatus = review.status === 'hidden' ? 'published' : 'hidden';
    const prev = [...reviews];
    setReviews((r) => r.map((x) => x.id === review.id ? { ...x, status: nextStatus } : x));
    setSavingId(review.id);
    try {
      await reviewService.updateAdminReviewStatus(review.id, nextStatus);
      toast.success(nextStatus === 'published' ? 'Review published' : 'Review hidden');
    } catch {
      toast.error('Failed to update status');
      setReviews(prev);
    } finally {
      setSavingId(null);
    }
  };

  /* ── Optimistic: Save reply ── */
  const handleSaveReply = async (reviewId) => {
    const replyText = (replyDrafts[reviewId] || '').trim();
    if (!replyText) { toast.error('Reply cannot be empty'); return; }
    const prev = [...reviews];
    setReviews((r) => r.map((x) => x.id === reviewId ? { ...x, admin_reply: replyText } : x));
    setEditingReplyId(null);
    setNewReplyId(null);
    setSavingId(reviewId);
    try {
      await reviewService.replyToReview(reviewId, replyText);
      toast.success('Official reply saved');
    } catch {
      toast.error('Failed to save reply');
      setReviews(prev);
      setEditingReplyId(reviewId);
    } finally {
      setSavingId(null);
    }
  };

  /* ── Optimistic: Delete reply ── */
  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm('Delete the official reply?')) return;
    const prev = [...reviews];
    setReviews((r) => r.map((x) => x.id === reviewId ? { ...x, admin_reply: null } : x));
    setReplyDrafts((d) => ({ ...d, [reviewId]: '' }));
    setEditingReplyId(null);
    setSavingId(reviewId);
    try {
      await reviewService.deleteReviewReply(reviewId);
      toast.success('Reply deleted');
    } catch {
      toast.error('Failed to delete reply');
      setReviews(prev);
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const average = ratingSummary.rating_average ?? summary?.rating_average ?? 0;
  const count = ratingSummary.review_count ?? summary?.review_count ?? 0;
  const distribution = ratingSummary.rating_distribution || {};
  const ratingsEnabled = ratingSummary.settings?.ratings_enabled !== false;
  const normalizeReviewMedia = (review) => {
    if (!review) return [];
    try {
      const media = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
      return Array.isArray(media) ? media.filter(Boolean).map(item => {
        if (typeof item === 'string') {
          return {
            url: item,
            type: item.endsWith('.mp4') || item.endsWith('.webm') ? 'video' : 'image',
            review
          };
        }
        return { ...item, review };
      }) : [];
    } catch {
      return [];
    }
  };
  const mediaItems = reviews.flatMap(normalizeReviewMedia);
  const visibleReviews = filteredAndSortedReviews.slice(0, visibleCount);
  const selectedMedia = selectedMediaIndex !== null ? mediaItems[selectedMediaIndex] : null;
  const shiftSelectedMedia = (delta) => {
    if (!mediaItems.length) return;
    setSelectedMediaIndex(prev => {
      const current = prev ?? 0;
      return (current + delta + mediaItems.length) % mediaItems.length;
    });
  };

  if (!ratingsEnabled) return null;

  return (
    <section className="mt-16 border-t border-slate-100 dark:border-[#26322B] pt-12 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 mb-8 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-manrope">
          Customer Reviews
        </h2>
        {count > 0 && (
          <div className="mt-1 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <StarRating value={average} count={count} size="md" />
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#26322B] px-2.5 py-1 rounded-full">Verified purchase feedback</span>
          </div>
        )}
      </div>

      {count > 0 && (
        <>
        {mediaItems.length > 0 && (
          <div className="mb-10 bg-slate-50/50 dark:bg-[#131B17]/40 border border-slate-100 dark:border-[#26322B] p-6 rounded-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight font-manrope">Photos & videos from customers</h3>
              {mediaItems.length > 6 && (
                <button
                  type="button"
                  onClick={() => setSelectedMediaIndex(0)}
                  className="text-xs font-bold text-primary hover:text-emerald-700 transition-colors"
                >
                  See all media
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {mediaItems.length > 5 && (
                <button
                  type="button"
                  onClick={() => {
                    const strip = document.getElementById(`review-media-strip-${productId}`);
                    strip?.scrollBy({ left: -360, behavior: 'smooth' });
                  }}
                  className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary hover:text-primary transition-all"
                  aria-label="Previous review media"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div id={`review-media-strip-${productId}`} className="flex gap-3 overflow-x-auto scroll-smooth pb-1 flex-1 no-scrollbar">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.review.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-150 bg-slate-100 shadow-sm transition-all hover:border-primary hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {media.type === 'video' ? (
                      <>
                        <video src={`${formatImageUrl(media.url)}#t=0.001`} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-primary shadow-sm">
                            <Play className="h-4 w-4 fill-current translate-x-[1px]" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <img src={formatImageUrl(media.url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
              {mediaItems.length > 5 && (
                <button
                  type="button"
                  onClick={() => {
                    const strip = document.getElementById(`review-media-strip-${productId}`);
                    strip?.scrollBy({ left: 360, behavior: 'smooth' });
                  }}
                  className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary hover:text-primary transition-all"
                  aria-label="Next review media"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Summary Box */}
          <div className="bg-slate-50 dark:bg-[#131B17] border border-slate-100 dark:border-[#26322B] rounded-2xl p-6 space-y-6">
            <div className="text-center md:text-left">
              <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">{average.toFixed(1)}</span>
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1">/ 5</span>
              <div className="flex justify-center md:justify-start mt-2.5">
                <StarRating value={average} size="md" />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold mt-2">Based on {count} verified ratings</p>
            </div>
            
            <div className="border-t border-slate-200/60 dark:border-[#26322B] my-4" />
            
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((r) => {
                const amount = distribution[String(r)] || 0;
                const percent = count ? Math.round((amount / count) * 100) : 0;
                const isSelected = String(selectedRating) === String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRating(isSelected ? 'all' : String(r))}
                    className={`w-full flex items-center gap-3 text-xs font-semibold text-slate-650 dark:text-slate-400 hover:text-primary dark:hover:text-[#25D958] transition-all p-1.5 rounded-lg text-left ${
                      isSelected 
                        ? 'bg-primary/10 text-primary dark:text-[#25D958] font-bold' 
                        : 'hover:bg-white dark:hover:bg-[#26322B] border border-transparent hover:border-slate-100 dark:hover:border-[#26322B]'
                    }`}
                    title={isSelected ? "Clear filter" : `Filter by ${r} star reviews`}
                  >
                    <span className="w-10 shrink-0 text-slate-550 dark:text-slate-450 font-bold">{r} Star</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-200/60 dark:bg-[#26322B] overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-9 text-right shrink-0 text-slate-450 dark:text-slate-550 font-bold">{percent}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reviews List & Controls */}
          <div className="space-y-6">
            {/* Header controls with single Filter Dropdown */}
            <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-[#26322B] pb-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {selectedRating === 'all' ? 'All Reviews' : 
                   selectedRating === '5' ? '5 Star Reviews' :
                   selectedRating === '4_above' ? '4 Stars & Above' :
                   selectedRating === '3_above' ? '3 Stars & Above' :
                   selectedRating === '2_above' ? '2 Stars & Above' :
                   selectedRating === '1_above' ? '1 Star & Above' :
                   selectedRating === '1_only' ? 'Only 1 Star Reviews' :
                   `${selectedRating} Star Reviews`} 
                  <span className="text-xs font-normal text-slate-450 dark:text-slate-500 ml-2">({filteredAndSortedReviews.length})</span>
                </h3>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-[#26322B] rounded-xl bg-white dark:bg-[#131B17] hover:bg-slate-50 dark:hover:bg-[#26322B] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Filter & Sort</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-555 transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isFilterMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#19231F] border border-slate-100 dark:border-[#26322B] rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block px-2">Sort By</span>
                          <div className="space-y-0.5">
                            {[
                              { value: 'newest', label: 'Newest First' },
                              { value: 'oldest', label: 'Oldest First' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSortBy(opt.value);
                                  setIsFilterMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                                  sortBy === opt.value
                                    ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#26322B]'
                                }`}
                              >
                                <span>{opt.label}</span>
                                {sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-[#26322B] my-1" />

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block px-2">Rating Filter</span>
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                  setSelectedRating('all');
                                  setIsFilterMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                                selectedRating === 'all'
                                  ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#26322B]'
                              }`}
                            >
                              <span>All Ratings</span>
                              {selectedRating === 'all' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            {[
                              { value: '5', label: '5 Stars', count: reviews.filter(rev => Number(rev.rating) === 5).length },
                              { value: '4_above', label: '4 Stars & Above', count: reviews.filter(rev => Number(rev.rating) >= 4).length },
                              { value: '3_above', label: '3 Stars & Above', count: reviews.filter(rev => Number(rev.rating) >= 3).length },
                              { value: '2_above', label: '2 Stars & Above', count: reviews.filter(rev => Number(rev.rating) >= 2).length },
                              { value: '1_above', label: '1 Star & Above', count: reviews.filter(rev => Number(rev.rating) >= 1).length },
                              { value: '1_only', label: 'Only 1 Star', count: reviews.filter(rev => Number(rev.rating) === 1).length }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSelectedRating(opt.value);
                                  setIsFilterMenuOpen(false);
                                }}
                                disabled={opt.count === 0}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                                  selectedRating === opt.value
                                    ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                                    : opt.count === 0
                                      ? 'text-slate-350 dark:text-slate-600 cursor-not-allowed opacity-50'
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#26322B]'
                                }`}
                              >
                                <span>{opt.label} ({opt.count})</span>
                                {selectedRating === opt.value && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Active filter badges */}
              {(selectedRating !== 'all' || sortBy !== 'newest') && (
                <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in duration-200">
                  {selectedRating !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/25">
                      <span>
                        {selectedRating === '5' && '5 Stars'}
                        {selectedRating === '4_above' && '4 Stars & Above'}
                        {selectedRating === '3_above' && '3 Stars & Above'}
                        {selectedRating === '2_above' && '2 Stars & Above'}
                        {selectedRating === '1_above' && '1 Star & Above'}
                        {selectedRating === '1_only' && 'Only 1 Star'}
                        {!['5', '4_above', '3_above', '2_above', '1_above', '1_only'].includes(String(selectedRating)) && `${selectedRating} Star`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedRating('all')}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {sortBy !== 'newest' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/25">
                      <span>
                        Sort: {sortBy === 'oldest' ? 'Oldest First' : sortBy}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSortBy('newest')}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Reviews list container */}
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-slate-100 dark:border-[#26322B] rounded-2xl p-6 bg-white dark:bg-[#131B17] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#26322B]"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-slate-100 dark:bg-[#26322B] rounded w-24"></div>
                        <div className="h-2 bg-slate-100 dark:bg-[#26322B] rounded w-32"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className="h-3 bg-slate-100 dark:bg-[#26322B] rounded w-full"></div>
                      <div className="h-3 bg-slate-100 dark:bg-[#26322B] rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedReviews.length === 0 ? (
              <div className="bg-white dark:bg-[#131B17] border border-dashed border-slate-200 dark:border-[#26322B] rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400">
                <p className="font-bold text-sm">No reviews found matching the selected rating filter.</p>
                <button
                  type="button"
                  onClick={() => setSelectedRating('all')}
                  className="mt-3 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Show all reviews
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((review) => {
                  const isHidden = review.status === 'hidden';
                  const isEditing = editingReplyId === review.id;
                  const isNewReply = newReplyId === review.id;
                  const initials = review.public_name
                    ? review.public_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'U';
                  
                  return (
                    <article
                      key={review.id}
                      className={`border rounded-2xl p-6 bg-white dark:bg-[#131B17] shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-[#26322B] transition-all duration-300 ${
                        isHidden 
                          ? 'border-slate-200 dark:border-[#26322B] opacity-60' 
                          : 'border-slate-100 dark:border-[#26322B]'
                      }`}
                    >
                      {/* Review header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#26322B] border border-slate-100 dark:border-[#26322B] flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 tracking-tighter">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{review.public_name}</span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30">
                                <BadgeCheck className="w-3 h-3" /> Verified
                              </span>
                              {isHidden && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-[#26322B] text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-[#26322B]">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 flex flex-wrap gap-x-2">
                              <span>Reviewed on {formatDate(review.created_at)}</span>
                              {review.updated_at && new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 1000 && (
                                <span className="text-[#25D958]/85 font-bold">(Edited on {formatDate(review.updated_at)})</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Admin action icons */}
                        {user && (user.id === review.user_id || isAdmin) && (
                          <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-[#26322B] rounded-lg p-0.5 border border-slate-150 dark:border-[#26322B]/60">
                            {isAdmin && (
                              <button
                                onClick={() => handleToggleStatus(review)}
                                disabled={savingId === review.id}
                                className={`p-1.5 rounded-md transition-all disabled:opacity-50 ${
                                  isHidden
                                    ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                    : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                }`}
                                title={isHidden ? 'Publish review' : 'Hide review'}
                              >
                                {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {user.id === review.user_id && (
                              <button
                                onClick={() => {
                                  setEditingReview(review);
                                  setEditRating(review.rating);
                                  setEditTitle(review.title);
                                  setEditComment(review.comment || '');
                                  setEditPublicName(review.public_name || user?.full_name || '');
                                  let mediaUrls = [];
                                  try {
                                    mediaUrls = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
                                  } catch {
                                    mediaUrls = [];
                                  }
                                  setEditExistingMedia(mediaUrls);
                                  setEditFiles([]);
                                }}
                                className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-primary dark:hover:text-[#25D958] hover:bg-slate-50 dark:hover:bg-[#19231F] rounded-md transition-all"
                                title="Edit Review"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(review.id)}
                              className="p-1.5 text-slate-400 dark:text-slate-450 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-all"
                              title="Delete Review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Rating stars & Title */}
                      <div className="mt-4 flex items-center gap-2">
                        <StarRating value={review.rating} size="sm" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{review.title}</h4>
                      </div>

                      {/* Comment body */}
                      {review.comment && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5 whitespace-pre-line font-medium">
                          {review.comment}
                        </p>
                      )}

                      {/* Media attachments */}
                      {(() => {
                        let mediaUrls = [];
                        try {
                          mediaUrls = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
                        } catch {
                          mediaUrls = [];
                        }
                        return Array.isArray(mediaUrls) && mediaUrls.length > 0 && (
                          <div className="flex gap-2.5 overflow-x-auto mt-4 pb-1">
                             {mediaUrls.map((media, idx) => {
                               const mediaUrl = typeof media === 'string' ? media : media.url;
                               const mediaType = (typeof media === 'string' ? '' : media.type) || (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') ? 'video' : 'image');
                               const globalIndex = mediaItems.findIndex(item => item.review?.id === review.id && item.url === mediaUrl);
                               return (
                               <button
                                 type="button"
                                 key={`${review.id}-${idx}`}
                                 onClick={() => setSelectedMediaIndex(Math.max(globalIndex, 0))}
                                 className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-150 bg-slate-50 shrink-0 hover:border-primary hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all group"
                               >
                                 {mediaType === 'video' ? (
                                   <>
                                     <video src={`${formatImageUrl(mediaUrl)}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                     <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                                       <Play className="h-4 w-4 fill-white text-white" />
                                     </span>
                                   </>
                                 ) : (
                                   <img src={formatImageUrl(mediaUrl)} alt="" className="w-full h-full object-cover" />
                                 )}
                               </button>
                             )})}
                          </div>
                        );
                      })()}

                      {/* Official Reply — Display Mode */}
                      {review.admin_reply && !isEditing && (
                        <div className="mt-4 rounded-xl border-l-4 border-l-primary border border-slate-100 dark:border-[#26322B] bg-slate-50/50 dark:bg-[#131B17] p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                              <span>Durga Shakti Foils</span>
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-emerald-50/60 dark:bg-emerald-950/35 px-2 py-0.5 text-[8px] text-primary">
                                <BadgeCheck className="h-3 w-3" /> Verified Official
                              </span>
                              {review.admin_reply_at && (
                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold normal-case font-mono">
                                  Replied on {formatDate(review.admin_reply_at)}
                                </span>
                              )}
                            </div>
                            {isAdmin && (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReplyId(review.id);
                                    setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' }));
                                  }}
                                  className="rounded-lg border border-slate-200 dark:border-[#26322B]/80 bg-white dark:bg-[#19231F] p-1 text-slate-600 dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-[#131B17]"
                                  title="Edit reply"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReply(review.id)}
                                  disabled={savingId === review.id}
                                  className="rounded-lg border border-slate-200 dark:border-[#26322B]/80 bg-white dark:bg-[#19231F] p-1 text-rose-600 transition-all hover:bg-slate-50 dark:hover:bg-[#131B17] disabled:opacity-50"
                                  title="Delete reply"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">{review.admin_reply}</p>
                        </div>
                      )}

                      {/* Official Reply — Edit Mode */}
                      {(isEditing || isNewReply) && (
                        <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#26322B] bg-slate-50 dark:bg-[#131B17] p-4 space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <MessageSquareReply className="w-3.5 h-3.5 text-primary" />
                            {review.admin_reply ? 'Edit Official Reply' : 'New Official Reply'}
                          </label>
                          <textarea
                            value={replyDrafts[review.id] || ''}
                            onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                            rows={3}
                            placeholder="Reply as Durga Shakti Foils..."
                            className="w-full rounded-xl border border-slate-200 dark:border-[#26322B] bg-white dark:bg-[#0C1310] p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            autoFocus
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingReplyId(null); setNewReplyId(null); setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' })); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#26322B] bg-white dark:bg-[#19231F] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#131B17]"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveReply(review.id)}
                              disabled={savingId === review.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white disabled:opacity-50 hover:bg-[#005a14]"
                            >
                              <Check className="h-3 w-3" />
                              {review.admin_reply ? 'Update' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Admin: Add reply button */}
                      {isAdmin && !review.admin_reply && !isNewReply && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setNewReplyId(review.id);
                              setReplyDrafts((d) => ({ ...d, [review.id]: '' }));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/5 border border-primary/25 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all"
                          >
                            <MessageSquareReply className="h-3 w-3" />
                            Official Reply
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {filteredAndSortedReviews.length > visibleCount && (
          <div className="mt-8 md:ml-[312px]">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => Math.min(prev + 5, filteredAndSortedReviews.length))}
              className="w-full rounded-xl border border-slate-200 bg-white px-6 py-4 text-center text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-primary hover:text-primary hover:bg-slate-50"
            >
              See more reviews
            </button>
          </div>
        )}
        </>
      )}

      {!loading && count === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center max-w-lg mx-auto">
          <Camera className="w-8 h-8 text-slate-350 mx-auto mb-3" />
          <p className="font-bold text-slate-700 text-sm">No reviews yet</p>
          <p className="text-xs text-slate-400 mt-1">Purchased customers can review this product from their My Orders section.</p>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#131B17] border border-[#26322B] shadow-2xl p-6 md:p-8 text-white space-y-6 animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setEditingReview(null)}
              className="absolute right-6 top-6 rounded-full bg-[#0C1310]/90 p-2 text-white border border-[#26322B] shadow-sm hover:bg-[#19231F] transition-all hover:scale-105"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xl font-bold uppercase tracking-wider text-white">Edit Your Review</h3>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-350 mb-2">Overall rating</label>
                <StarRating value={editRating} interactive onChange={setEditRating} size="lg" />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-350 mb-2">Write a review</label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What should other customers know?"
                  className="w-full rounded-xl border border-[#26322B] bg-[#0C1310] text-white px-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-350 mb-2">Share a video or photo</label>
                <label className="h-20 border border-dashed border-[#26322B] rounded-xl bg-[#0C1310] hover:bg-[#18231e] transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-450">
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upload media</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []).slice(0, 6);
                      setEditFiles(selected);
                    }}
                  />
                </label>

                {/* Edit New files preview grid */}
                {editFilePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Selected new files to upload</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {editFilePreviews.map((preview, index) => (
                        <div key={`${preview.name}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#26322B] bg-[#0C1310] group">
                          {preview.type === 'video' ? (
                            <video src={`${preview.url}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={preview.url} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setEditFiles(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Existing files preview grid */}
                {editExistingMedia.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Uploaded media</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {editExistingMedia.map((media, index) => {
                        const mediaUrl = typeof media === 'string' ? media : media.url;
                        const mediaType = (typeof media === 'string' ? '' : media.type) || '';
                        const isVideo = mediaType.startsWith('video') || /\.(mp4|webm|mov)$/i.test(mediaUrl || '');
                        const fullUrl = formatImageUrl(mediaUrl);

                        return (
                          <div key={`${mediaUrl}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#26322B] bg-[#0C1310] group">
                            {isVideo ? (
                              <video src={`${fullUrl}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={fullUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => setEditExistingMedia(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-slate-350 mb-2">Title your review <span className="font-semibold text-slate-500">(required)</span></label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={140}
                  placeholder="What's most important to know?"
                  className="w-full h-11 rounded-xl border border-[#26322B] bg-[#0C1310] text-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-350 mb-2">What is your public name? <span className="font-semibold text-slate-500">(required)</span></label>
                <input
                  value={editPublicName}
                  onChange={(e) => setEditPublicName(e.target.value)}
                  maxLength={120}
                  className="w-full h-11 rounded-xl border border-[#26322B] bg-[#0C1310] text-white px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingReview(null)} className="rounded-full font-bold uppercase tracking-wider text-[10px] h-9 px-5 border border-[#26322B] bg-[#0C1310] text-slate-350 hover:border-[#25D958] hover:text-[#25D958] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submittingEdit} className="rounded-full bg-[#25D958] hover:bg-[#20bd4c] text-[#0C1310] font-black px-8 h-9 text-xs uppercase tracking-wider shadow-sm hover:shadow-emerald-glow transition-all">
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedMedia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative grid max-h-[88vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[minmax(0,1fr)_360px]">
            <button
              type="button"
              onClick={() => setSelectedMediaIndex(null)}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm hover:bg-white focus:outline-none"
              aria-label="Close review media"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex min-h-[420px] items-center justify-center bg-slate-950">
              {mediaItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => shiftSelectedMedia(-1)}
                  className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white focus:outline-none"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {selectedMedia.type === 'video' ? (
                <video src={formatImageUrl(selectedMedia.url)} className="max-h-[88vh] w-full object-contain" controls autoPlay playsInline />
              ) : (
                <img src={formatImageUrl(selectedMedia.url)} alt="" className="max-h-[88vh] w-full object-contain" />
              )}
              {mediaItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => shiftSelectedMedia(1)}
                  className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white focus:outline-none"
                  aria-label="Next media"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>
            <aside className="max-h-[88vh] overflow-y-auto p-6 bg-slate-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer review</p>
              <div className="mt-4">
                <StarRating value={selectedMedia.review.rating} />
                <h3 className="mt-3 text-base font-bold text-slate-900">{selectedMedia.review.title}</h3>
                <p className="mt-1 text-[10px] text-slate-400 font-semibold">
                  By {selectedMedia.review.public_name} on {formatDate(selectedMedia.review.created_at)}
                </p>
                {selectedMedia.review.comment && (
                  <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-600 whitespace-pre-line">{selectedMedia.review.comment}</p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-slate-200">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.review.id}-modal-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`h-14 w-14 overflow-hidden rounded-xl border bg-slate-50 transition-all ${selectedMediaIndex === index ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-slate-200'}`}
                  >
                    {media.type === 'video' ? (
                      <div className="relative h-full w-full">
                        <video src={`${formatImageUrl(media.url)}#t=0.001`} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </div>
                    ) : (
                      <img src={formatImageUrl(media.url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
