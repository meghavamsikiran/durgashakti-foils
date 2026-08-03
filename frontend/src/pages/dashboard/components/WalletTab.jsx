import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/core/apiClient';
import { 
  Wallet, PlusCircle, Ticket, ArrowUpRight, ArrowDownLeft, 
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const WalletTab = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('themeMode') !== 'light');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Topup modal state
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMsg, setTopUpMsg] = useState({ type: '', text: '' });
  
  // Voucher Redeem state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState({ type: '', text: '' });

  // Listen for theme toggles
  useEffect(() => {
    const handler = (e) => setIsDark(e.detail === 'dark');
    window.addEventListener('theme-toggle', handler);
    return () => window.removeEventListener('theme-toggle', handler);
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/user/wallet');
      if (res.data) {
        setBalance(res.data.balance || 0);
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err);
      setError('Could not load wallet data. The wallet service may be starting up — please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRedeemVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherMsg({ type: '', text: '' });

    try {
      const res = await apiClient.post('/user/wallet/redeem-voucher', { code: voucherCode.trim() });
      if (res.data?.success) {
        setVoucherMsg({ type: 'success', text: res.data.message || 'Voucher redeemed successfully!' });
        setVoucherCode('');
        fetchWalletData();
      } else {
        setVoucherMsg({ type: 'error', text: res.data?.error || 'Failed to redeem voucher' });
      }
    } catch (err) {
      setVoucherMsg({ 
        type: 'error', 
        text: err.response?.data?.error || 'Invalid or expired voucher code' 
      });
    } finally {
      setVoucherLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleTopUp = async () => {
    const amt = Number(topUpAmount);
    if (!amt || amt <= 0) return;
    setTopUpLoading(true);
    setTopUpMsg({ type: '', text: '' });

    try {
      // Step 1: Create Razorpay Top-Up Order via backend API
      const orderRes = await apiClient.post('/user/wallet/create-topup-order', { amount: amt });
      if (!orderRes.data?.success) {
        setTopUpMsg({ type: 'error', text: orderRes.data?.error || 'Failed to initialize payment gateway' });
        setTopUpLoading(false);
        return;
      }

      const { razorpay_order_id, key, amount } = orderRes.data;

      // Step 2: Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setTopUpMsg({ type: 'error', text: 'Razorpay SDK failed to load. Check your network connection.' });
        setTopUpLoading(false);
        return;
      }

      // Step 3: Trigger Razorpay payment gateway modal
      const options = {
        key: key || 'rzp_test_fallback',
        amount: amount,
        currency: 'INR',
        name: 'DurgaShakti Foils',
        description: `Wallet Top-up (₹${amt})`,
        order_id: razorpay_order_id,
        handler: async function (response) {
          try {
            // Step 4: Verify and Credit top-up in wallet
            const topupRes = await apiClient.post('/user/wallet/topup', {
              amount: amt,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            if (topupRes.data?.success) {
              setTopUpMsg({ type: 'success', text: topupRes.data.message || 'Top-up successful!' });
              setShowTopUpModal(false);
              setTopUpAmount('500');
              fetchWalletData();
            } else {
              setTopUpMsg({ type: 'error', text: topupRes.data?.error || 'Payment verification failed' });
            }
          } catch (err) {
            setTopUpMsg({ type: 'error', text: err.response?.data?.error || 'Top-up credit failed after payment.' });
          } finally {
            setTopUpLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setTopUpLoading(false);
          }
        },
        theme: {
          color: '#006e1b'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setTopUpMsg({ type: 'error', text: err.response?.data?.error || 'Failed to initialize payment. Please try again.' });
      setTopUpLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResetWallet = async () => {
    if (!window.confirm('Are you sure you want to clear your test/mock wallet balance back to ₹0.00?')) return;
    try {
      setLoading(true);
      const res = await apiClient.post('/user/wallet/reset');
      if (res.data?.success) {
        setBalance(0);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to reset wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER CARD */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-br from-[#0c1816] via-[#070e0c] to-[#030504] border-[#19231F] text-white' 
          : 'bg-gradient-to-br from-[#f0f9f3] via-white to-[#e8f5ec] border-[#d2e8d8] text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-[#25D958]/10 text-[#25D958]' : 'bg-[#006e1b]/10 text-[#006e1b]'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#25D958]' : 'text-[#006e1b]'}`}>DSF Digital Wallet</span>
            </div>
            <div className="h-10 flex items-center">
              {loading ? (
                <div className={`h-8 w-32 rounded-xl animate-pulse ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              ) : (
                <h2 className="text-3xl sm:text-4xl font-black font-serif tracking-tight">
                  {formatCurrency(balance)}
                </h2>
              )}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Use your wallet balance for faster 1-click checkout & split payments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowTopUpModal(true); setTopUpMsg({ type: '', text: '' }); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                isDark 
                  ? 'bg-[#25D958] text-black hover:bg-[#25D958]/90' 
                  : 'bg-[#006e1b] text-white hover:bg-[#006e1b]/90'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Money</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
          isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchWalletData} className="ml-auto underline text-[10px] uppercase font-bold tracking-wider">Retry</button>
        </div>
      )}

      {/* VOUCHER / COUPON REDEMPTION CARD */}
      <div className={`p-6 rounded-3xl border shadow-sm ${
        isDark ? 'bg-[#070b09] border-[#19231F]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="w-4 h-4 text-[#25D958]" />
          <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? '' : 'text-slate-800'}`}>Redeem Wallet Coupon / Voucher</h3>
        </div>
        <form onSubmit={handleRedeemVoucher} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter Voucher Code (e.g. DSF-WAL-500)"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition-all ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#25D958]/40' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#006e1b]/40'
            }`}
          />
          <button
            type="submit"
            disabled={voucherLoading || !voucherCode.trim()}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {voucherLoading ? 'Redeeming...' : 'Redeem Now'}
          </button>
        </form>

        {voucherMsg.text && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            voucherMsg.type === 'success' 
              ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
              : (isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200')
          }`}>
            {voucherMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{voucherMsg.text}</span>
          </div>
        )}
      </div>

      {/* TRANSACTIONS HISTORY TABLE */}
      <div className={`p-6 rounded-3xl border shadow-sm ${
        isDark ? 'bg-[#070b09] border-[#19231F]' : 'bg-white border-slate-200'
      }`}>
        <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? '' : 'text-slate-800'}`}>
            <Clock className="w-4 h-4 text-[#25D958]" />
            <span>Wallet Transaction History</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{transactions.length} Records</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className={`p-4 rounded-2xl border animate-pulse flex justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="h-4 w-40 rounded bg-slate-300/30" />
                <div className="h-4 w-16 rounded bg-slate-300/30" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className={`py-12 text-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            No wallet transactions found. Add money or redeem a voucher to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <div 
                  key={tx.id} 
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isCredit 
                        ? (isDark ? 'bg-[#25D958]/10 text-[#25D958]' : 'bg-[#006e1b]/10 text-[#006e1b]') 
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isDark ? '' : 'text-slate-800'}`}>{tx.description || tx.source}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.created_at || tx.createdAt)} • Ref: {tx.reference_id || tx.referenceId || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-extrabold font-mono ${
                      isCredit 
                        ? (isDark ? 'text-[#25D958]' : 'text-[#006e1b]') 
                        : 'text-rose-500'
                    }`}>
                      {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {tx.status || 'SUCCESS'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOP-UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTopUpModal(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isDark ? 'bg-[#0c1816] border-[#19231F] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#25D958]" />
                <span>Add Money to Wallet</span>
              </h3>
              <button 
                onClick={() => setShowTopUpModal(false)}
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select or Enter Amount (₹)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      Number(topUpAmount) === amt 
                        ? (isDark ? 'bg-[#25D958] text-black border-[#25D958]' : 'bg-[#006e1b] text-white border-[#006e1b]') 
                        : (isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300')
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                value={topUpAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-base font-extrabold focus:outline-none ${
                  isDark ? 'bg-white/5 border-white/10 text-white focus:border-[#25D958]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#006e1b]'
                }`}
                placeholder="Enter custom amount..."
              />
            </div>

            {topUpMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                topUpMsg.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-rose-500/10 text-rose-400'
              }`}>
                {topUpMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{topUpMsg.text}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowTopUpModal(false)}
                className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase ${
                  isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount || Number(topUpAmount) <= 0}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                  isDark ? 'bg-[#25D958] text-black hover:bg-[#25D958]/90' : 'bg-[#006e1b] text-white hover:bg-[#006e1b]/90'
                }`}
              >
                {topUpLoading ? 'Processing...' : `Pay ₹${topUpAmount || 0}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletTab;
