import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import PageLoader from '../../../components/ui/PageLoader';
import { useCart } from '../../../contexts/CartContext';
import { formatImageUrl } from '../../../utils/api';

const WishlistTab = ({ wishlist, loading, onToggleWishlist }) => {
  const { addToCart } = useCart();

  if (loading) return <PageLoader message="Loading wishlist..." />;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Wishlist</h2>
      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Your wishlist is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wishlist.map(product => (
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
      )}
    </motion.div>
  );
};

export default WishlistTab;
