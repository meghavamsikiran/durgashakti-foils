import { useState, useCallback, useEffect } from 'react';
import wishlistService from '../services/wishlist.service';
import { toast } from 'sonner';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
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
    try {
      await wishlistService.toggleWishlist(productId);
      fetchWishlist();
      toast.success('Wishlist updated');
    } catch (err) {
      // Handled by interceptor
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return { wishlist, loading, fetchWishlist, toggleWishlist };
};
