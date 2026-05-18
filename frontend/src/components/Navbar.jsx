import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Package, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className="w-full bg-slate-900 text-white overflow-hidden py-2 relative">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-8 border-r border-white/10">✨ Durga Shakti Foils: Premium Aluminum Packaging Solutions</span>

          
          {/* Repeat for seamless loop */}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-8 border-r border-white/10">✨ Durga Shakti Foils: Premium Aluminum Packaging Solutions</span>

        </div>
      </div>
      
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <Package className="w-6 h-6 text-primary" />
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
                  to={isAdmin ? "/admin/dashboard" : "/dashboard"}
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
                  <Link to="/admin/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-900 px-2">Admin Panel</Link>
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