import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/ui/PageLoader';
import { useOrders } from '../hooks/useOrders';
import { useWishlist } from '../hooks/useWishlist';
import { useAddresses } from '../hooks/useAddresses';
import authService from '../services/auth.service';
import { toast } from 'sonner';

import Sidebar from './dashboard/components/Sidebar';
import ProfileHeader from './dashboard/components/ProfileHeader';
import OrdersTab from './dashboard/components/OrdersTab';
import WishlistTab from './dashboard/components/WishlistTab';
import AddressesTab from './dashboard/components/AddressesTab';
import SettingsTab from './dashboard/components/SettingsTab';
import TransactionsTab from './dashboard/components/TransactionsTab';

const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getActiveTabFromPath = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      const sub = parts[1];
      if (['orders', 'transactions', 'wishlist', 'addresses', 'settings'].includes(sub)) {
        return sub;
      }
    }
    return 'orders';
  };

  const activeTab = getActiveTabFromPath(location.pathname);

  // Fetch wishlist at top-level to dynamically feed the sidebar badge count
  const { wishlist, toggleWishlist, clearWishlist } = useWishlist();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const handleDeleteAccount = async () => {
      try {
        await authService.deleteAccount();
        logout();
        toast.success("Account deleted successfully");
        navigate('/');
      } catch (err) {
        toast.error("Failed to delete account. Please try again.");
      }
    };
    window.addEventListener('request-account-deletion', handleDeleteAccount);
    return () => window.removeEventListener('request-account-deletion', handleDeleteAccount);
  }, [logout, navigate]);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggle-customer-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-customer-sidebar', handleToggle);
  }, []);

  if (authLoading) return <PageLoader message="Authenticating..." />;

  const handleUpdateProfile = async (data) => {
    try {
      await authService.updateProfile(data);
      window.location.reload();
    } catch (err) {}
  };

  // Respective route wrappers: Hook calls are triggered ONLY when their sub-routes are mounted
  const OrdersTabWrapper = () => {
    const { orders, loading, error, fetchOrders, cancelOrder } = useOrders();
    return <OrdersTab orders={orders} loading={loading} error={error} onRetry={fetchOrders} onCancelOrder={cancelOrder} />;
  };

  const TransactionsTabWrapper = () => {
    const { orders, loading, error } = useOrders();
    return <TransactionsTab orders={orders} loading={loading} error={error} />;
  };

  const AddressesTabWrapper = () => {
    const { addresses, loading, addAddress, updateAddress, deleteAddress } = useAddresses();
    return <AddressesTab addresses={addresses} loading={loading} onAddAddress={addAddress} onUpdateAddress={updateAddress} onDeleteAddress={deleteAddress} />;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 xl:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-10">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 items-start">
          <Sidebar 
            user={user} 
            activeTab={activeTab} 
            setActiveTab={() => {}} 
            wishlistCount={wishlist?.length || 0}
            onLogout={logout} 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            navigate={navigate}
          />
          
          <main className="flex-1 min-w-0 w-full flex flex-col gap-6">
            <ProfileHeader 
              user={user} 
              activeTab={activeTab} 
              onMenuClick={() => setSidebarOpen(true)}
            />
            <Routes>
              <Route path="/" element={<Navigate to="orders" replace />} />
              <Route path="orders" element={<OrdersTabWrapper />} />
              <Route path="transactions" element={<TransactionsTabWrapper />} />
              <Route path="wishlist" element={<WishlistTab wishlist={wishlist} onToggleWishlist={toggleWishlist} onClearWishlist={clearWishlist} />} />
              <Route path="addresses" element={<AddressesTabWrapper />} />
              <Route path="settings" element={<SettingsTab user={user} onUpdateProfile={handleUpdateProfile} />} />
              <Route path="*" element={<Navigate to="orders" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
