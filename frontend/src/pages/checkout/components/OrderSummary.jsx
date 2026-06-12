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
  onRemoveCoupon,
  shippingAddress
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
  } = calculateCheckoutPricing(total, shippingSettings, paymentMethod, appliedCoupons, shippingAddress);

  return (
    <div className="relative overflow-hidden bg-[#131B17] rounded-2xl p-6 md:p-8 border border-[#26322B] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26322B] to-transparent" />
      <h3 className="text-xl font-bold text-white mb-6 tracking-wide">Order Summary</h3>
      <div className="space-y-4 mb-8">
        {cart.items?.map((item) => {
          const product = products[item.product_id] || item.product;
          if (!product) return null;
          const { displayPrice } = getProductPricing(product);
          return (
            <div key={item.product_id} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#25D958] border border-[#25D958]/20 flex items-center justify-center font-bold text-xs text-white">
                  {item.quantity}x
                </div>
                <div className="text-sm font-bold text-slate-300 truncate max-w-[120px]">{product.name}</div>
              </div>
              <div className="font-extrabold text-white">
                ₹{(displayPrice * item.quantity).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Code Input & Badges */}
      <div className="py-5 border-t border-[#26322B]">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Promo Code</h4>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="ENTER PROMO CODE"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2.5 border border-[#26322B] rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#25D958] focus:border-[#25D958] placeholder-slate-500 bg-[#0C1310] text-white"
            disabled={validatingCoupon}
          />
          <Button 
            onClick={() => onApplyCoupon(couponInput)}
            disabled={validatingCoupon}
            className="bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] px-5 rounded-xl text-xs font-bold uppercase tracking-wider h-10 transition-all flex items-center justify-center gap-1.5"
          >
            {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
          </Button>
        </div>

        {/* Applied Coupon Badges */}
        {availableLoyaltyCoupons.length > 0 && appliedCoupons.length === 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2 font-mono">Loyal customer offers</p>
            <div className="flex flex-wrap gap-2">
              {availableLoyaltyCoupons.map((coupon) => (
                <button
                  key={coupon.id || coupon.code}
                  type="button"
                  onClick={() => onApplyCoupon(coupon.code)}
                  className="px-3 py-1.5 rounded-xl bg-[#0C1310] border border-amber-500/30 text-amber-400 text-xs font-bold font-mono tracking-wider hover:bg-[#131B17] transition-colors"
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
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/30 rounded-xl text-xs font-bold font-mono tracking-wider shadow-sm"
              >
                {coupon.code}
                <button 
                  type="button"
                  onClick={() => onRemoveCoupon(coupon.code)}
                  className="p-0.5 hover:bg-[#25D958]/20 rounded-full transition-colors text-[#25D958]"
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

      <div className="space-y-4 pt-6 border-t border-[#26322B]">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">Subtotal</span>
          <span className="font-extrabold text-white">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-[#25D958] bg-[#25D958]/5 border border-[#25D958]/20 p-3 rounded-2xl font-bold transition-all">
            <span className="uppercase tracking-wider text-[10px] font-mono">Coupon Discount</span>
            <span className="font-extrabold font-mono">-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">Shipping Charges</span>
          <span className="font-extrabold text-white">
            {shipping > 0 ? `₹${shipping.toFixed(2)}` : 'FREE'}
          </span>
        </div>
        {codCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">COD Handling Fee</span>
            <span className="font-extrabold text-white">₹{codCharge.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">SGST (9%)</span>
          <span className="font-extrabold text-white">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono">CGST (9%)</span>
          <span className="font-extrabold text-white">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="pt-4 border-t border-[#26322B] flex justify-between items-end">
          <span className="text-white font-bold uppercase tracking-wide">Total Amount</span>
          <div className="text-3xl font-extrabold text-[#25D958] tracking-tight">
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {checkoutStep === 'payment' && (
        <Button 
          onClick={onPlaceOrder}
          disabled={loading}
          className="group relative overflow-hidden w-full h-16 rounded-xl mt-8 text-sm font-black uppercase tracking-[0.18em] bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] transition-all shadow-[0_4px_20px_rgba(37,217,88,0.2)] active:scale-[0.98]"
        >
          <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.24),transparent)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
          {loading ? (
            <Loader2 className="relative animate-spin w-6 h-6 text-[#0C1310]" />
          ) : paymentMethod === 'cod' ? (
            <span className="relative">Place Order</span>
          ) : (
            <span className="relative flex items-center justify-center gap-2">
              <LockKeyhole className="w-4 h-4 text-[#0C1310]" />
              Place Order
            </span>
          )}
        </Button>
      )}
    </div>
  );
};

export default OrderSummary;
