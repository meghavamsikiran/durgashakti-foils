import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCheckout } from '../hooks/useCheckout';

import CheckoutStepper from './checkout/components/CheckoutStepper';
import AddressStep from './checkout/components/AddressStep';
import PaymentStep from './checkout/components/PaymentStep';
import OrderSummary from './checkout/components/OrderSummary';
import { calculateCheckoutPricing } from '../utils/checkoutPricing';

const Checkout = () => {
  const {
    products,
    loading,
    checkoutStep,
    setCheckoutStep,
    paymentMethod,
    setPaymentMethod,
    codEnabled,
    shippingSettings,
    savedAddresses,
    addressesLoading,
    selectedAddressId,
    shippingInfo,
    setShippingInfo,
    handleSelectAddress,
    validateShipping,
    handlePlaceOrder,
    total,
    appliedCoupons,
    availableLoyaltyCoupons,
    couponInput,
    setCouponInput,
    validatingCoupon,
    handleApplyCoupon,
    handleRemoveCoupon
  } = useCheckout();

  const handleContinueToPayment = async () => {
    if (await validateShipping()) {
      setCheckoutStep('payment');
    }
  };

  const { grandTotal } = calculateCheckoutPricing(total, shippingSettings, paymentMethod, appliedCoupons);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 lg:pb-12">
      <CheckoutStepper step={checkoutStep} />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {checkoutStep === 'shipping' ? (
                <AddressStep
                  key="shipping"
                  savedAddresses={savedAddresses}
                  addressesLoading={addressesLoading}
                  selectedAddressId={selectedAddressId}
                  shippingInfo={shippingInfo}
                  setShippingInfo={setShippingInfo}
                  onSelectAddress={handleSelectAddress}
                  onContinue={handleContinueToPayment}
                />
              ) : (
                <PaymentStep
                  key="payment"
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  codEnabled={codEnabled}
                  shippingSettings={shippingSettings}
                  subtotal={total}
                  onBack={() => setCheckoutStep('shipping')}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <OrderSummary 
                products={products}
                total={total}
                checkoutStep={checkoutStep}
                loading={loading}
                shippingSettings={shippingSettings}
                paymentMethod={paymentMethod}
                onPlaceOrder={handlePlaceOrder}
                appliedCoupons={appliedCoupons}
                availableLoyaltyCoupons={availableLoyaltyCoupons}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                validatingCoupon={validatingCoupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
          <span className="text-xl font-black text-primary">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {checkoutStep === 'shipping' ? (
          <Button onClick={handleContinueToPayment} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">Next Step</Button>
        ) : (
          <Button onClick={handlePlaceOrder} disabled={loading} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : paymentMethod === 'cod' ? (
              'Place your Order'
            ) : (
              'Pay Now'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Checkout;
