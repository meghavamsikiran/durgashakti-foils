import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CheckoutStepper = ({ step }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#131B17] border-b border-[#26322B] sticky top-0 z-40 text-white">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors" onClick={() => navigate('/cart')}>
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-lg">Checkout</span>
        </div>
        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'shipping' ? 'text-[#25D958]' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 'shipping' ? 'border-[#25D958] bg-[#25D958] text-[#0C1310]' : 'border-[#26322B] bg-[#0C1310] text-slate-400'}`}>1</div>
            <span className="hidden md:inline font-mono text-xs uppercase tracking-wider">Address</span>
          </div>
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'payment' ? 'text-[#25D958]' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 'payment' ? 'border-[#25D958] bg-[#25D958] text-[#0C1310]' : 'border-[#26322B] bg-[#0C1310] text-slate-400'}`}>2</div>
            <span className="hidden md:inline font-mono text-xs uppercase tracking-wider">Payment</span>
          </div>
        </div>
        <div className="hidden md:block">
          <Shield className="w-5 h-5 text-[#25D958]" />
        </div>
      </div>
    </div>
  );
};

export default CheckoutStepper;
