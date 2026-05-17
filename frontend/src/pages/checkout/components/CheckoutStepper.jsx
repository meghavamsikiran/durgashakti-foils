import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CheckoutStepper = ({ step }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/cart')}>
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-lg">Checkout</span>
        </div>
        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'shipping' ? 'text-indigo-600' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 'shipping' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>1</div>
            <span className="hidden md:inline">Address</span>
          </div>
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'payment' ? 'text-indigo-600' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step === 'payment' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>2</div>
            <span className="hidden md:inline">Payment</span>
          </div>
        </div>
        <div className="hidden md:block">
          <Shield className="w-5 h-5 text-emerald-500" />
        </div>
      </div>
    </div>
  );
};

export default CheckoutStepper;
