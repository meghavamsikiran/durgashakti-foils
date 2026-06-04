import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Shield } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { normalizeShippingSettings } from '../../../utils/checkoutPricing';

const PaymentStep = ({ paymentMethod, setPaymentMethod, onSetPaymentMethod, codEnabled = true, shippingSettings, subtotal = 0, onBack }) => {
  const selectPaymentMethod = onSetPaymentMethod || setPaymentMethod;
  const config = normalizeShippingSettings(shippingSettings);
  const minCod = config.minimumCodAmount;
  const maxCod = config.maximumCodAmount;
  const codCharge = config.codCharge;

  useEffect(() => {
    if (selectPaymentMethod && paymentMethod !== 'cod') {
      selectPaymentMethod('cod');
    }
  }, [paymentMethod, selectPaymentMethod]);

  const paymentMethods = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Truck,
      description: `Pay with cash (plus ₹${codCharge} COD service charge) when your order arrives. Currently, this is the only supported payment option.`
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
          return (
            <label
              key={method.id}
              className="flex items-center gap-4 p-6 border-2 rounded-3xl border-primary bg-primary/5 cursor-pointer"
            >
              <input
                type="radio"
                name="payment_method"
                value={method.id}
                checked={true}
                readOnly
                className="w-5 h-5 border-slate-300 focus:ring-primary text-primary cursor-pointer"
              />
              <div className="p-3 rounded-2xl bg-primary text-white">
                <method.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black uppercase tracking-tight text-slate-900">{method.name}</p>
                </div>
                <p className="text-xs font-medium mt-1 text-slate-500">{method.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary/70" />
          <span className="font-bold uppercase tracking-widest text-xs">DurgaShakti Protection</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">Your order is backed by DurgaShakti Foils directly. Simply verify your items and hand over the cash upon delivery.</p>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
