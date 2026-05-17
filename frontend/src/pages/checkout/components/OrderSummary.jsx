import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCart } from '../../../contexts/CartContext';

const OrderSummary = ({ products, total, checkoutStep, loading, onPlaceOrder }) => {
  const { cart } = useCart();

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Order Summary</h3>
      <div className="space-y-4 mb-8">
        {cart.items?.map((item) => {
          const product = products[item.product_id];
          if (!product) return null;
          return (
            <div key={item.product_id} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-xs">
                  {item.quantity}x
                </div>
                <div className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{product.name}</div>
              </div>
              <div className="font-black text-slate-900">
                ₹{((product.discount_price || product.price) * item.quantity).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
          <span className="font-black text-slate-900">₹{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Shipping</span>
          <span className="font-black text-emerald-500 uppercase tracking-widest text-[10px]">Free</span>
        </div>
        <div className="pt-4 flex justify-between items-end">
          <span className="text-slate-900 font-black uppercase tracking-tighter">Total Amount</span>
          <div className="text-3xl font-black text-indigo-600 tracking-tighter">₹{total.toLocaleString()}</div>
        </div>
      </div>

      {checkoutStep === 'payment' && (
        <Button 
          onClick={onPlaceOrder}
          disabled={loading}
          className="w-full h-16 rounded-2xl mt-8 text-lg font-black uppercase tracking-widest shadow-2xl shadow-indigo-100"
        >
          {loading ? <Loader2 className="animate-spin w-6 h-6" /> : `Pay ₹${total.toLocaleString()}`}
        </Button>
      )}
    </div>
  );
};

export default OrderSummary;
