import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isDashboard = location.pathname === '/dashboard';

  // Banner dynamic config state
  const bannerText = 'Durga Shakti Foils: Premium Aluminum Packaging Solutions';
  const [bannerConfig] = React.useState({
    text1: bannerText,
    text2: '',
    timer_enabled: false,
    timer_target: '',
    use_favicon: true,
  });
  const [timerText, setTimerText] = React.useState('');

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
    let t1 = bannerText;
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
      <div className="w-full bg-[#0b1325] text-white overflow-hidden py-1.5 relative border-b border-white/10">
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex">
            {bannerItems.map((item, index) => {
              const showFavicon = bannerConfig.use_favicon !== false;
              return (
                <span key={item.id} className="text-[9px] leading-none font-black uppercase tracking-[0.24em] px-14 border-r border-white/10 flex items-center gap-2.5">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-3.5 h-3.5 object-contain drop-shadow-sm" />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
          <div className="flex">
            {bannerItems.map((item, index) => {
              const showFavicon = bannerConfig.use_favicon !== false;
              return (
                <span key={`dup-${item.id}`} className="text-[9px] leading-none font-black uppercase tracking-[0.24em] px-14 border-r border-white/10 flex items-center gap-2.5">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-3.5 h-3.5 object-contain drop-shadow-sm" />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
      <nav className="sticky top-0 z-50 bg-white/92 backdrop-blur-xl border-b border-[#d8dde6]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[52px]">
          <div className="flex items-center gap-2">
            {isDashboard && (
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-customer-sidebar'))}
                className="xl:hidden p-2 -ml-2 text-ink-slate hover:text-primary transition-colors focus:outline-none"
                aria-label="Toggle Dashboard Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 font-manrope" data-testid="navbar-logo">
              <img src="/favicon.png" alt="Durga Maa" className="w-5 h-5 object-contain" />
              <span className="font-bold text-sm tracking-tight text-[#111827]">
                Durga Shakti<span className="text-[#2563eb] ml-1">Foils</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 font-inter">
            <Link
              to="/shop"
              className="text-[11px] font-semibold hover:text-primary transition-colors text-[#111827]"
              data-testid="navbar-shop-link"
            >
              Shop
            </Link>
            <Link
              to="/about"
              className="text-[11px] font-semibold hover:text-primary transition-colors text-[#111827]"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="text-[11px] font-semibold hover:text-primary transition-colors text-[#111827]"
            >
              Contact Us
            </Link>

            {user ? (
              <>
                <Link
                  to="/cart"
                  className="relative text-[#111827]"
                  data-testid="navbar-cart-link"
                >
                  <ShoppingCart className="w-4 h-4 hover:text-primary transition-colors" />
                  {cartItemCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2 bg-primary text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      data-testid="cart-item-count"
                    >
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard"}
                  title={isAdmin ? (isSuperAdmin ? "Super Admin Panel" : "Admin Panel") : "Customer Dashboard"}
                  className="hover:text-primary transition-colors text-[#111827]"
                  data-testid="navbar-dashboard-link"
                >
                  <User className="w-4 h-4" />
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2 rounded-none text-[#111827] hover:bg-slate-100"
                  data-testid="navbar-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/cart"
                  className="relative text-[#111827]"
                  data-testid="navbar-cart-link"
                >
                  <ShoppingCart className="w-4 h-4 hover:text-primary transition-colors" />
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-[#111827] hover:text-primary transition-colors"
                  aria-label="Login"
                  data-testid="navbar-login-button"
                >
                  <User className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          {isDashboard ? (
            <div className="md:hidden w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          ) : (
            <button 
              className="md:hidden p-2 text-ink-slate"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-border-subtle flex flex-col gap-6 animate-in slide-in-from-top duration-300 font-inter">
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2">Shop</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2">About Us</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2">Contact Us</Link>

            
            {user ? (
              <>
                <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2 flex items-center gap-2">
                  Cart ({cartItemCount})
                </Link>
                {!isAdmin ? (
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2">Dashboard</Link>
                ) : (
                  <Link to={isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard"} onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-ink-slate px-2">Admin Panel</Link>
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
                className="bg-primary text-primary-foreground w-full py-4 text-base font-bold rounded-lg"
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
