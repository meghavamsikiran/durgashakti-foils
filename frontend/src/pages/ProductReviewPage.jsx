import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Upload, X, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import PageLoader from '../components/ui/PageLoader';
import StarRating from '../components/reviews/StarRating';
import reviewService from '../services/review.service';
import { formatImageUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const ProductReviewPage = () => {
  const { orderId, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [publicName, setPublicName] = useState(user?.full_name || '');
  const [files, setFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [selectedModalMedia, setSelectedModalMedia] = useState(null);

  useEffect(() => {
    const urls = files.map(file => {
      return { url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name };
    });
    setFilePreviews(urls);
    return () => {
      urls.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reviewService.getEligibility(productId, orderId);
        setEligibility(data);
        if (data.existing_review) {
          setRating(data.existing_review.rating || 0);
          setTitle(data.existing_review.title || '');
          setComment(data.existing_review.comment || '');
          setPublicName(data.existing_review.public_name || user?.full_name || '');
          setExistingMedia(data.existing_review.media_urls || []);
        }
      } catch {
        toast.error('Unable to load review form');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId, productId, navigate, user?.full_name]);

  const product = eligibility?.product;

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 6);
    setFiles(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }
    if (!title.trim()) {
      toast.error('Please add a review title');
      return;
    }
    if (!publicName.trim()) {
      toast.error('Please enter your public name');
      return;
    }

    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('order_id', orderId);
    formData.append('rating', String(rating));
    formData.append('title', title);
    formData.append('comment', comment);
    formData.append('public_name', publicName);
    formData.append('existing_media', JSON.stringify(existingMedia));
    files.forEach(file => formData.append('files', file));

    setSubmitting(true);
    try {
      await reviewService.submitReview(formData);
      toast.success('Thanks for sharing your review');
      navigate(`/product/${productId}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-surface flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!eligibility?.can_review) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-surface py-16 px-6">
        <div className="max-w-2xl mx-auto bg-white border border-border-subtle rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-ink-slate mb-2">Review not available</h1>
          <p className="text-sm text-slate-500 font-semibold">{eligibility?.reason || 'Only purchased customers can review this product.'}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-6 bg-primary hover:bg-emerald-hover text-white rounded-lg">
            Back to orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white border border-border-subtle rounded-xl p-6 md:p-8 shadow-sm space-y-7">
        <div className="flex items-center gap-4 border-b border-border-subtle pb-6">
          <img
            src={formatImageUrl(product?.image_url)}
            alt={product?.name}
            className="w-20 h-20 rounded-xl object-cover border border-slate-200 bg-slate-50"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-ink-slate tracking-tight">How was the item?</h1>
            <p className="text-base font-bold text-slate-700 mt-1">{product?.name}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-900 mb-3">Overall rating</label>
          <StarRating value={rating} interactive onChange={setRating} size="lg" />
        </div>

        {eligibility?.settings?.comments_enabled !== false && (
          <div>
            <label className="block text-sm font-black text-slate-900 mb-2">Write a review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What should other customers know?"
              className="w-full rounded-lg border border-border-subtle px-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-black text-slate-900 mb-2">Share a video or photo</label>
          <label className="h-24 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-500">
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider">Upload media</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
          </label>
          
          {/* New files preview grid */}
          {filePreviews.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selected new files to upload</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
                {filePreviews.map((preview, index) => (
                  <div key={`${preview.name}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    {preview.type === 'video' ? (
                      <>
                        <video src={preview.url} className="w-full h-full object-cover" muted playsInline />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModalMedia({
                              urls: filePreviews,
                              currentIndex: index,
                              title: preview.name
                            });
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <Play className="h-4 w-4 fill-current translate-x-[1px]" />
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModalMedia({
                            urls: filePreviews,
                            currentIndex: index,
                            title: preview.name
                          });
                        }}
                        className="w-full h-full"
                      >
                        <img src={preview.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing files preview grid */}
          {existingMedia.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Uploaded media</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingMedia.map((media, index) => {
                  const mediaUrl = typeof media === 'string' ? media : media.url;
                  const mediaType = (typeof media === 'string' ? '' : media.type) || '';
                  const isVideo = mediaType.startsWith('video') || /\.(mp4|webm|mov)$/i.test(mediaUrl || '');
                  const fullUrl = formatImageUrl(mediaUrl);
                  
                  const mappedExisting = existingMedia.map(m => {
                    const mUrl = typeof m === 'string' ? m : m.url;
                    const mType = (typeof m === 'string' ? '' : m.type) || '';
                    return {
                      url: mUrl,
                      type: mType.startsWith('video') || /\.(mp4|webm|mov)$/i.test(mUrl || '') ? 'video' : 'image',
                      name: 'Uploaded file'
                    };
                  });

                  return (
                    <div key={`${mediaUrl}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                      {isVideo ? (
                        <>
                          <video src={fullUrl} className="w-full h-full object-cover" muted playsInline />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModalMedia({
                                urls: mappedExisting,
                                currentIndex: index,
                                title: 'Uploaded review media'
                              });
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm group-hover:scale-110 transition-transform">
                              <Play className="h-4 w-4 fill-current translate-x-[1px]" />
                            </span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModalMedia({
                              urls: mappedExisting,
                              currentIndex: index,
                              title: 'Uploaded review media'
                            });
                          }}
                          className="w-full h-full"
                        >
                          <img src={fullUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExistingMedia(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Manage your uploaded files above, or upload additional new ones.</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-black text-slate-900 mb-2">Title your review <span className="font-semibold text-slate-500">(required)</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="What's most important to know?"
            className="w-full h-12 rounded-lg border border-border-subtle px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-black text-slate-900 mb-2">What is your public name? <span className="font-semibold text-slate-500">(required)</span></label>
          <input
            value={publicName}
            onChange={(e) => setPublicName(e.target.value)}
            maxLength={120}
            className="w-full h-12 rounded-lg border border-border-subtle px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-lg">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="rounded-lg bg-primary hover:bg-emerald-hover text-white font-black px-8 shadow-sm hover:shadow-emerald-glow transition-all">
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>

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
                const isBlob = activeItem.url.startsWith('blob:');
                if (activeItem.type === 'video') {
                  return (
                    <video
                      key={activeItem.url}
                      src={isBlob ? activeItem.url : formatImageUrl(activeItem.url)}
                      className="max-h-[70vh] w-full object-contain"
                      controls
                      autoPlay
                      playsInline
                    />
                  );
                } else {
                  return (
                    <img
                      src={isBlob ? activeItem.url : formatImageUrl(activeItem.url)}
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attachment Preview</span>
                <h3 className="mt-3 text-base font-extrabold text-slate-900 leading-tight">
                  {selectedModalMedia.title || 'Review Attachment'}
                </h3>
              </div>

              {selectedModalMedia.urls.length > 1 && (
                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Files ({selectedModalMedia.urls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedModalMedia.urls.map((item, idx) => {
                      const isBlob = item.url.startsWith('blob:');
                      const fileSrc = isBlob ? item.url : formatImageUrl(item.url);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedModalMedia(prev => ({ ...prev, currentIndex: idx }))}
                          className={`h-12 w-12 overflow-hidden rounded-lg border bg-white transition-all ${selectedModalMedia.currentIndex === idx ? 'border-primary ring-2 ring-primary/25 scale-105 shadow-sm' : 'border-slate-200 hover:border-slate-400'}`}
                        >
                          {item.type === 'video' ? (
                            <div className="relative h-full w-full">
                              <video src={fileSrc} className="h-full w-full object-cover" muted playsInline />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white">
                                <Play className="h-3.5 w-3.5 fill-current" />
                              </span>
                            </div>
                          ) : (
                            <img src={fileSrc} alt="" className="h-full w-full object-cover" />
                          )}
                        </button>
                      );
                    })}
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

export default ProductReviewPage;
