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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 lg:pb-12">
      <CheckoutStepper step={checkoutStep} />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {checkoutStep === 'shipping' ? (
                <AddressStep 
                  savedAddresses={savedAddresses}
                  selectedAddressId={selectedAddressId}
                  shippingInfo={shippingInfo}
                  onSelectAddress={handleSelectAddress}
                  onInputChange={(e) => {
                    const { name, value } = e.target;
                    setShippingInfo(prev => ({ ...prev, [name]: value }));
                  }}
                  onSetShippingInfo={setShippingInfo}
                  onContinue={handleContinueToPayment}
                />
              ) : (
                <PaymentStep 
                  paymentMethod={paymentMethod}
                  onSetPaymentMethod={setPaymentMethod}
                  codEnabled={codEnabled}
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
          <span className="text-xl font-black text-indigo-600">₹{(total + 350 + (total * 0.18)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
