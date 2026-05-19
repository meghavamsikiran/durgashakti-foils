import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, CreditCard, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PageLoader from '../../../components/ui/PageLoader';

const SavedCardsTab = ({ cards, loading, onSaveCard }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const getCardBrand = (number) => {
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
    if (/^6(0|5|8)/.test(cleanNumber)) return 'RuPay';
    if (/^3[47]/.test(cleanNumber)) return 'American Express';
    return 'Visa'; // default fallback for display
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setFormData({ ...formData, cardNumber: formatted });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanNumber = formData.cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 16) {
      alert('Please enter a valid 16-digit card number.');
      return;
    }
    if (!formData.holderName.trim()) {
      alert('Please enter the cardholder name.');
      return;
    }
    const month = parseInt(formData.expiryMonth, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      alert('Please enter a valid expiry month (01-12).');
      return;
    }
    const year = parseInt(formData.expiryYear, 10);
    if (isNaN(year) || year < 24) {
      alert('Please enter a valid expiry year (e.g. 26).');
      return;
    }
    if (formData.cvv.length < 3) {
      alert('Please enter a valid 3-digit CVV.');
      return;
    }

    setSubmitting(true);
    const cardData = {
      brand: getCardBrand(cleanNumber),
      last4: cleanNumber.slice(-4),
      expiry_month: formData.expiryMonth.padStart(2, '0'),
      expiry_year: formData.expiryYear.length === 2 ? '20' + formData.expiryYear : formData.expiryYear,
      holder_name: formData.holderName.toUpperCase()
    };

    const success = await onSaveCard(cardData);
    setSubmitting(false);
    if (success) {
      setShowForm(false);
      setFormData({
        cardNumber: '',
        holderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: ''
      });
    }
  };

  if (loading && !showForm) return <PageLoader message="Syncing secure vault..." />;

  if (showForm) {
    const cardBrand = getCardBrand(formData.cardNumber);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Add Saved Card</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Card Mockup */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-2xl aspect-[1.586/1] w-full max-w-[400px] mx-auto flex flex-col justify-between relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">SECURE VAULT CARD</span>
                <div className="w-10 h-8 bg-amber-400/20 border border-amber-400/30 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="grid grid-cols-3 gap-[1px] w-6 h-5 opacity-80">
                    <div className="border border-amber-400/50 rounded-sm"></div>
                    <div className="border border-amber-400/50 rounded-sm"></div>
                    <div className="border border-amber-400/50 rounded-sm"></div>
                    <div className="border border-amber-400/50 rounded-sm"></div>
                    <div className="border border-amber-400/50 rounded-sm"></div>
                    <div className="border border-amber-400/50 rounded-sm"></div>
                  </div>
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-200">{cardBrand}</span>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="text-xl md:text-2xl font-black tracking-[0.25em] text-center font-mono">
                {formData.cardNumber || '•••• •••• •••• ••••'}
              </div>
              
              <div className="flex justify-between items-end">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300">Card Holder</p>
                  <p className="font-bold text-sm uppercase truncate text-indigo-50">{formData.holderName || 'VALUED CUSTOMER'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300">Expires</p>
                  <p className="font-bold text-sm text-indigo-50">
                    {formData.expiryMonth ? formData.expiryMonth.padStart(2, '0') : 'MM'}/{formData.expiryYear ? formData.expiryYear.padStart(2, '0') : 'YY'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Card Number</Label>
              <Input
                required
                type="text"
                placeholder="4111 2222 3333 4444"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm focus:border-primary focus:ring-0 transition-all font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Card Holder Name</Label>
              <Input
                required
                type="text"
                placeholder="JOHN DOE"
                value={formData.holderName}
                onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm focus:border-primary focus:ring-0 transition-all uppercase"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Expiry Month</Label>
                <Input
                  required
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  value={formData.expiryMonth}
                  onChange={(e) => setFormData({ ...formData, expiryMonth: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm text-center focus:border-primary focus:ring-0 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">Expiry Year</Label>
                <Input
                  required
                  type="text"
                  placeholder="YY"
                  maxLength={2}
                  value={formData.expiryYear}
                  onChange={(e) => setFormData({ ...formData, expiryYear: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm text-center focus:border-primary focus:ring-0 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">CVV</Label>
                <Input
                  required
                  type="password"
                  placeholder="•••"
                  maxLength={3}
                  value={formData.cvv}
                  onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 text-sm text-center focus:border-primary focus:ring-0 transition-all font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> {submitting ? 'SAVING...' : 'SAVE SECURELY'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="h-12 rounded-xl border border-slate-200 text-slate-600 font-bold px-6 text-xs uppercase"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Security Vault</h2>
        <Button onClick={() => setShowForm(true)} className="rounded-2xl h-14 px-8 gap-2 bg-slate-900 text-white font-black uppercase tracking-widest w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Add Card
        </Button>
      </div>

      <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-indigo-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">PCI-DSS Compliant</span>
          </div>
          <h3 className="text-xl font-black mb-2 uppercase">Safe & Secure</h3>
          <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-md">We use industry-standard tokenization to ensure your card details never touch our servers. Your security is our priority.</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.length === 0 ? (
          <div className="md:col-span-2 p-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">No saved cards found</p>
          </div>
        ) : cards.map(card => (
          <div key={card.id} className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start mb-12">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.brand || 'Card'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-slate-900 tracking-[0.2em]">•••• •••• •••• {card.last4}</div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card Holder</p>
                  <p className="font-black text-slate-900 uppercase">{card.holder_name || 'Valued Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Expires</p>
                  <p className="font-black text-slate-900">{card.expiry_month}/{card.expiry_year}</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mb-16 group-hover:bg-indigo-100 transition-colors"></div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SavedCardsTab;
