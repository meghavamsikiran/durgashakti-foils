import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, CreditCard, Landmark, Truck, Shield } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const PaymentStep = ({ paymentMethod, onSetPaymentMethod, onBack }) => {
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
      description: 'Pay with cash when your order arrives'
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
        <Button variant="ghost" onClick={onBack} className="text-indigo-600 font-bold">Edit Address</Button>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center gap-4 p-6 border-2 rounded-3xl cursor-pointer transition-all ${
              paymentMethod === method.id
                ? 'border-indigo-600 bg-indigo-50/30'
                : 'border-slate-200 hover:border-slate-200 bg-slate-50/50'
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value={method.id}
              checked={paymentMethod === method.id}
              onChange={(e) => onSetPaymentMethod(e.target.value)}
              className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600"
            />
            <div className={`p-3 rounded-2xl ${paymentMethod === method.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <method.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900 uppercase tracking-tight">{method.name}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">{method.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-indigo-400" />
          <span className="font-bold uppercase tracking-widest text-xs">Secure Transaction</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">Your payment information is encrypted and processed securely by Razorpay. We do not store your full card details.</p>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
