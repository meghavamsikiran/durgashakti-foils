import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Shield, CreditCard, BadgeCheck, LockKeyhole, ScanQrCode, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { normalizeShippingSettings } from '../../../utils/checkoutPricing';

const PaymentStep = ({ paymentMethod, setPaymentMethod, onSetPaymentMethod, codEnabled = true, shippingSettings, subtotal = 0, onBack }) => {
  const selectPaymentMethod = onSetPaymentMethod || setPaymentMethod;
  const config = normalizeShippingSettings(shippingSettings);
  const minCod = config.minimumCodAmount;
  const maxCod = config.maximumCodAmount;
  const codCharge = config.codCharge;

  useEffect(() => {
    if (!codEnabled && paymentMethod === 'cod') {
      selectPaymentMethod('online');
    }
  }, [codEnabled, paymentMethod, selectPaymentMethod]);

  const paymentMethods = [{
    id: 'online',
    name: 'Online Payment (Prepaid)',
    icon: CreditCard,
    description: 'Pay securely online using cards, UPI, netbanking, wallets, or scan a QR code.'
  }];

  if (codEnabled) {
    paymentMethods.push({
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Truck,
      description: `Pay with cash (plus Rs ${codCharge} COD service charge) when your order arrives.`
    });
  }

  const protectionItems = paymentMethod === 'cod'
    ? ['Verified delivery handoff', 'Direct support coverage', 'Tamper-aware packaging']
    : ['Secure payment checkout', 'UPI, cards, wallets, netbanking', 'Refund tracking with bank confirmation'];

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative overflow-hidden bg-[#131B17] rounded-lg p-6 md:p-8 border border-[#26322B]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26322B] to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#25D958] font-bold mb-2">Secure Settlement</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Payment Selection</h2>
          <p className="text-sm text-slate-400 font-medium mt-2 max-w-xl">
            Choose how you want to complete this order. Online payments are verified against your DurgaShakti order and followed by one receipt with the tax invoice.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 px-5 rounded-lg border border-[#26322B] bg-[#0C1310] text-[#25D958] font-bold uppercase tracking-wider text-[10px] hover:border-[#25D958] hover:bg-[#131B17] transition-all"
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
              className={`group relative overflow-hidden flex items-center gap-4 p-5 md:p-6 border rounded-lg cursor-pointer transition-all min-h-[96px] ${
                isSelected
                  ? 'border-[#25D958] bg-[#25D958]/5 shadow-[0_0_20px_rgba(37,217,88,0.1)]'
                  : 'border-[#26322B] bg-[#0C1310] hover:border-[#25D958]/25 hover:shadow-lg'
              }`}
            >
              {isSelected && (
                <span className="absolute inset-y-0 left-0 w-1 bg-[#25D958]" />
              )}
              <input
                type="radio"
                name="payment_method"
                value={method.id}
                checked={isSelected}
                onChange={() => selectPaymentMethod(method.id)}
                className="relative w-5 h-5 border-[#26322B] focus:ring-[#25D958] text-[#25D958] bg-[#0C1310] cursor-pointer"
              />
              <div className={`relative p-3 rounded-lg text-white shadow-lg ${isSelected ? 'bg-[#25D958] text-[#0C1310]' : 'bg-[#19231F] text-slate-300'}`}>
                <method.icon className="w-6 h-6" />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold tracking-tight text-white">{method.name}</p>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#25D958]/10 border border-[#25D958]/35 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#25D958] font-bold">
                      <BadgeCheck className="w-3 h-3" /> Selected
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium mt-1.5 text-slate-400 leading-relaxed">{method.description}</p>
              </div>
              {method.id === 'online' && (
                <div className="relative hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <ScanQrCode className="w-4 h-4 text-[#25D958]" />
                  QR + UPI
                </div>
              )}
            </label>
          );
        })}
      </div>

      {!codEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-6 overflow-hidden rounded-lg bg-amber-950/20 border border-amber-900/50 text-amber-200 p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-400 font-bold mb-1">COD Temporarily Unavailable</p>
              <p className="text-xs font-medium leading-relaxed text-amber-305">
                Cash on Delivery (COD) is temporarily unavailable. Please place your order using prepaid (Online Payment) options. Thank you for your kind understanding.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {paymentMethod === 'cod' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-6 overflow-hidden rounded-lg bg-rose-950/20 border border-rose-900/50 text-rose-200 p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-rose-400 font-bold mb-1">COD RETURN & EXCHANGE POLICY ACKNOWLEDGEMENT</p>
              <p className="text-xs font-medium leading-relaxed text-rose-300">
                Please note: There will be no returns, refunds or exchanges accepted for Cash on Delivery (COD) orders. We accept return, refund and exchange requests only for prepaid (online payment) orders. DurgaShakti Foils is not responsible for any product damages or any other issues caused once a COD order is placed and delivered.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative mt-8 overflow-hidden rounded-lg bg-[#0C1310] text-white border border-[#26322B]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,217,88,0.03),transparent_42%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26322B] to-transparent" />
        <div className="relative p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#25D958]/10 border border-[#25D958]/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#25D958]" />
              </div>
              <div>
                <span className="font-mono font-bold uppercase tracking-[0.22em] text-[10px] text-[#25D958]">DurgaShakti Protection</span>
                <p className="text-sm font-semibold text-slate-300 mt-1">
                  {paymentMethod === 'cod'
                    ? 'Cash handling is supported by direct order verification.'
                    : 'Please do not refresh the page, close the browser, or navigate away while the payment is processing to ensure secure transaction authorization.'}
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-[#25D958] opacity-70" />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {protectionItems.map((item) => (
              <div key={item} className="min-h-12 rounded-lg border border-[#26322B] bg-[#131B17] px-4 py-3 flex items-center gap-2">
                <LockKeyhole className="w-3.5 h-3.5 text-[#25D958] shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-250 leading-snug font-mono">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
