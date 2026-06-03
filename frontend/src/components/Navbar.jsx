import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import settingsService from '../services/settings.service';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const isDashboard = location.pathname === '/dashboard';

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchQuery(q);
    if (q) {
      setIsSearchOpen(true);
    }
  }, [location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  };

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
      <div className="w-full bg-[#050807] text-white overflow-hidden py-2 relative border-b border-white/10">
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex">
            {bannerItems.map((item, index) => {
              const prevItem = index === 0 ? bannerItems[bannerItems.length - 1] : bannerItems[index - 1];
              const showFavicon = bannerConfig.use_favicon !== false;
              return (
                <span key={item.id} className="text-[10px] font-black uppercase tracking-[0.2em] px-16 border-r border-white/10 flex items-center gap-3">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm brightness-0 invert" />
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
                <span key={`dup-${item.id}`} className="text-[10px] font-black uppercase tracking-[0.2em] px-16 border-r border-white/10 flex items-center gap-3">
                  {showFavicon && (
                     <img src="/favicon.png" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm brightness-0 invert" />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#030504] text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {isDashboard && (
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-customer-sidebar'))}
                className="xl:hidden p-2 -ml-2 text-white hover:text-[#25d958] transition-colors focus:outline-none"
                aria-label="Toggle Dashboard Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 font-manrope" data-testid="navbar-logo">
              <img src="/favicon.png" alt="Durga Maa" className="w-8 h-8 object-contain brightness-0 invert" />
              <span className="font-bold text-xl tracking-tight text-white">
                Durga Shakti<span className="text-[#25d958] ml-1">Foils</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 font-inter">
            <Link
              to="/shop"
              className="text-sm font-semibold text-white hover:text-[#25d958] transition-colors"
              data-testid="navbar-shop-link"
            >
              Shop
            </Link>
            <Link
              to="/about"
              className="text-sm font-semibold text-white hover:text-[#25d958] transition-colors"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="text-sm font-semibold text-white hover:text-[#25d958] transition-colors"
            >
              Contact Us
            </Link>

            {/* Search Input / Toggle */}
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 lg:w-48 h-9 bg-white/10 text-white placeholder-white/50 text-xs px-3 pr-8 rounded-lg border border-white/15 focus:outline-none focus:border-[#25d958] focus:ring-1 focus:ring-[#25d958]/20 transition-all font-semibold"
                  autoFocus
                />
                <button type="submit" className="absolute right-2 p-1 text-white/70 hover:text-[#25d958] transition-colors">
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="ml-2 text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                aria-label="Search products"
                onClick={() => setIsSearchOpen(true)}
                className="p-1 text-white transition hover:text-[#25d958]"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Unconditional Cart Link */}
            <Link
              to="/cart"
              className="relative text-white hover:text-[#25d958] transition-colors"
              data-testid="navbar-cart-link"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 bg-[#25d958] text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center"
                  data-testid="cart-item-count"
                >
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Unconditional Dashboard/Login Link */}
            <Link
              to={user ? (isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard") : "/login"}
              title={user ? (isAdmin ? (isSuperAdmin ? "Super Admin Panel" : "Admin Panel") : "Customer Dashboard") : "Login / Register"}
              className="text-white hover:text-[#25d958] transition-colors"
              data-testid="navbar-dashboard-link"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Logout/Login Button */}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-10 px-4 rounded-lg text-white hover:bg-white/10 hover:text-[#25d958]"
                data-testid="navbar-logout-button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="bg-[#39c653] text-white hover:bg-[#48d862] h-10 px-6 rounded-lg font-semibold"
                data-testid="navbar-login-button"
              >
                Login
              </Button>
            )}
          </div>

          {/* Mobile Actions and Toggle */}
          {isDashboard ? (
            <div className="md:hidden w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          ) : (
            <div className="md:hidden flex items-center gap-3">
              <button
                aria-label="Search products"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="p-1 text-white hover:text-[#25d958] transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link to="/cart" className="relative p-1 text-white hover:text-[#25d958] transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25d958] px-1 text-[9px] font-black text-black">{cartItemCount}</span>
                )}
              </Link>

              <Link to={user ? (isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard") : "/login"} className="p-1 text-white hover:text-[#25d958] transition-colors">
                <User className="w-5 h-5" />
              </Link>

              <button 
                className="p-2 text-white hover:text-[#25d958] transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Search Dropdown */}
        {isMobileSearchOpen && (
          <div className="md:hidden py-3 border-t border-white/10">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-white/10 text-white placeholder-white/50 text-sm px-4 pr-10 rounded-lg border border-white/15 focus:outline-none focus:border-[#25d958]"
                autoFocus
              />
              <button type="submit" className="absolute right-3 p-1 text-white/70 hover:text-[#25d958]">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/10 flex flex-col gap-6 animate-in slide-in-from-top duration-300 font-inter">
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white px-2">Shop</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white px-2">About Us</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white px-2">Contact Us</Link>

            {user ? (
              <>
                <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white px-2 flex items-center gap-2">
                  Cart ({cartItemCount})
                </Link>
                <Link to={isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard"} onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white px-2">
                  Dashboard
                </Link>
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
                className="bg-[#39c653] text-white w-full py-4 text-base font-bold rounded-lg"
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
