import { useState, useCallback, useEffect } from 'react';
import wishlistService from '../services/wishlist.service';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  const fetchWishlist = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      if (!silent) setLoading(false);
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
