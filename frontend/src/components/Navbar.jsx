import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu, X, Search, Home as HomeIcon, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import settingsService from '../services/settings.service';
import apiClient from '../services/core/apiClient';
import api, { formatImageUrl } from '../utils/api';
import { getProductPricing } from '../utils/productPricing';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('themeMode') || 'dark');

  React.useEffect(() => {
    const handleThemeToggle = (e) => {
      setThemeMode(e.detail);
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [allProducts, setAllProducts] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const searchRef = React.useRef(null);
  const mobileSearchRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const isDashboard = location.pathname === '/dashboard';

  // Sync search query from URL params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchQuery(q);
    if (q) {
      setIsSearchOpen(true);
    }
  }, [location.search]);

  // Fetch products for live search
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        // First try to get from cache
        const cachedResponse = apiClient.getCachedDataSync('/products');
        if (cachedResponse?.data?.items?.length) {
          setAllProducts(cachedResponse.data.items);
          return;
        }
        // Otherwise fetch
        const response = await api.getProducts();
        if (response?.data?.items) {
          setAllProducts(response.data.items);
        }
      } catch (err) {
        console.error('Failed to load products for search:', err);
      }
    };
    loadProducts();
  }, []);

  // Live search with debounce
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      const results = allProducts.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      ).slice(0, 6);

      setSearchResults(results);
      setShowDropdown(true);
      setActiveIndex(-1);
      setIsSearching(false);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, allProducts]);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        // Don't close desktop search if mobile is the target
        if (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target)) {
          setShowDropdown(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when navigating away
  React.useEffect(() => {
    setShowDropdown(false);
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      setIsMobileSearchOpen(false);
      setIsSearchOpen(false);
    }
  };

  const handleProductClick = (productId) => {
    setShowDropdown(false);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    navigate(`/product/${productId}`);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleProductClick(searchResults[activeIndex].id);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setIsSearchOpen(false);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setShowDropdown(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Search results dropdown component
  const SearchDropdown = ({ results, isSearching: searching, query, isMobile }) => {
    if (!query.trim()) return null;
    if (!showDropdown) return null;

    return (
      <div
        className={`absolute left-0 right-0 bg-[#0a0f0c] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] ${
          isMobile ? 'top-full mt-1' : 'top-full mt-2'
        }`}
        style={{ maxHeight: '380px', overflowY: 'auto' }}
      >
        {searching ? (
          <div className="px-4 py-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[#25d958]/30 border-t-[#25d958] rounded-full animate-spin"></div>
            <p className="text-white/50 text-xs mt-2">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Search className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/50 text-xs">No products found for "{query}"</p>
            <button
              onClick={handleSearchSubmit}
              className="mt-3 text-[#25d958] text-xs font-semibold hover:underline"
            >
              Search in Shop →
            </button>
          </div>
        ) : (
          <>
            {results.map((product, index) => {
              const { displayPrice, basePrice, hasOffer } = getProductPricing(product);
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-white/5 last:border-0 ${
                    activeIndex === index
                      ? 'bg-[#25d958]/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                    <img
                      src={formatImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[#25d958] text-xs font-bold">₹{displayPrice}</span>
                      {hasOffer && (
                        <span className="text-white/30 text-[10px] line-through">₹{basePrice}</span>
                      )}
                      {product.category && (
                        <span className="text-white/30 text-[10px] font-medium">• {product.category}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={handleSearchSubmit}
              className="w-full px-4 py-3 text-center text-[#25d958] text-xs font-bold hover:bg-[#25d958]/10 transition-all border-t border-white/10"
            >
              View all results for "{query}" →
            </button>
          </>
        )}
      </div>
    );
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
              const showFavicon = bannerConfig.use_favicon !== false;
              return (
                <span key={item.id} className="text-[10px] font-black uppercase tracking-[0.2em] px-16 border-r border-white/10 flex items-center gap-3">
                  {showFavicon && (
                     <img src="/favicon.webp" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; }} />
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
                     <img src="/favicon.webp" alt="Durga Maa" className="w-4 h-4 object-contain drop-shadow-sm brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#030504] text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="w-full px-4 md:px-8 lg:px-12">
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
            <Link to="/" className="flex items-center py-2 h-14" data-testid="navbar-logo">
              <img
                src="/logo-durga.webp"
                alt="DurgaShakti Foils Pvt Ltd"
                className="h-11 w-auto object-contain block"
                style={{ maxWidth: '240px' }}
              />
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
            <div className="relative" ref={searchRef}>
              {isSearchOpen ? (
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <div className="absolute left-2.5 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                    className="w-48 lg:w-56 h-9 bg-white text-slate-800 placeholder-slate-450 text-xs pl-8 pr-7 rounded-lg border border-slate-250 focus:outline-none focus:border-[#25d958] focus:ring-1 focus:ring-[#25d958]/20 transition-all font-semibold"
                    autoFocus
                  />
                  <button type="button" onClick={closeSearch} className="absolute right-2 p-1 text-slate-450 hover:text-slate-700 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Live Search Dropdown */}
                  <SearchDropdown
                    results={searchResults}
                    isSearching={isSearching}
                    query={searchQuery}
                    isMobile={false}
                  />
                </form>
              ) : (
                <button
                  aria-label="Search products"
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-white transition-all hover:text-[#25d958] hover:bg-white/5 rounded-lg"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

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

          {/* Mobile Actions and Toggle - Removed on client/customer view as they are present in the bottom navigation */}
          {isDashboard ? (
            <div className="md:hidden w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          ) : null}
        </div>

        {/* Mobile Search Dropdown */}
        {isMobileSearchOpen && (
          <div className="md:hidden py-3 border-t border-white/10 relative" ref={mobileSearchRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <div className="absolute left-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                className="w-full h-10 bg-white text-slate-800 placeholder-slate-450 text-sm pl-10 pr-9 rounded-lg border border-slate-250 focus:outline-none focus:border-[#25d958]"
                autoFocus
              />
              <button type="button" onClick={closeSearch} className="absolute right-2.5 p-1 text-slate-450 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile Live Search Dropdown */}
            <SearchDropdown
              results={searchResults}
              isSearching={isSearching}
              query={searchQuery}
              isMobile={true}
            />
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

    {/* Sticky Mobile Bottom Navigation Bar */}
    <div className={`fixed bottom-0 inset-x-0 z-50 md:hidden border-t backdrop-blur-md px-6 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ${
      themeMode === 'light' ? 'bg-[#f7faf8]/95 border-[#bbcbb5]' : 'bg-[#030504]/90 border-white/10'
    }`}>
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            location.pathname === '/' 
              ? 'text-[#006e1b]' 
              : (themeMode === 'light' ? 'text-slate-650 hover:text-slate-900' : 'text-white/60 hover:text-white')
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link 
          to="/shop" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            location.pathname === '/shop' 
              ? 'text-[#006e1b]' 
              : (themeMode === 'light' ? 'text-slate-650 hover:text-slate-900' : 'text-white/60 hover:text-white')
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Shop</span>
        </Link>
        <button 
          onClick={() => {
            if (isMobileSearchOpen) {
              closeSearch();
            } else {
              setIsMobileSearchOpen(true);
              setIsMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            isMobileSearchOpen 
              ? 'text-[#006e1b]' 
              : (themeMode === 'light' ? 'text-slate-650 hover:text-slate-900' : 'text-white/60 hover:text-white')
          }`}
        >
          {isMobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          <span>{isMobileSearchOpen ? 'Close' : 'Search'}</span>
        </button>
        <Link 
          to="/cart" 
          className={`relative flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            location.pathname === '/cart' 
              ? 'text-[#006e1b]' 
              : (themeMode === 'light' ? 'text-slate-650 hover:text-slate-900' : 'text-white/60 hover:text-white')
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Cart</span>
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#25d958] text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </Link>
        <Link 
          to={user ? (isAdmin ? (isSuperAdmin ? "/superadmin/dashboard" : "/admin/dashboard") : "/dashboard") : "/login"} 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            location.pathname.startsWith('/dashboard') || location.pathname === '/login' 
              ? 'text-[#006e1b]' 
              : (themeMode === 'light' ? 'text-slate-650 hover:text-slate-900' : 'text-white/60 hover:text-white')
          }`}
        >
          <User className="w-5 h-5" />
          <span>{user ? 'Account' : 'Login'}</span>
        </Link>
      </div>
    </div>
  </>
);
};

export default Navbar;
