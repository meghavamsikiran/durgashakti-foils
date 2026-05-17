import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, CreditCard } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const SavedCardsTab = ({ cards, loading, onSaveCard }) => {
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Syncing secure vault...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Security Vault</h2>
        <Button onClick={() => alert('Razorpay Secure Tokenization flow would start here.')} className="rounded-2xl h-14 px-8 gap-2 bg-slate-900 text-white font-black uppercase tracking-widest">
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.card_network || 'Card'}</span>
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
