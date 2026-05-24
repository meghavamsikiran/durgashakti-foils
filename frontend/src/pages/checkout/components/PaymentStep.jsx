import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, CreditCard, Landmark, Truck, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { normalizeShippingSettings } from '../../../utils/checkoutPricing';

const PaymentStep = ({ paymentMethod, setPaymentMethod, onSetPaymentMethod, codEnabled = true, shippingSettings, subtotal = 0, onBack }) => {
  const selectPaymentMethod = onSetPaymentMethod || setPaymentMethod;
  const config = normalizeShippingSettings(shippingSettings);
  const minCod = config.minimumCodAmount;
  const maxCod = config.maximumCodAmount;
  const codCharge = config.codCharge;
  let isCodBelowMinimum = false;
  let isCodLimitExceeded = false;

  if (subtotal < minCod) {
    isCodBelowMinimum = true;
  }
  if (subtotal > maxCod) {
    isCodLimitExceeded = true;
  }

  const codDisabledByLimits = isCodBelowMinimum || isCodLimitExceeded;
  const isCodOptionDisabled = !codEnabled || codDisabledByLimits;

  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI',
      icon: QrCode,
      description: 'Pay via Google Pay, PhonePe, Paytm, or any UPI app'
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, RuPay & more — secured by Razorpay'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: Landmark,
      description: 'All major banks supported — SBI, HDFC, ICICI, Axis & more'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Truck,
      description: isCodOptionDisabled
        ? !codEnabled
          ? 'COD is temporarily disabled by admin.'
          : isCodBelowMinimum
          ? `COD is only available for orders above ₹${minCod}.`
          : `COD is only available for orders below ₹${maxCod}.`
        : `Pay with cash (plus ₹${codCharge} COD service charge) when your order arrives`
    }
  ];

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Payment Selection</h2>
        <Button variant="ghost" onClick={onBack} className="text-primary font-bold">Edit Address</Button>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => {
          const isDisabled = method.id === 'cod' && isCodOptionDisabled;
          return (
            <label
              key={method.id}
              className={`flex items-center gap-4 p-6 border-2 rounded-3xl transition-all ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50/50'
                  : paymentMethod === method.id
                  ? 'border-primary bg-primary/5 cursor-pointer'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={method.id}
                disabled={isDisabled}
                checked={paymentMethod === method.id}
                onChange={(e) => selectPaymentMethod && selectPaymentMethod(e.target.value)}
                className={`w-5 h-5 border-slate-300 focus:ring-primary ${isDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-primary cursor-pointer'}`}
              />
              <div className={`p-3 rounded-2xl ${isDisabled ? 'bg-slate-200 text-slate-400' : paymentMethod === method.id ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                <method.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`font-black uppercase tracking-tight ${isDisabled ? 'text-slate-400' : 'text-slate-900'}`}>{method.name}</p>
                  {isDisabled && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-500">
                      Prepaid Only
                    </span>
                  )}
                </div>
                <p className={`text-xs font-medium mt-1 ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>{method.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {codDisabledByLimits && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-start gap-4 mt-6">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-xs text-amber-800 font-medium leading-relaxed">
            <span className="font-extrabold uppercase tracking-tight block mb-0.5">COD Limit Restriction</span>
            {isCodBelowMinimum
              ? `Your cart subtotal (₹${subtotal.toLocaleString()}) is below the minimum Cash on Delivery limit of ₹${minCod}. Please add more items or choose UPI/Card payment.`
              : `Your cart subtotal (₹${subtotal.toLocaleString()}) exceeds the maximum Cash on Delivery limit of ₹${maxCod}. Please select card/UPI payment.`}
          </div>
        </div>
      )}

      {!codEnabled && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-start gap-4 mt-6">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-800 font-medium leading-relaxed">
            <span className="font-extrabold uppercase tracking-tight block mb-0.5">Prepaid Orders Only</span>
            Currently, we accept only prepaid orders. Cash on Delivery (COD) is temporarily disabled by management.
          </div>
        </div>
      )}

      <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary/70" />
          <span className="font-bold uppercase tracking-widest text-xs">Secure Transaction</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">Your payment information is encrypted and processed securely by Razorpay. We do not store your full card details.</p>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
