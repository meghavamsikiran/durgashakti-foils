import React from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCart } from '../../../contexts/CartContext';
import { calculateCheckoutPricing } from '../../../utils/checkoutPricing';
import { getProductPricing } from '../../../utils/productPricing';

const OrderSummary = ({ 
  products, 
  total, 
  checkoutStep, 
  loading, 
  shippingSettings, 
  paymentMethod, 
  onPlaceOrder,
  appliedCoupons = [],
  availableLoyaltyCoupons = [],
  couponInput = '',
  setCouponInput,
  validatingCoupon = false,
  onApplyCoupon,
  onRemoveCoupon
}) => {
  const { cart } = useCart();
  const { 
    shipping, 
    codCharge, 
    cgst, 
    sgst, 
    grandTotal, 
    discountAmount, 
    freeShippingApplied 
  } = calculateCheckoutPricing(total, shippingSettings, paymentMethod, appliedCoupons);

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl p-6 md:p-8 border border-border-subtle shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <h3 className="text-xl font-black text-slate-950 mb-6 tracking-tight">Order Summary</h3>
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

      {/* Promo Code Input & Badges */}
      <div className="py-5 border-t border-slate-200">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Promo Code</h4>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="ENTER PROMO CODE"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-350 bg-slate-50/50"
            disabled={validatingCoupon}
          />
          <Button 
            onClick={() => onApplyCoupon(couponInput)}
            disabled={validatingCoupon}
            className="bg-primary hover:bg-[#005a14] text-white px-5 rounded-xl text-xs font-black uppercase tracking-wider h-10 transition-all flex items-center justify-center gap-1.5"
          >
            {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
          </Button>
        </div>

        {/* Applied Coupon Badges */}
        {availableLoyaltyCoupons.length > 0 && appliedCoupons.length === 0 && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Loyal customer offers</p>
            <div className="flex flex-wrap gap-2">
              {availableLoyaltyCoupons.map((coupon) => (
                <button
                  key={coupon.id || coupon.code}
                  type="button"
                  onClick={() => onApplyCoupon(coupon.code)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-black font-mono tracking-wider hover:bg-amber-100 transition-colors"
                >
                  {coupon.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {appliedCoupons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {appliedCoupons.map((coupon) => (
              <span 
                key={coupon.id || coupon.code}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold font-mono tracking-wider shadow-sm"
              >
                {coupon.code}
                <button 
                  type="button"
                  onClick={() => onRemoveCoupon(coupon.code)}
                  className="p-0.5 hover:bg-emerald-100 rounded-full transition-colors text-emerald-600 hover:text-emerald-800"
                  title="Remove coupon"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
          <span className="font-black text-slate-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-2xl font-bold transition-all">
            <span className="uppercase tracking-widest text-[10px]">Coupon Discount</span>
            <span className="font-black font-mono">-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}

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
          className="group relative overflow-hidden w-full h-16 rounded-xl mt-8 text-sm font-black uppercase tracking-[0.18em] bg-primary hover:bg-[#005312] text-white shadow-2xl shadow-emerald-glow active:scale-[0.98] transition-all"
        >
          <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.24),transparent)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
          {loading ? (
            <Loader2 className="relative animate-spin w-6 h-6" />
          ) : paymentMethod === 'cod' ? (
            <span className="relative">Place Order</span>
          ) : (
            <span className="relative flex items-center justify-center gap-2">
              <LockKeyhole className="w-4 h-4" />
              Launch Secure Payment
            </span>
          )}
        </Button>
      )}
    </div>
  );
};

export default OrderSummary;
