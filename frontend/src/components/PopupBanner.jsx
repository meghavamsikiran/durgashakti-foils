import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Copy, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import settingsService from '../services/settings.service';

const POPUP_VISIBLE_MS = 7000;

const getPromotedCouponsFromSettings = (settings = {}) => {
  const scrollingBanner = settings.scrolling_banner || {};
  const promotedCoupons =
    scrollingBanner.popup_promoted_coupons ||
    settings.popup_banner?.promoted_coupons ||
    [];

  if (promotedCoupons.length > 0) {
    return promotedCoupons;
  }

  const bannerText = scrollingBanner.text2 || scrollingBanner.text1 || '';
  const codeMatch = bannerText.match(/coupon code\s+([A-Z0-9_-]+)/i);
  if (!codeMatch) {
    return [];
  }

  const percentageMatch = bannerText.match(/discount of\s+(\d+(?:\.\d+)?)%/i);
  const flatMatch = bannerText.match(/discount of\s+(?:₹|Rs\.?\s*)(\d+(?:\.\d+)?)/i);
  const isFreeShipping = /free shipping/i.test(bannerText);

  return [{
    code: codeMatch[1].toUpperCase(),
    discount_type: percentageMatch ? 'percentage' : flatMatch ? 'flat' : isFreeShipping ? 'free_shipping' : 'percentage',
    discount_value: percentageMatch ? Number(percentageMatch[1]) : flatMatch ? Number(flatMatch[1]) : 0,
    expiry_date: scrollingBanner.timer_enabled ? scrollingBanner.timer_target : null,
    is_active: true
  }];
};

const PopupBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const settingsRetryRef = useRef(null);
  const guestHomeShownRef = useRef(false);
  const loginShownRef = useRef(false);
  const checkoutShownRef = useRef(false);
  const prevUserRef = useRef(user);

  // Load public settings to fetch promoted coupons
  useEffect(() => {
    let active = true;

    const fetchPromotedCoupons = async (attempt = 0) => {
      try {
        const data = await settingsService.getPublicSettings({ force: attempt > 0 });
        if (!active) return;
        const promotedCoupons = getPromotedCouponsFromSettings(data);
        const now = Date.now();
        const validCoupons = promotedCoupons.filter((coupon) => {
          if (coupon.is_active === false) return false;
          if (!coupon.expiry_date) return true;
          return new Date(coupon.expiry_date).getTime() > now;
        });
        setCoupons(validCoupons);

        if (validCoupons.length === 0 && attempt < 6) {
          settingsRetryRef.current = setTimeout(() => fetchPromotedCoupons(attempt + 1), 10000);
        }
      } catch (err) {
        console.error("Failed to load promoted coupons for popup:", err);
        if (!active) return;
        setCoupons([]);
        if (attempt < 6) {
          settingsRetryRef.current = setTimeout(() => fetchPromotedCoupons(attempt + 1), 10000);
        }
      }
    };

    fetchPromotedCoupons();

    return () => {
      active = false;
      if (settingsRetryRef.current) clearTimeout(settingsRetryRef.current);
    };
  }, [location.pathname]); // Reload when page changes to get fresh settings

  // Trigger Logic based on routing and auth state
  useEffect(() => {
    if (coupons.length === 0) {
      setShow(false);
      return;
    }

    const path = location.pathname;
    const justLoggedOut = prevUserRef.current && !user;
    prevUserRef.current = user;
    
    // Clear any pending timers when path changes or login state changes
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // Rule 1: Any customer session should see the banner once after login.
    if (user && !loginShownRef.current) {
      loginShownRef.current = true;
      setShow(true);

      hideTimerRef.current = setTimeout(() => {
        setShow(false);
      }, POPUP_VISIBLE_MS);
    }

    // Rule 2: Logged-out home/login screen -> Show immediately for 7s
    else if ((path === '/' || path === '/login') && !user && (!guestHomeShownRef.current || justLoggedOut)) {
      guestHomeShownRef.current = true;
      setShow(true);
      
      hideTimerRef.current = setTimeout(() => {
        setShow(false);
      }, POPUP_VISIBLE_MS);
    }

    // Rule 3: Checkout Page (/checkout) -> Wait 1s, then show for 7s
    else if (path === '/checkout' && !checkoutShownRef.current) {
      checkoutShownRef.current = true;
      
      timerRef.current = setTimeout(() => {
        setShow(true);
        
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, POPUP_VISIBLE_MS);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-manrope">
      <div className="relative w-full max-w-3xl bg-gradient-to-br from-[#4d0b5a] via-[#2f0438] to-[#1a0120] rounded-3xl border-4 border-amber-400 p-5 sm:p-7 md:p-8 text-white shadow-2xl overflow-hidden shadow-amber-400/20">
        
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
        <div className="text-center relative z-10 space-y-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-400/30 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Limited Time Offers
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-200 uppercase select-none animate-pulse">
            Flash Sale
          </h2>
          
          <p className="text-sm text-purple-200 max-w-sm mx-auto font-medium">
            Save big on premium kitchen & catering foils today. Apply code at checkout!
          </p>

          {/* List of Promoted Coupons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
                  className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-between gap-4 min-h-[150px]"
                >
                  <div className="text-center space-y-2 w-full">
                    <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">
                      {discVal}
                    </p>
                    <div className="flex items-center justify-center gap-2">
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

                  <div className="text-center w-full flex flex-col justify-center items-center">
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

        {/* 7-second animated countdown progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-purple-950">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 animate-shrink-width"></div>
        </div>
      </div>
    </div>
  );
};

export default PopupBanner;
