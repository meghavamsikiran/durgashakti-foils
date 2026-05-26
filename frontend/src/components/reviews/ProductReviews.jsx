import React, { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Check, ChevronLeft, ChevronRight, Edit2, Eye, EyeOff, MessageSquareReply, Play, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import reviewService from '../../services/review.service';
import { formatImageUrl } from '../../utils/api';
import StarRating from './StarRating';
import { useAuth } from '../../contexts/AuthContext';

const ProductReviews = ({ productId, summary }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(summary || {});
  const [loading, setLoading] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [newReplyId, setNewReplyId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);

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

  const average = ratingSummary.rating_average ?? summary?.rating_average ?? 0;
  const count = ratingSummary.review_count ?? summary?.review_count ?? 0;
  const distribution = ratingSummary.rating_distribution || {};
  const ratingsEnabled = ratingSummary.settings?.ratings_enabled !== false;
  const normalizeReviewMedia = (review) => {
    try {
      const media = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
      return Array.isArray(media) ? media.filter(item => item?.url).map(item => ({ ...item, review })) : [];
    } catch {
      return [];
    }
  };
  const mediaItems = reviews.flatMap(normalizeReviewMedia);
  const visibleReviews = reviews.slice(0, visibleCount);
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
    <section className="mt-14 border-t border-border-subtle pt-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-ink-slate font-manrope">
            Customer Reviews
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <StarRating value={average} count={count} size="md" />
            {count > 0 && <span className="text-sm font-semibold text-slate-500">Verified purchase reviews</span>}
          </div>
        </div>
      </div>

      {count > 0 && (
        <>
        {mediaItems.length > 0 && (
          <div className="mb-8 border-b border-border-subtle pb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black tracking-tight text-ink-slate font-manrope">Reviews with images & videos</h3>
              {mediaItems.length > 6 && (
                <button
                  type="button"
                  onClick={() => setSelectedMediaIndex(0)}
                  className="text-sm font-bold text-primary hover:text-emerald-700"
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
                  className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary hover:text-primary"
                  aria-label="Previous review media"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div id={`review-media-strip-${productId}`} className="flex gap-3 overflow-x-auto scroll-smooth pb-1">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.review.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className="relative h-32 w-44 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {media.type === 'video' ? (
                      <>
                        <video src={formatImageUrl(media.url)} className="h-full w-full object-cover" muted playsInline />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm">
                            <Play className="h-5 w-5 fill-current" />
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
                  className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary hover:text-primary"
                  aria-label="Next review media"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((r) => {
              const amount = distribution[String(r)] || 0;
              const percent = count ? Math.round((amount / count) * 100) : 0;
              return (
                <div key={r} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="w-8">{r} star</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-9 text-right">{percent}%</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4 animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                        <div className="h-3 bg-slate-200 rounded w-32 mt-2"></div>
                      </div>
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className="h-3.5 bg-slate-200 rounded w-full"></div>
                      <div className="h-3.5 bg-slate-200 rounded w-5/6 mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              visibleReviews.map((review) => {
              const isHidden = review.status === 'hidden';
              const isEditing = editingReplyId === review.id;
              const isNewReply = newReplyId === review.id;
              return (
                <article
                  key={review.id}
                  className={`border rounded-xl p-5 bg-white shadow-sm transition-all ${isHidden ? 'border-slate-200 opacity-60' : 'border-border-subtle'}`}
                >
                  {/* Review header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StarRating value={review.rating} />
                        {isHidden && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                            Hidden
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-black text-slate-900">{review.title}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        By {review.public_name} on {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Admin action icons — always visible, compact */}
                    {user && (user.id === review.user_id || isAdmin) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(review)}
                            disabled={savingId === review.id}
                            className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${
                              isHidden
                                ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isHidden ? 'Publish review' : 'Hide review'}
                          >
                            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        )}
                        {user.id === review.user_id && (
                          <button
                            onClick={() => navigate(`/review/${review.order_id}/${productId}`)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                            title="Edit Review"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment body */}
                  {review.comment && <p className="text-sm text-slate-700 leading-relaxed mt-4">{review.comment}</p>}

                  {/* Media attachments */}
                  {(() => {
                    let mediaUrls = [];
                    try {
                      mediaUrls = typeof review.media_urls === 'string' ? JSON.parse(review.media_urls) : (review.media_urls || []);
                    } catch {
                      mediaUrls = [];
                    }
                    return Array.isArray(mediaUrls) && mediaUrls.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto mt-4">
                        {mediaUrls.map((media, idx) => {
                          const globalIndex = mediaItems.findIndex(item => item.review.id === review.id && item.url === media.url);
                          return (
                          <button
                            type="button"
                            key={`${review.id}-${idx}`}
                            onClick={() => setSelectedMediaIndex(Math.max(globalIndex, 0))}
                            className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            {media.type === 'video' ? (
                              <>
                                <video src={formatImageUrl(media.url)} className="w-full h-full object-cover" muted playsInline />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                  <Play className="h-5 w-5 fill-current" />
                                </span>
                              </>
                            ) : (
                              <img src={formatImageUrl(media.url)} alt="" className="w-full h-full object-cover" />
                            )}
                          </button>
                        )})}
                      </div>
                    );
                  })()}

                  {/* Official Reply — display mode */}
                  {review.admin_reply && !isEditing && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          <span>Reply from Durga Shakti Foils</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/70 px-2 py-0.5 text-[9px] text-emerald-700">
                            <BadgeCheck className="h-3 w-3" />
                            Official verified
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReplyId(review.id);
                                setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' }));
                              }}
                              className="rounded-lg border border-emerald-200 bg-white/80 p-1.5 text-emerald-700 transition-all hover:bg-white"
                              title="Edit reply"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReply(review.id)}
                              disabled={savingId === review.id}
                              className="rounded-lg border border-rose-100 bg-white/80 p-1.5 text-rose-600 transition-all hover:bg-white disabled:opacity-50"
                              title="Delete reply"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{review.admin_reply}</p>
                    </div>
                  )}

                  {/* Official Reply — edit mode */}
                  {(isEditing || isNewReply) && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-slate-50 p-4 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <MessageSquareReply className="w-3.5 h-3.5 text-primary" />
                        {review.admin_reply ? 'Edit Official Reply' : 'New Official Reply'}
                      </label>
                      <textarea
                        value={replyDrafts[review.id] || ''}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                        rows={3}
                        placeholder="Reply as Durga Shakti Foils..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingReplyId(null); setNewReplyId(null); setReplyDrafts((d) => ({ ...d, [review.id]: review.admin_reply || '' })); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveReply(review.id)}
                          disabled={savingId === review.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 hover:bg-[#005a14]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {review.admin_reply ? 'Update' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin: Add reply button (when no reply exists and not editing) */}
                  {isAdmin && !review.admin_reply && !isNewReply && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setNewReplyId(review.id);
                          setReplyDrafts((d) => ({ ...d, [review.id]: '' }));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
                      >
                        <MessageSquareReply className="h-3.5 w-3.5" />
                        Reply
                      </button>
                    </div>
                  )}
                </article>
              );
            }))}
          </div>
        </div>
        {reviews.length > visibleCount && (
          <div className="mt-8 md:ml-[292px]">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => Math.min(prev + 5, reviews.length))}
              className="w-full rounded-xl border border-slate-200 bg-white px-6 py-4 text-left text-sm font-black text-primary shadow-sm transition-all hover:border-primary hover:bg-emerald-50/40"
            >
              See more reviews
            </button>
          </div>
        )}
        </>
      )}

      {!loading && count === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-container-low p-8 text-center">
          <Camera className="w-9 h-9 text-slate-300 mx-auto mb-3" />
          <p className="font-black text-slate-800">No reviews yet</p>
          <p className="text-sm text-slate-500 mt-1">Purchased customers can review this product from My Orders.</p>
        </div>
      )}
      {selectedMedia && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative grid max-h-[88vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[minmax(0,1fr)_360px]">
            <button
              type="button"
              onClick={() => setSelectedMediaIndex(null)}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm hover:bg-white"
              aria-label="Close review media"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex min-h-[420px] items-center justify-center bg-slate-950">
              {mediaItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => shiftSelectedMedia(-1)}
                  className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-7 w-7" />
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
                  className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                  aria-label="Next media"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              )}
            </div>
            <aside className="max-h-[88vh] overflow-y-auto p-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Customer review</p>
              <div className="mt-4">
                <StarRating value={selectedMedia.review.rating} />
                <h3 className="mt-3 text-lg font-black text-slate-900">{selectedMedia.review.title}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  By {selectedMedia.review.public_name} on {new Date(selectedMedia.review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {selectedMedia.review.comment && (
                  <p className="mt-5 text-sm font-medium leading-relaxed text-slate-700">{selectedMedia.review.comment}</p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.review.id}-modal-${index}`}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border bg-slate-50 ${selectedMediaIndex === index ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200'}`}
                  >
                    {media.type === 'video' ? (
                      <div className="relative h-full w-full">
                        <video src={formatImageUrl(media.url)} className="h-full w-full object-cover" muted playsInline />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          <Play className="h-4 w-4 fill-current" />
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
