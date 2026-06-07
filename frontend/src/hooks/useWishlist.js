import { useState, useCallback, useEffect } from 'react';
import wishlistService from '../services/wishlist.service';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState(() => {
    const cached = wishlistService.getCached ? wishlistService.getCached() : null;
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = wishlistService.getCached ? wishlistService.getCached() : null;
    return !cached;
  });
  const { refreshUser } = useAuth();

  const fetchWishlist = useCallback(async (silent = false) => {
    const cached = wishlistService.getCached ? wishlistService.getCached() : null;
    if (!silent && (!cached || cached.length === 0)) {
      setLoading(true);
    }
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleWishlist = async (productId) => {
    const previousWishlist = [...wishlist];
    // Optimistic update: instantly remove item from UI state
    setWishlist(prev => prev.filter(item => String(item.id) !== String(productId)));
    toast.success('Removed from wishlist');

    try {
      await wishlistService.toggleWishlist(productId);
      if (refreshUser) refreshUser();
      // Silently refetch in the background to ensure synchronization
      await fetchWishlist(true);
    } catch (err) {
      // Rollback on failure
      setWishlist(previousWishlist);
      toast.error('Failed to update wishlist');
    }
  };

  const clearWishlist = async () => {
    try {
      await wishlistService.clearWishlist();
      setWishlist([]);
      if (refreshUser) refreshUser();
      toast.success('Wishlist cleared');
    } catch (err) {
      toast.error('Failed to clear wishlist');
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return { wishlist, loading, fetchWishlist, toggleWishlist, clearWishlist };
};
