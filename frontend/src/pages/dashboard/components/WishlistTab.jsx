import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import PageLoader from '../../../components/ui/PageLoader';
import { useCart } from '../../../contexts/CartContext';
import { formatImageUrl } from '../../../utils/api';

const ITEMS_PER_PAGE = 4;

const WishlistTab = ({ wishlist, loading, onToggleWishlist, onClearWishlist }) => {
  const { addToCart } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  if (loading) return <PageLoader message="Loading wishlist..." />;

  const handleClearWishlist = async () => {
    if (window.confirm("Are you sure you want to clear your entire wishlist?")) {
      setClearing(true);
      if (onClearWishlist) {
        await onClearWishlist();
      }
      setClearing(false);
    }
  };

  const totalPages = Math.ceil((wishlist?.length || 0) / ITEMS_PER_PAGE);
  const currentItems = (wishlist || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Wishlist</h2>
        {wishlist && wishlist.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleClearWishlist} 
            disabled={clearing}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {!wishlist || wishlist.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Your wishlist is empty</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentItems.map(product => (
              <div key={product.id} className="group p-4 rounded-3xl border border-slate-200 bg-white hover:shadow-lg transition-all relative">
                <img src={formatImageUrl(product.image_url)} alt="" className="w-full h-40 object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-slate-900 truncate">{product.name}</h4>
                <p className="text-xl font-black text-indigo-600 mt-1">₹{product.price}</p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => addToCart(product.id)} className="flex-1 rounded-xl">Add to Cart</Button>
                  <Button variant="ghost" onClick={() => onToggleWishlist(product.id)} className="rounded-xl text-rose-500 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-semibold text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default WishlistTab;
