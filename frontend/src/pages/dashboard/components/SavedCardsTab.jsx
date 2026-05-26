import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, CreditCard, ArrowLeft, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PageLoader from '../../../components/ui/PageLoader';

const SavedCardsTab = ({ cards, loading, onSaveCard }) => {
  const ITEMS_PER_PAGE = 4;
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    cardNumber: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil((cards?.length || 0) / ITEMS_PER_PAGE));
    setCurrentPage(prev => Math.min(prev, pages));
  }, [cards?.length]);

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
    const fullYear = formData.expiryYear.length === 2 ? Number('20' + formData.expiryYear) : year;
    if (isNaN(fullYear) || fullYear < new Date().getFullYear()) {
      alert('Please enter a valid 4-digit expiry year (e.g. 2028).');
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
      expiry_year: String(fullYear),
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
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Add Saved Card</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Card Mockup */}
          <div className="p-8 rounded-xl bg-gradient-to-br from-[#0f172a] to-[#020617] text-white shadow-emerald-glow aspect-[1.586/1] w-full max-w-[400px] mx-auto flex flex-col justify-between relative overflow-hidden border border-border-subtle/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">SECURE VAULT CARD</span>
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
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{cardBrand}</span>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="text-xl md:text-2xl font-black tracking-[0.25em] text-center font-mono">
                {formData.cardNumber || '•••• •••• •••• ••••'}
              </div>
              
              <div className="flex justify-between items-end">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Card Holder</p>
                  <p className="font-bold text-sm uppercase truncate text-slate-100">{formData.holderName || 'VALUED CUSTOMER'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Expires</p>
                  <p className="font-bold text-sm text-slate-100 font-mono">
                    {formData.expiryMonth ? formData.expiryMonth.padStart(2, '0') : 'MM'}/{formData.expiryYear || 'YYYY'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle shadow-sm space-y-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">Card Number</Label>
              <Input
                required
                type="text"
                placeholder="4111 2222 3333 4444"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                className="h-12 rounded-lg border border-border-subtle bg-surface px-4 text-sm focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">Card Holder Name</Label>
              <Input
                required
                type="text"
                placeholder="JOHN DOE"
                value={formData.holderName}
                onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                className="h-12 rounded-lg border border-border-subtle bg-surface px-4 text-sm focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all uppercase"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">Expiry Month</Label>
                <Input
                  required
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  value={formData.expiryMonth}
                  onChange={(e) => setFormData({ ...formData, expiryMonth: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-lg border border-border-subtle bg-surface px-4 text-sm text-center focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">Expiry Year</Label>
                <Input
                  required
                  type="text"
                  placeholder="YYYY"
                  maxLength={4}
                  value={formData.expiryYear}
                  onChange={(e) => setFormData({ ...formData, expiryYear: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-lg border border-border-subtle bg-surface px-4 text-sm text-center focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">CVV</Label>
                <Input
                  required
                  type="password"
                  placeholder="•••"
                  maxLength={3}
                  value={formData.cvv}
                  onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                  className="h-12 rounded-lg border border-border-subtle bg-surface px-4 text-sm text-center focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-lg text-xs transition-all shadow-sm hover:shadow-emerald-glow flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> {submitting ? 'SAVING...' : 'SAVE SECURELY'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="h-12 rounded-lg border border-border-subtle text-muted-foreground font-bold px-6 text-xs uppercase hover:bg-surface-container"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((cards?.length || 0) / ITEMS_PER_PAGE));
  const pageCards = (cards || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Security Vault</h2>
        <Button onClick={() => setShowForm(true)} className="rounded-lg h-12 px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow font-black uppercase tracking-widest w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Add Card
        </Button>
      </div>

      <div className="p-6 bg-[#0B1220] rounded-xl text-white relative overflow-hidden border border-border-subtle/10">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400">PCI-DSS Compliant</span>
          </div>
          <h3 className="text-xl font-black mb-2 uppercase">Safe & Secure</h3>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">We use industry-standard tokenization to ensure your card details never touch our servers. Your security is our priority.</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.length === 0 ? (
          <div className="md:col-span-2 p-16 text-center bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
            <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold">No saved cards found</p>
          </div>
        ) : pageCards.map(card => (
          <div key={card.id} className="p-6 rounded-xl bg-surface-container-lowest border border-border-subtle shadow-sm relative overflow-hidden group hover:shadow-emerald-glow hover:border-primary/50 transition-all">
            <div className="flex justify-between items-start mb-12">
              <div className="w-10 h-10 bg-[#0B1220] rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.brand || 'Card'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-foreground tracking-[0.2em] font-mono">•••• •••• •••• {card.last4}</div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card Holder</p>
                  <p className="font-black text-foreground uppercase">{card.holder_name || 'Valued Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expires</p>
                  <p className="font-black text-foreground font-mono">{card.expiry_month}/{card.expiry_year}</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mb-16 group-hover:bg-primary/10 transition-colors"></div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-10 h-10 p-0 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground font-mono">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-10 h-10 p-0 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default SavedCardsTab;
