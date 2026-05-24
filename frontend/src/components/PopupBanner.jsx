import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import settingsService from '../services/settings.service';

const PopupBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const homeShownRef = useRef(false);
  const checkoutShownRef = useRef(false);
  const prevUserRef = useRef(user);

  // Load public settings to fetch promoted coupons
  useEffect(() => {
    const fetchPromotedCoupons = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        if (data && data.popup_banner && data.popup_banner.promoted_coupons) {
          // Only show active and valid coupons
          setCoupons(data.popup_banner.promoted_coupons);
        }
      } catch (err) {
        console.error("Failed to load promoted coupons for popup:", err);
      }
    };
    fetchPromotedCoupons();
  }, [location.pathname]); // Reload when page changes to get fresh settings

  // Trigger Logic based on routing and auth state
  useEffect(() => {
    if (coupons.length === 0) {
      setShow(false);
      return;
    }

    const path = location.pathname;
    const justLoggedIn = !prevUserRef.current && user;
    prevUserRef.current = user;
    
    // Clear any pending timers when path changes or login state changes
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // Rule 1: Landing Page (/) & Customer NOT logged in -> Show immediately for 5s
    if (path === '/' && !user && !homeShownRef.current) {
      homeShownRef.current = true;
      setShow(true);
      
      hideTimerRef.current = setTimeout(() => {
        setShow(false);
      }, 5000);
    }
    
    // Rule 2: Landing Page (/) or Just Logged In -> Wait 5s, then show for 5s
    else if (((path === '/' && user) || justLoggedIn) && !homeShownRef.current) {
      homeShownRef.current = true;
      
      timerRef.current = setTimeout(() => {
        setShow(true);
        
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, 5000);
      }, 5000);
    }

    // Rule 3: Checkout Page (/checkout) -> Wait 1s, then show for 5s (remind one more time)
    else if (path === '/checkout' && !checkoutShownRef.current) {
      checkoutShownRef.current = true;
      
      timerRef.current = setTimeout(() => {
        setShow(true);
        
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, 5000);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [coupons, user, location.pathname]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleClose = () => {
    setShow(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  if (!show || coupons.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-manrope">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#4d0b5a] via-[#2f0438] to-[#1a0120] rounded-3xl border-4 border-amber-400 p-8 text-white shadow-2xl overflow-hidden shadow-amber-400/20 max-h-[85vh] overflow-y-auto">
        
        {/* Dynamic Abstract Art Accents matching Image2 */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-20 -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-3xl opacity-20 translate-x-12 translate-y-12"></div>
        
        {/* Swirl lines/decorations */}
        <div className="absolute -top-10 -right-10 w-40 h-40 border-8 border-dashed border-pink-500/20 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 border-8 border-double border-yellow-400/20 rounded-full pointer-events-none"></div>
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Banner Content */}
        <div className="text-center relative z-10 space-y-6">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-400/30 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Limited Time Offers
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-200 uppercase select-none animate-pulse">
            Flash Sale
          </h2>
          
          <p className="text-sm text-purple-200 max-w-sm mx-auto font-medium">
            Save big on premium kitchen & catering foils today. Apply code at checkout!
          </p>

          {/* List of Promoted Coupons */}
          <div className="space-y-4 pt-2">
            {coupons.map((coupon) => {
              const hasExpiry = !!coupon.expiry_date;
              const isPercentage = coupon.discount_type === 'percentage';
              const isFlat = coupon.discount_type === 'flat';
              const isFreeShipping = coupon.discount_type === 'free_shipping';

              let discVal = '';
              if (isPercentage) discVal = `${Number(coupon.discount_value)}% Off`;
              else if (isFlat) discVal = `₹${Number(coupon.discount_value)} Off`;
              else if (isFreeShipping) discVal = 'Free Shipping';

              return (
                <div 
                  key={coupon.id || coupon.code}
                  className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="text-left space-y-1 w-full sm:w-auto">
                    <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">
                      {discVal}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-black text-white bg-white/10 px-3 py-1 rounded-lg border border-white/20 select-all">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all"
                        title="Copy Coupon Code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-center sm:text-right w-full sm:w-auto flex flex-col justify-center sm:items-end">
                    {hasExpiry ? (
                      <>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Offer Expires</p>
                        <p className="text-xs font-bold text-amber-300 font-mono">
                          {new Date(coupon.expiry_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider">
                        Infinite Validity
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5-second animated countdown progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-purple-950">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 animate-shrink-width"></div>
        </div>
      </div>
    </div>
  );
};

export default PopupBanner;
