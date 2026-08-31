import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Copy, Check, Sparkles, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import settingsService from '../services/settings.service';

const POPUP_VISIBLE_MS = 8000;
const POPUP_SESSION_PREFIX = 'ds_popup_banner_shown';

const getBannerPlacement = (path = '') => {
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (cleanPath === '/checkout') return 'checkout';
  if (cleanPath === '/shop') return 'shop';
  if (cleanPath === '/') return 'landing';
  return null;
};

const isBannerEnabledForPlacement = (banner, placement) => {
  if (!banner || !placement) return false;

  if (placement === 'landing') return banner.show_on_landing !== false;
  if (placement === 'shop') return banner.show_on_shop !== false;
  if (placement === 'checkout') return banner.show_on_checkout !== false;

  return false;
};

const getBannerSessionKey = (banner, placement, user) => {
  const bannerId = banner?.id || 'default';
  const audience = placement === 'shop' ? (user?.id || user?.email || 'customer') : 'guest';
  return `${POPUP_SESSION_PREFIX}:${bannerId}:${placement}:${audience}`;
};

const getFallbackCoupons = (banner) => (
  (banner?.coupon_codes || []).map(code => ({
    code,
    is_active: true,
    discount_type: 'special',
    discount_value: null,
    expiry_date: null
  }))
);

// Helper to parse coupon from scrolling banner text if needed
const parseCouponFromScrollingText = (bannerText, timerEnabled, timerTarget) => {
  const codeMatch = bannerText.match(/coupon code\s+([A-Z0-9_-]+)/i);
  if (!codeMatch) return null;

  const percentageMatch = bannerText.match(/discount of\s+(\d+(?:\.\d+)?)%/i);
  const flatMatch = bannerText.match(/discount of\s+(?:₹|Rs\.?\s*)(\d+(?:\.\d+)?)/i);
  const isFreeShipping = /free shipping/i.test(bannerText);

  return {
    code: codeMatch[1].toUpperCase(),
    discount_type: percentageMatch ? 'percentage' : flatMatch ? 'flat' : isFreeShipping ? 'free_shipping' : 'percentage',
    discount_value: percentageMatch ? Number(percentageMatch[1]) : flatMatch ? Number(flatMatch[1]) : 0,
    expiry_date: timerEnabled ? timerTarget : null,
    is_active: true
  };
};

const PopupBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  const [activeTheme, setActiveTheme] = useState(null); // Custom theme config if matched
  
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const settingsRetryRef = useRef(null);
  const guestHomeShownRef = useRef(false);
  const loginShownRef = useRef(false);
  const checkoutShownRef = useRef(false);
  const prevUserRef = useRef(user);
  const timerTriggerTypeRef = useRef(null);
  const loggedOutRef = useRef(false);
  const shownSessionKeysRef = useRef(new Set());

  const hasShownThisSession = (sessionKey) => {
    if (!sessionKey) return false;
    if (shownSessionKeysRef.current.has(sessionKey)) return true;

    try {
      return window.sessionStorage?.getItem(sessionKey) === 'true';
    } catch {
      return false;
    }
  };

  const markShownThisSession = (sessionKey) => {
    if (!sessionKey) return;
    shownSessionKeysRef.current.add(sessionKey);

    try {
      window.sessionStorage?.setItem(sessionKey, 'true');
    } catch {
      // In privacy-restricted or embedded browsers, the in-memory Set still prevents repeats.
    }
  };

  // Load public settings to fetch promoted coupons and custom themes
  useEffect(() => {
    let active = true;
    const retryRef = settingsRetryRef;

    const fetchPromotedCoupons = async (attempt = 0) => {
      try {
        const data = await settingsService.getPublicSettings({ force: true, cacheBust: true });
        if (!active) return;

        const customBanners = (data.popup_banner?.custom_banners || []).filter(b => b !== null && b !== undefined);
        const activeTheme = customBanners.find(theme => theme.is_active);
        const placement = getBannerPlacement(location.pathname, user);
        const activeThemeForPage = activeTheme && isBannerEnabledForPlacement(activeTheme, placement)
          ? activeTheme
          : null;

        let selectedCoupons = [];
        if (activeThemeForPage) {
          selectedCoupons = (activeThemeForPage.linked_coupons?.length
            ? activeThemeForPage.linked_coupons
            : []);

          if (!selectedCoupons.length && activeThemeForPage.coupon_codes?.length) {
            selectedCoupons = getFallbackCoupons(activeThemeForPage);
          }

          if (!selectedCoupons.length) {
            selectedCoupons = [{
              code: activeThemeForPage.theme_context || 'FESTIVE',
              discount_type: 'special',
              discount_value: null,
              expiry_date: null,
              is_active: true
            }];
          }
        } else if (!activeTheme) {
          selectedCoupons = data.popup_banner?.promoted_coupons || [];
        }

        // Filter valid unexpired coupons
        const now = Date.now();
        let validCoupons = selectedCoupons.filter((coupon) => {
          if (coupon.is_active === false) return false;
          if (!coupon.expiry_date) return true;
          return new Date(coupon.expiry_date).getTime() > now;
        });

        if (activeThemeForPage && validCoupons.length === 0 && selectedCoupons.length > 0) {
          validCoupons = [selectedCoupons[0]];
        }

        setCoupons(validCoupons);
        setActiveTheme(activeThemeForPage || null);
      } catch (err) {
        console.error("Failed to load promoted coupons for popup:", err);
        if (!active) return;
        setCoupons([]);
        setActiveTheme(null);
      }
    };

    fetchPromotedCoupons();

    return () => {
      active = false;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user]);

  // Clean up timers ONLY on actual component unmount (not on path/dependency changes)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Trigger Logic based on routing and auth state
  useEffect(() => {
    if (coupons.length === 0) {
      setShow(false);
      return;
    }

    const path = location.pathname;
    const justLoggedOut = prevUserRef.current && !user;
    prevUserRef.current = user;

    if (justLoggedOut) {
      loginShownRef.current = false;
      checkoutShownRef.current = false;
      guestHomeShownRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      timerTriggerTypeRef.current = null;
      loggedOutRef.current = true;
      setShow(false);
      return;
    }

    const isCheckoutPath = path === '/checkout';
    const isLoginTimerRunning = timerTriggerTypeRef.current === 'login';
    const placement = getBannerPlacement(path, user);
    const sessionKey = placement ? getBannerSessionKey(activeTheme, placement, user) : null;
    const alreadyShownThisSession = placement !== 'checkout' && sessionKey
      ? hasShownThisSession(sessionKey)
      : false;

    if (timerRef.current && isLoginTimerRunning && placement !== 'shop') {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      timerTriggerTypeRef.current = null;
      loginShownRef.current = false;
    }

    // Keep the shop timer stable on same-page re-renders, but stop it when the user leaves shop.
    if (timerRef.current && (!isLoginTimerRunning || isCheckoutPath)) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      timerTriggerTypeRef.current = null;
    }

    // Reset showing banner on route change only if it is path-specific or navigating to checkout
    if (hideTimerRef.current && (
      isCheckoutPath ||
      timerTriggerTypeRef.current === 'guest' ||
      (timerTriggerTypeRef.current === 'login' && placement !== 'shop')
    )) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
      setShow(false);
    }

    // Rule 1: Shop page -> show with a slight delay once per page load.
    if (placement === 'shop' && !loginShownRef.current && !alreadyShownThisSession) {
      loginShownRef.current = 'shown';
      timerTriggerTypeRef.current = 'login';
      timerRef.current = setTimeout(() => {
        setShow(true);
        markShownThisSession(sessionKey);
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, POPUP_VISIBLE_MS);
      }, 1500);
    }

    // Rule 2: Logged-out landing page -> show with a slight delay once per page load.
    else if (placement === 'landing' && !user && !loggedOutRef.current && !guestHomeShownRef.current && !alreadyShownThisSession) {
      guestHomeShownRef.current = true;
      timerTriggerTypeRef.current = 'guest';
      timerRef.current = setTimeout(() => {
        setShow(true);
        markShownThisSession(sessionKey);
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, POPUP_VISIBLE_MS);
      }, 1500);
    }

    // Rule 3: Checkout page -> show once per visit; refresh is allowed to show it again.
    else if (placement === 'checkout' && !checkoutShownRef.current) {
      checkoutShownRef.current = true;
      timerTriggerTypeRef.current = 'checkout';
      
      timerRef.current = setTimeout(() => {
        setShow(true);
        
        hideTimerRef.current = setTimeout(() => {
          setShow(false);
        }, POPUP_VISIBLE_MS);
      }, 1000);
    }

    return () => {
      // Do not clear active login/guest/shop timers during same-page effect updates
      if (timerRef.current && timerTriggerTypeRef.current !== 'login' && timerTriggerTypeRef.current !== 'guest') {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [coupons, user, location.pathname, activeTheme]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleClose = () => {
    setShow(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    timerTriggerTypeRef.current = null;
  };

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return null;
  if (!show || coupons.length === 0) return null;

  // Theme configuration values
  const theme = activeTheme || {
    title: 'Flash Sale',
    subtitle: 'Save big on premium kitchen & catering foils today. Apply code at checkout!',
    theme_config: {
      background_gradient: 'from-[#4d0b5a] via-[#2f0438] to-[#1a0120]',
      emoji_pattern: '⚡🎁🔥',
      animation_style: 'pulse',
      border_color: 'border-amber-400',
      text_gradient: 'from-amber-300 via-orange-400 to-yellow-200'
    }
  };

  const themeConfig = theme.theme_config || {};
  const background_gradient = themeConfig.background_gradient || 'from-[#4d0b5a] via-[#2f0438] to-[#1a0120]';
  const emoji_pattern = themeConfig.emoji_pattern || '⚡🎁🔥';
  const animation_style = themeConfig.animation_style || 'pulse';
  const border_color = themeConfig.border_color || 'border-amber-400';
  const text_gradient = themeConfig.text_gradient || 'from-amber-300 via-orange-400 to-yellow-200';

  // Grid layout class based on number of coupons to promote centering
  const cardContainerClass = coupons.length === 1
    ? "flex justify-center max-w-sm mx-auto pt-1 w-full"
    : "grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <style>{`
        #durgashakti-popup-banner .popup-title-glow {
          color: #fde047 !important;
          text-shadow: 0 2px 16px rgba(253, 224, 71, 0.45), 0 2px 4px rgba(0, 0, 0, 0.9);
        }
        #durgashakti-popup-banner .popup-text-contrast {
          color: #ffffff !important;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }
        #durgashakti-popup-banner .popup-code-pill {
          background-color: #020617 !important;
          color: #fde047 !important;
          border-color: #facc15 !important;
        }
      `}</style>
      <div id="durgashakti-popup-banner" className={`relative w-full max-w-2xl bg-gradient-to-br ${background_gradient} rounded-3xl border-4 ${border_color} p-6 sm:p-8 md:p-10 text-white shadow-2xl overflow-hidden shadow-black/80`}>
        
        {/* Animated Background Overlay elements depending on theme context */}
        {animation_style === 'snow' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute text-xl text-white/20 left-10 animate-snow-1">❄️</div>
            <div className="absolute text-2xl text-white/10 left-1/4 animate-snow-2">❄️</div>
            <div className="absolute text-lg text-white/20 left-1/2 animate-snow-3">❄️</div>
            <div className="absolute text-2xl text-white/15 left-3/4 animate-snow-1">❄️</div>
            <div className="absolute text-xl text-white/25 right-10 animate-snow-2">❄️</div>
          </div>
        )}

        {animation_style === 'sparkle' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute text-amber-300/40 top-10 left-12 animate-sparkle-shine">✨</div>
            <div className="absolute text-yellow-300/50 top-20 right-20 animate-sparkle-shine" style={{ animationDelay: '0.5s' }}>⭐</div>
            <div className="absolute text-amber-400/30 bottom-16 left-1/3 animate-sparkle-shine" style={{ animationDelay: '0.8s' }}>✨</div>
            <div className="absolute text-yellow-400/40 bottom-10 right-1/4 animate-sparkle-shine" style={{ animationDelay: '0.3s' }}>⭐</div>
          </div>
        )}

        {animation_style === 'float' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute text-3xl left-8 top-16 opacity-30 animate-float-emoji">🌾</div>
            <div className="absolute text-3xl right-12 top-10 opacity-20 animate-float-emoji" style={{ animationDelay: '1s' }}>🌞</div>
            <div className="absolute text-3xl left-1/4 bottom-12 opacity-25 animate-float-emoji" style={{ animationDelay: '1.5s' }}>🍯</div>
            <div className="absolute text-3xl right-1/4 bottom-16 opacity-30 animate-float-emoji" style={{ animationDelay: '0.5s' }}>🪁</div>
          </div>
        )}

        {/* Dynamic Abstract Art Accents */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-yellow-400/30 to-amber-500/30 rounded-full blur-3xl opacity-30 -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full blur-3xl opacity-30 translate-x-12 translate-y-12"></div>
        
        {/* Swirl lines/decorations */}
        <div className="absolute -top-10 -right-10 w-44 h-44 border-8 border-dashed border-amber-300/10 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-44 h-44 border-8 border-double border-amber-300/10 rounded-full pointer-events-none"></div>
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full text-white/90 hover:text-white transition-all bg-black/40 hover:bg-black/60 border border-white/20 shadow-lg"
          title="Close Popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Banner Content */}
        <div className="text-center relative z-10 space-y-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 text-slate-950 border border-yellow-200 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
              {emoji_pattern.split('')[0] || '✨'} {activeTheme ? `${theme.theme_context} Special` : 'Limited Offer'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase select-none popup-title-glow leading-tight">
            {theme.title}
          </h2>
          
          <p className="text-sm sm:text-base popup-text-contrast max-w-lg mx-auto font-semibold leading-relaxed">
            {theme.subtitle}
          </p>

          {/* List of Promoted Coupons - Centered perfectly */}
          <div className={cardContainerClass}>
            {coupons.map((coupon) => {
              const hasExpiry = !!coupon.expiry_date;
              const isPercentage = coupon.discount_type === 'percentage';
              const isFlat = coupon.discount_type === 'flat';
              const isFreeShipping = coupon.discount_type === 'free_shipping';

              let discVal = '';
              if (isPercentage) discVal = `${Number(coupon.discount_value)}% Off`;
              else if (isFlat) discVal = `₹${Number(coupon.discount_value)} Off`;
              else if (isFreeShipping) discVal = 'Free Shipping';
              else discVal = 'Special Offer';

              return (
                <div 
                  key={coupon.id || coupon.code}
                  className="rounded-2xl p-5 border-2 border-amber-400/80 hover:border-amber-300 transition-all flex flex-col items-center justify-center text-center gap-3.5 w-full min-h-[155px] relative overflow-hidden group shadow-2xl bg-slate-950/90 backdrop-blur-md"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(circle at 0% 50%, transparent 12px, black 12.5px), radial-gradient(circle at 100% 50%, transparent 12px, black 12.5px)',
                    maskImage: 'radial-gradient(circle at 0% 50%, transparent 12px, black 12.5px), radial-gradient(circle at 100% 50%, transparent 12px, black 12.5px)',
                    WebkitMaskComposite: 'destination-in',
                    maskComposite: 'intersect'
                  }}
                >
                  {/* Background Watermark Ticket Icon */}
                  <div className="absolute -bottom-2 -right-2 opacity-15 pointer-events-none z-0">
                    <Ticket className="w-20 h-20 text-amber-300" />
                  </div>

                  <div className="space-y-2 w-full relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 text-amber-300">
                      <Ticket className="w-4 h-4 text-amber-300" />
                      {discVal}
                    </p>
                    
                    <div className="relative flex items-center justify-center w-full px-8">
                      <span className="font-mono text-xl sm:text-2xl font-black tracking-wider px-5 py-2 rounded-xl border-2 border-amber-400/80 shadow-inner select-all popup-code-pill">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="absolute right-0 p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold border border-yellow-200 transition-all active:scale-95 shadow-md"
                        title="Copy Code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex flex-col justify-center items-center relative z-10 pt-2 border-t border-dashed border-white/20">
                    {hasExpiry ? (
                      <>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Offer Expires</p>
                        <p className="text-xs font-extrabold font-mono mt-0.5 text-white">
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
                      <span className="inline-flex px-3 py-0.5 bg-emerald-500/20 border border-emerald-400/40 rounded text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Infinite Validity
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* countdown progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
          <div className="h-full bg-gradient-to-r from-yellow-300 to-amber-500 animate-shrink-width"></div>
        </div>
      </div>
    </div>
  );
};

export default PopupBanner;
