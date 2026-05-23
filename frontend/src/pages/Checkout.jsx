import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCheckout } from '../hooks/useCheckout';

import CheckoutStepper from './checkout/components/CheckoutStepper';
import AddressStep from './checkout/components/AddressStep';
import PaymentStep from './checkout/components/PaymentStep';
import OrderSummary from './checkout/components/OrderSummary';

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
    selectedAddressId,
    shippingInfo,
    setShippingInfo,
    handleSelectAddress,
    validateShipping,
    handlePlaceOrder,
    total
  } = useCheckout();

  const handleContinueToPayment = async () => {
    if (await validateShipping()) {
      setCheckoutStep('payment');
    }
  };

  // Calculate dynamic totals for the sticky footer and rendering
  let shippingCost = 70.0;
  let enableFreeShipping = true;
  let freeShippingThreshold = 1099.0;
  let enableShipping = true;
  let codCharge = 40.0;

  if (shippingSettings) {
    enableShipping = shippingSettings.enableShipping !== false;
    enableFreeShipping = shippingSettings.enableFreeShipping !== false;
    freeShippingThreshold = Number(shippingSettings.freeShippingThreshold ?? 1099);
    shippingCost = Number(shippingSettings.defaultShippingCharge ?? 70);
    codCharge = Number(shippingSettings.codCharge ?? 40);
  }

  let calculatedShipping = 0;
  if (enableShipping) {
    if (enableFreeShipping && total >= freeShippingThreshold) {
      calculatedShipping = 0;
    } else {
      calculatedShipping = shippingCost;
    }
  }

  let activeCodCharge = 0;
  if (paymentMethod === 'cod') {
    activeCodCharge = codCharge;
  }

  const grandTotal = total + calculatedShipping + (total * 0.18) + activeCodCharge;

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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
          <span className="text-xl font-black text-indigo-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {checkoutStep === 'shipping' ? (
          <Button onClick={handleContinueToPayment} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">Next Step</Button>
        ) : (
          <Button onClick={handlePlaceOrder} disabled={loading} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Pay Now'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Checkout;
