import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Feature hooks
  const { orders, loading: ordersLoading, fetchOrders, cancelOrder, returnOrder } = useOrders();
  const { wishlist, loading: wishlistLoading, toggleWishlist } = useWishlist();
  const { addresses, loading: addressesLoading, addAddress, updateAddress, deleteAddress } = useAddresses();
  const { notifications, loading: notificationsLoading, unreadCount, markAllAsRead } = useNotifications();
  const { cards, loading: cardsLoading } = useSavedCards();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

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
        return <SavedCardsTab cards={cards} loading={cardsLoading} />;
      case 'wishlist':
        return <WishlistTab wishlist={wishlist} loading={wishlistLoading} onToggleWishlist={toggleWishlist} />;
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
        <ProfileHeader user={user} activeTab={activeTab} />
        
        <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
          <Sidebar 
            user={user} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            unreadNotifications={unreadCount}
            onLogout={logout} 
          />
          
          <main className="flex-1 min-w-0">
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