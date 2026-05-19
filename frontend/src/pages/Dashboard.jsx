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
import OrderDetailsModal from './dashboard/components/OrderDetailsModal';

const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Feature hooks
  const { orders, loading: ordersLoading, fetchOrders, cancelOrder, returnOrder } = useOrders();
  const { wishlist, loading: wishlistLoading, toggleWishlist, clearWishlist } = useWishlist();
  const { addresses, loading: addressesLoading, addAddress, updateAddress, deleteAddress } = useAddresses();
  const { notifications, loading: notificationsLoading, unreadCount, markAllAsRead } = useNotifications();
  const { cards, loading: cardsLoading, saveCard } = useSavedCards();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      const params = new URLSearchParams(location.search);
      const orderId = params.get('order');
      if (orderId && orders.length > 0) {
        const order = orders.find(o => o.order_number === orderId || o.id === orderId);
        if (order) setSelectedOrder(order);
      }
    }
  }, [authLoading, user, navigate, location.search, orders]);

  useEffect(() => {
    const handleDeleteAccount = async () => {
      try {
        await authService.deleteAccount();
        logout();
        navigate('/');
      } catch (err) {
        alert("Failed to delete account. Please try again.");
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
        return <OrdersTab orders={orders} loading={ordersLoading} onCancelOrder={cancelOrder} onSelectOrder={setSelectedOrder} />;
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 pt-12">
        <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 items-start">
          <Sidebar 
            user={user} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            unreadNotifications={unreadCount}
            wishlistCount={wishlist?.length || 0}
            onLogout={logout} 
          />
          
          <main className="flex-1 min-w-0 w-full flex flex-col gap-8">
            <ProfileHeader user={user} activeTab={activeTab} />
            {renderTabContent()}
          </main>
        </div>
      </div>

      <OrderDetailsModal 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onReturnOrder={returnOrder}
      />
    </div>
  );
};

export default Dashboard;