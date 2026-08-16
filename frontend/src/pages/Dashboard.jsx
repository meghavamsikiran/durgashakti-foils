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
import TicketsTab from './dashboard/components/TicketsTab';
import WalletTab from './dashboard/components/WalletTab';

const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getActiveTabFromPath = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      const sub = parts[1];
      if (['orders', 'wallet', 'transactions', 'wishlist', 'addresses', 'settings', 'tickets'].includes(sub)) {
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

  // FIX BUG-08: Use refs so the handler always reads the latest logout/navigate
  // values, avoiding the stale-closure problem that affected the event listener.
  const logoutRef = React.useRef(logout);
  const navigateRef = React.useRef(navigate);
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    const handleDeleteAccount = async () => {
      try {
        await authService.deleteAccount();
        logoutRef.current();
        toast.success("Account deleted successfully");
        navigateRef.current('/');
      } catch (err) {
        toast.error("Failed to delete account. Please try again.");
      }
    };
    window.addEventListener('request-account-deletion', handleDeleteAccount);
    return () => window.removeEventListener('request-account-deletion', handleDeleteAccount);
  // Empty deps — handler is stable because it reads from refs, not the closure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggle-customer-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-customer-sidebar', handleToggle);
  }, []);

  if (authLoading) return <PageLoader message="Authenticating..." />;

  // FIX BUG-06: Surface profile-update errors to the user instead of silently
  // swallowing them. A full-page reload is still used on success so auth state
  // re-initialises cleanly with the updated user data.
  const handleUpdateProfile = async (data) => {
    try {
      await authService.updateProfile(data);
      toast.success("Profile updated successfully!");
      window.location.reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1310] flex flex-col xl:flex-row text-white">
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/60 xl:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        // FIX BUG-24: setActiveTab was a no-op. Route navigation is now handled
        // by navigating to the correct sub-path, which React Router picks up.
        setActiveTab={(tab) => navigate(`/dashboard/${tab}`)}
        wishlistCount={wishlist?.length || 0}
        onLogout={logout} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navigate={navigate}
      />
      
      <main className="flex-1 min-w-0 w-full min-h-screen flex flex-col bg-[#0C1310]">
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
          <ProfileHeader 
            user={user} 
            activeTab={activeTab} 
            onMenuClick={() => setSidebarOpen(true)}
          />
            <Routes>
              <Route path="/" element={<Navigate to="orders" replace />} />
              <Route path="orders" element={<OrdersTabWrapper />} />
              <Route path="wallet" element={<WalletTab />} />
              <Route path="transactions" element={<TransactionsTabWrapper />} />
            <Route path="wishlist" element={<WishlistTab wishlist={wishlist} onToggleWishlist={toggleWishlist} onClearWishlist={clearWishlist} />} />
            <Route path="addresses" element={<AddressesTabWrapper />} />
            <Route path="tickets" element={<TicketsTab />} />
            <Route path="tickets/:ticketId" element={<TicketsTab />} />
            <Route path="settings" element={<SettingsTab user={user} onUpdateProfile={handleUpdateProfile} />} />
            <Route path="*" element={<Navigate to="orders" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
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

export default Dashboard;
