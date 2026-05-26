import React, { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Check, Edit2, Eye, EyeOff, MessageSquareReply, Trash2, X } from 'lucide-react';
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

  useEffect(() => {
    if (!productId) return;
    let active = true;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const data = await reviewService.getProductReviews(productId);
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
            {reviews.map((review) => {
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
                        {mediaUrls.map((media, idx) => (
                          <div key={`${review.id}-${idx}`} className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
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
            })}
          </div>
        </div>
      )}

      {!loading && count === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-container-low p-8 text-center">
          <Camera className="w-9 h-9 text-slate-300 mx-auto mb-3" />
          <p className="font-black text-slate-800">No reviews yet</p>
          <p className="text-sm text-slate-500 mt-1">Purchased customers can review this product from My Orders.</p>
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
