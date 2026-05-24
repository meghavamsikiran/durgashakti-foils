import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCart } from '../../../contexts/CartContext';
import { calculateCheckoutPricing } from '../../../utils/checkoutPricing';
import { getProductPricing } from '../../../utils/productPricing';

const OrderSummary = ({ products, total, checkoutStep, loading, shippingSettings, paymentMethod, onPlaceOrder }) => {
  const { cart } = useCart();
  const { shipping, codCharge, cgst, sgst, grandTotal } = calculateCheckoutPricing(total, shippingSettings, paymentMethod);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
      <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Order Summary</h3>
      <div className="space-y-4 mb-8">
        {cart.items?.map((item) => {
          const product = products[item.product_id] || item.product;
          if (!product) return null;
          const { displayPrice } = getProductPricing(product);
          return (
            <div key={item.product_id} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-xs">
                  {item.quantity}x
                </div>
                <div className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{product.name}</div>
              </div>
              <div className="font-black text-slate-900">
                ₹{(displayPrice * item.quantity).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
          <span className="font-black text-slate-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Shipping Charges</span>
          <span className="font-black text-slate-900">
            {shipping > 0 ? `₹${shipping.toFixed(2)}` : 'FREE'}
          </span>
        </div>
        {codCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">COD Handling Fee</span>
            <span className="font-black text-slate-900">₹{codCharge.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">SGST (9%)</span>
          <span className="font-black text-slate-900">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">CGST (9%)</span>
          <span className="font-black text-slate-900">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="pt-4 flex justify-between items-end">
          <span className="text-slate-900 font-black uppercase tracking-tighter">Total Amount</span>
          <div className="text-3xl font-black text-primary tracking-tighter">
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {checkoutStep === 'payment' && (
        <Button 
          onClick={onPlaceOrder}
          disabled={loading}
          className="w-full h-16 rounded-2xl mt-8 text-lg font-black uppercase tracking-widest shadow-2xl shadow-emerald-glow"
        >
          {loading ? <Loader2 className="animate-spin w-6 h-6" /> : `Pay ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </Button>
      )}
    </div>
  );
};

export default OrderSummary;
