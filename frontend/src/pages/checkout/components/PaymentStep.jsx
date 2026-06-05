import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Shield, CreditCard, BadgeCheck, LockKeyhole, ScanQrCode, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { normalizeShippingSettings } from '../../../utils/checkoutPricing';

const PaymentStep = ({ paymentMethod, setPaymentMethod, onSetPaymentMethod, codEnabled = true, shippingSettings, subtotal = 0, onBack }) => {
  const selectPaymentMethod = onSetPaymentMethod || setPaymentMethod;
  const config = normalizeShippingSettings(shippingSettings);
  const minCod = config.minimumCodAmount;
  const maxCod = config.maximumCodAmount;
  const codCharge = config.codCharge;

  const paymentMethods = [{
    id: 'online',
    name: 'Online Payment (Prepaid)',
    icon: CreditCard,
    description: 'Pay securely online using Cards, UPI, NetBanking, Wallets, or scan a QR code.'
  }];
  
  if (codEnabled) {
    paymentMethods.push({
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Truck,
      description: `Pay with cash (plus ₹${codCharge} COD service charge) when your order arrives.`
    });
  }

  const protectionItems = paymentMethod === 'cod'
    ? ['Verified delivery handoff', 'Direct support coverage', 'Tamper-aware packaging']
    : ['PCI-grade Razorpay checkout', 'UPI, cards, wallets, netbanking', 'Refund tracking with bank confirmation'];

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative overflow-hidden bg-white rounded-2xl p-6 md:p-8 shadow-[0_28px_80px_rgba(15,23,42,0.08)] border border-border-subtle"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="absolute -right-24 -top-28 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute left-0 bottom-0 right-0 h-32 bg-[linear-gradient(135deg,transparent,rgba(215,219,217,0.42),transparent)] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-black mb-2">Secure Settlement</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">Payment Selection</h2>
          <p className="text-sm text-slate-500 font-semibold mt-2 max-w-xl">
            Choose the payment rail for this order. Online payments open the secure Razorpay checkout with bank-confirmed refund tracking.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-12 px-5 rounded-lg border border-border-subtle bg-white/80 text-primary font-black uppercase tracking-widest text-[10px] hover:shadow-emerald-glow"
        >
          Edit Address
        </Button>
      </div>

      <div className="relative grid gap-4">
        {paymentMethods.map((method) => {
          const isSelected = paymentMethod === method.id;
          return (
            <label
              key={method.id}
              className={`group relative overflow-hidden flex items-center gap-4 p-5 md:p-6 border rounded-xl cursor-pointer transition-all min-h-[96px] ${
                isSelected
                  ? 'border-primary bg-[linear-gradient(135deg,rgba(11,209,61,0.11),rgba(255,255,255,0.92))] shadow-emerald-glow'
                  : 'border-border-subtle bg-white hover:border-primary/40 hover:shadow-[0_18px_46px_rgba(15,23,42,0.07)]'
              }`}
            >
              {isSelected && (
                <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
              )}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.72),transparent)]" />
              <input
                type="radio"
                name="payment_method"
                value={method.id}
                checked={isSelected}
                onChange={() => selectPaymentMethod(method.id)}
                className="relative w-5 h-5 border-slate-300 focus:ring-primary text-primary cursor-pointer"
              />
              <div className={`relative p-3 rounded-xl text-white shadow-lg ${isSelected ? 'bg-primary shadow-emerald-glow' : 'bg-slate-900'}`}>
                <method.icon className="w-6 h-6" />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black tracking-tight text-slate-950">{method.name}</p>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-primary/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-primary font-black">
                      <BadgeCheck className="w-3 h-3" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold mt-1.5 text-slate-500 leading-relaxed">{method.description}</p>
              </div>
              {method.id === 'online' && (
                <div className="relative hidden md:flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <ScanQrCode className="w-4 h-4 text-primary" />
                  QR + UPI
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div className="relative mt-8 overflow-hidden rounded-2xl bg-[#0B1220] text-white border border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(11,209,61,0.2),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-emerald-glow">
                <Shield className="w-5 h-5 text-[#34e44e]" />
              </div>
              <div>
                <span className="font-mono font-black uppercase tracking-[0.22em] text-[10px] text-[#34e44e]">DurgaShakti Protection</span>
                <p className="text-sm font-semibold text-slate-300 mt-1">
                  {paymentMethod === 'cod'
                    ? 'Cash handling is supported by direct order verification.'
                    : 'Razorpay checkout is paired with order-level reconciliation and refund audit tracking.'}
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-[#34e44e] opacity-70" />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {protectionItems.map((item) => (
              <div key={item} className="min-h-12 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 flex items-center gap-2">
                <LockKeyhole className="w-3.5 h-3.5 text-[#34e44e] shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
