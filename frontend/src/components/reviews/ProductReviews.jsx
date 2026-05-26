import React, { useEffect, useState } from 'react';
import { BadgeCheck, Camera, Check, Edit2, Trash2, X } from 'lucide-react';
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
  const [savingReplyId, setSavingReplyId] = useState(null);

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
    return () => {
      active = false;
    };
  }, [productId]);

  const handleDelete = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await reviewService.deleteReview(reviewId);
        toast.success('Review deleted successfully');
        // Refresh reviews list locally
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        // Refresh summary
        const data = await reviewService.getProductReviews(productId);
        setRatingSummary(data);
      } catch {
        toast.error('Failed to delete review');
      }
    }
  };

  const refreshReviews = async () => {
    const data = await reviewService.getProductReviews(productId);
    const nextReviews = data.items || [];
    setReviews(nextReviews);
    setRatingSummary(data);
    setReplyDrafts(nextReviews.reduce((acc, review) => {
      acc[review.id] = review.admin_reply || '';
      return acc;
    }, {}));
  };

  const handleSaveReply = async (reviewId) => {
    setSavingReplyId(reviewId);
    try {
      await reviewService.replyToReview(reviewId, replyDrafts[reviewId] || '');
      toast.success('Official reply updated');
      setEditingReplyId(null);
      await refreshReviews();
    } catch {
      toast.error('Failed to update reply');
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm('Delete the official reply on this review?')) return;
    setSavingReplyId(reviewId);
    try {
      await reviewService.deleteReviewReply(reviewId);
      toast.success('Official reply deleted');
      setEditingReplyId(null);
      await refreshReviews();
    } catch {
      toast.error('Failed to delete reply');
    } finally {
      setSavingReplyId(null);
    }
  };

  const average = ratingSummary.rating_average ?? summary?.rating_average ?? 0;
  const count = ratingSummary.review_count ?? summary?.review_count ?? 0;
  const distribution = ratingSummary.rating_distribution || {};
  const ratingsEnabled = ratingSummary.settings?.ratings_enabled !== false;
  const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN';

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
            {[5, 4, 3, 2, 1].map((rating) => {
              const amount = distribution[String(rating)] || 0;
              const percent = count ? Math.round((amount / count) * 100) : 0;
              return (
                <div key={rating} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="w-8">{rating} star</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-9 text-right">{percent}%</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-5">
            {reviews.map((review) => (
              <article key={review.id} className="border border-border-subtle rounded-xl p-5 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StarRating value={review.rating} />
                    <h3 className="mt-2 font-black text-slate-900">{review.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      By {review.public_name} on {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user && (user.id === review.user_id || user.role === 'admin' || user.role === 'SUPER_ADMIN') && (
                      <div className="flex items-center gap-1.5 mr-1">
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
                </div>
                {review.comment && <p className="text-sm text-slate-700 leading-relaxed mt-4">{review.comment}</p>}
                {review.admin_reply && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        <span>Reply from Durga Shakti Foils</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/70 px-2 py-0.5 text-[9px] text-emerald-700">
                          <BadgeCheck className="h-3 w-3" />
                          Official verified
                        </span>
                      </div>
                      {isAdmin && editingReplyId !== review.id && (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReplyId(review.id);
                              setReplyDrafts((prev) => ({ ...prev, [review.id]: review.admin_reply || '' }));
                            }}
                            className="rounded-lg border border-emerald-200 bg-white/80 p-1.5 text-emerald-700 transition-all hover:bg-white"
                            title="Edit official reply"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReply(review.id)}
                            disabled={savingReplyId === review.id}
                            className="rounded-lg border border-rose-100 bg-white/80 p-1.5 text-rose-600 transition-all hover:bg-white disabled:opacity-50"
                            title="Delete official reply"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                    {editingReplyId === review.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={replyDrafts[review.id] || ''}
                          onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-emerald-200 bg-white/90 p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReplyId(null);
                              setReplyDrafts((prev) => ({ ...prev, [review.id]: review.admin_reply || '' }));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveReply(review.id)}
                            disabled={savingReplyId === review.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{review.admin_reply}</p>
                    )}
                  </div>
                )}
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
              </article>
            ))}
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
