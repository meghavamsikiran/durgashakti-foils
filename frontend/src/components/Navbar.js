import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';

const Navbar = () => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
            <Package className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Manrope' }}>
              Durga Shakti<span className="text-primary ml-1">Foils</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/shop"
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="navbar-shop-link"
            >
              Shop
            </Link>

            {user ? (
              <>
                <Link
                  to="/cart"
                  className="relative"
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

                {!isAdmin ? (
                  <Link
                    to="/dashboard"
                    data-testid="navbar-dashboard-link"
                  >
                    <User className="w-5 h-5 hover:text-primary transition-colors" />
                  </Link>
                ) : (
                  <Link to="/admin/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </Link>
                )}

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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;