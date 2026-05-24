import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Upload, X } from 'lucide-react';
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

        <div>
          <label className="block text-sm font-black text-slate-900 mb-2">Share a video or photo</label>
          <label className="h-24 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-500">
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider">Upload media</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
          </label>
          {files.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold">
                  <Upload className="w-3 h-3" />
                  {file.name}
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
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
    </div>
  );
};

export default ProductReviewPage;
