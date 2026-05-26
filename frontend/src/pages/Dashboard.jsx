import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/ui/PageLoader';
import { useOrders } from '../hooks/useOrders';
import { useWishlist } from '../hooks/useWishlist';
import { useAddresses } from '../hooks/useAddresses';
import { useNotifications } from '../hooks/useNotifications';
import { useSavedCards } from '../hooks/useSavedCards';
import authService from '../services/auth.service';

import Sidebar from './dashboard/components/Sidebar';
import ProfileHeader from './dashboard/components/ProfileHeader';
import OrdersTab from './dashboard/components/OrdersTab';
import WishlistTab from './dashboard/components/WishlistTab';
import AddressesTab from './dashboard/components/AddressesTab';
import NotificationsTab from './dashboard/components/NotificationsTab';
import SavedCardsTab from './dashboard/components/SavedCardsTab';
import SettingsTab from './dashboard/components/SettingsTab';
import TransactionsTab from './dashboard/components/TransactionsTab';

const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('dashboardActiveTab') || 'orders';
  });

  useEffect(() => {
    localStorage.setItem('dashboardActiveTab', activeTab);
  }, [activeTab]);

  // Feature hooks
  const { orders, loading: ordersLoading, fetchOrders, cancelOrder, returnOrder } = useOrders();
  const { wishlist, loading: wishlistLoading, toggleWishlist, clearWishlist } = useWishlist();
  const { addresses, loading: addressesLoading, addAddress, updateAddress, deleteAddress } = useAddresses();
  const { notifications, loading: notificationsLoading, unreadCount, markAllAsRead } = useNotifications();
  const { cards, loading: cardsLoading, saveCard } = useSavedCards();

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

  if (authLoading) return <PageLoader message="Authenticating..." />;

  const handleUpdateProfile = async (data) => {
    try {
      await authService.updateProfile(data);
      // Reload page or update context if needed
      window.location.reload();
    } catch (err) {}
  };

  const handleChangePassword = async (data) => {
    try {
      await authService.changePassword(data);
    } catch (err) {}
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return <OrdersTab orders={orders} loading={ordersLoading} onCancelOrder={cancelOrder} />;
      case 'transactions':
        return <TransactionsTab orders={orders} />;
      case 'cards':
        return <SavedCardsTab cards={cards} loading={cardsLoading} onSaveCard={saveCard} />;
      case 'wishlist':
        return <WishlistTab wishlist={wishlist} loading={wishlistLoading} onToggleWishlist={toggleWishlist} onClearWishlist={clearWishlist} />;
      case 'addresses':
        return <AddressesTab addresses={addresses} loading={addressesLoading} onAddAddress={addAddress} onUpdateAddress={updateAddress} onDeleteAddress={deleteAddress} />;
      case 'notifications':
        return <NotificationsTab notifications={notifications} loading={notificationsLoading} onMarkAllAsRead={markAllAsRead} />;
      case 'settings':
        return <SettingsTab user={user} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} />;
      default:
        return <OrdersTab orders={orders} loading={ordersLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-10">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 items-start">
          <Sidebar 
            user={user} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            unreadNotifications={unreadCount}
            wishlistCount={wishlist?.length || 0}
            onLogout={logout} 
          />
          
          <main className="flex-1 min-w-0 w-full flex flex-col gap-6">
            <ProfileHeader user={user} activeTab={activeTab} />
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
