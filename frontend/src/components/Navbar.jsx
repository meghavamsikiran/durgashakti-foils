import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Package, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import settingsService from '../services/settings.service';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Banner dynamic config state
  const [bannerConfig, setBannerConfig] = React.useState({
    text1: 'Durga Shakti Foils: Premium Packing Solutions',
    text2: '',
    timer_enabled: false,
    timer_target: ''
  });
  const [timerText, setTimerText] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const fetchBanner = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        if (data && data.scrolling_banner && active) {
          setBannerConfig(data.scrolling_banner);
        }
      } catch (err) {
        console.error("Failed to load banner settings in Navbar:", err);
      }
    };
    fetchBanner();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!bannerConfig.timer_enabled || !bannerConfig.timer_target) {
      setTimerText('');
      return;
    }

    const updateTimer = () => {
      const difference = +new Date(bannerConfig.timer_target) - +new Date();
      if (difference <= 0) {
        setTimerText('Ended');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}hr`);
      if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}mins`);
      parts.push(`${seconds}secs`);
      setTimerText(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bannerConfig.timer_enabled, bannerConfig.timer_target]);

  const hasEdgeEmoji = (str) => {
    if (!str) return false;
    try {
      const regexStart = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]/u;
      const regexEnd = /[\p{Emoji_Presentation}\p{Extended_Pictographic}✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]\s*$/u;
      return regexStart.test(str) || regexEnd.test(str);
    } catch (e) {
      const fallbackStart = /^[\s\uD800-\uDBFF\uDC00-\uDFFF✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]/;
      const fallbackEnd = /[\uD800-\uDBFF\uDC00-\uDFFF✨🌟🕉️🛡️🍃👑💎🎉⏳🔥⚡🎁🚀💰🎊]\s*$/;
      return fallbackStart.test(str) || fallbackEnd.test(str);
    }
  };

  const getDisplayTexts = () => {
    let t1 = bannerConfig.text1 || "Durga Shakti Foils: Premium Packing Solutions";
    let t2 = bannerConfig.text2 || "";

    if (t2.includes("{timer}")) {
      t2 = t2.replace("{timer}", timerText || "...");
    } else if (timerText && bannerConfig.timer_enabled) {
      t2 = `${t2} ${timerText}`;
    }

    return { t1, t2 };
  };

  const { t1, t2 } = getDisplayTexts();
  const bannerItems = React.useMemo(() => {
    const list = [];
    for (let i = 0; i < 8; i++) {
      list.push({ text: t1, id: `t1-${i}`, hasEmoji: hasEdgeEmoji(t1) });
      if (t2) {
        list.push({ text: t2, id: `t2-${i}`, hasEmoji: hasEdgeEmoji(t2) });
      }
    }
    return list;
  }, [t1, t2]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className="w-full bg-slate-900 text-white overflow-hidden py-2 relative">
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex">
            {bannerItems.map((item, index) => {
              const prevItem = index === 0 ? bannerItems[bannerItems.length - 1] : bannerItems[index - 1];
              const showFavicon = bannerConfig.use_favicon !== false && !item.hasEmoji && !prevItem.hasEmoji;
              return (
                <span key={item.id} className="text-[10px] font-black uppercase tracking-[0.2em] px-16 border-r border-white/10 flex items-center gap-3">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm" />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
          <div className="flex">
            {bannerItems.map((item, index) => {
              const prevItem = index === 0 ? bannerItems[bannerItems.length - 1] : bannerItems[index - 1];
              const showFavicon = bannerConfig.use_favicon !== false && !item.hasEmoji && !prevItem.hasEmoji;
              return (
                <span key={`dup-${item.id}`} className="text-[10px] font-black uppercase tracking-[0.2em] px-16 border-r border-white/10 flex items-center gap-3">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm" />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <img src="/favicon.png" alt="Durga Maa" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Manrope' }}>
              Durga Shakti<span className="text-primary ml-1">Foils</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/shop"
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="navbar-shop-link"
            >
              Shop
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contact Us
            </Link>

            {user ? (
              <>
                <Link
                  to="/cart"
                  className="relative mr-2"
                  data-testid="navbar-cart-link"
                >
                  <ShoppingCart className="w-5 h-5 hover:text-primary transition-colors" />
                  {cartItemCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
                      data-testid="cart-item-count"
                    >
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard"}
                  title={isAdmin ? (isSuperAdmin ? "Super Admin Panel" : "Admin Panel") : "Customer Dashboard"}
                  className="hover:text-primary transition-colors"
                  data-testid="navbar-dashboard-link"
                >
                  <User className="w-5 h-5" />
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-10 px-4"
                  data-testid="navbar-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-sm font-semibold"
                data-testid="navbar-login-button"
              >
                Login
              </Button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-slate-200 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">Shop</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">About Us</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">Contact Us</Link>

            
            {user ? (
              <>
                <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2 flex items-center gap-2">
                  Cart ({cartItemCount})
                </Link>
                {!isAdmin ? (
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">Dashboard</Link>
                ) : (
                  <Link to={isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard"} onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">Admin Panel</Link>
                )}
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="text-lg font-bold text-rose-600 px-2 text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <Button
                onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
                className="bg-primary text-primary-foreground w-full py-6 text-lg font-bold rounded-xl"
              >
                Login / Register
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  </>
);
};

export default Navbar;