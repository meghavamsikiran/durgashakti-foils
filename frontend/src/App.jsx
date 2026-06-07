import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import PopupBanner from './components/PopupBanner';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ProgressProvider } from './components/ui/ProgressToast';
import RouteTransitionLoader from './components/ui/RouteTransitionLoader';
import SuspenseTrigger from './components/ui/SuspenseTrigger';

// Eagerly loaded (critical path)
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Cart from './pages/Cart';
import About from './pages/About';
import Contact from './pages/Contact';

// Lazy loaded (authenticated routes)
const Checkout = lazy(() => import('./pages/Checkout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const ProductReviewPage = lazy(() => import('./pages/ProductReviewPage'));

// Admin (eagerly loaded for instant tab switching)
import AdminLayout from './admin/layouts/AdminLayout';
import ProtectedAdminRoute from './admin/guards/ProtectedAdminRoute';
import AdminDashboard from './admin/pages/AdminDashboard';
import ProductsPage from './admin/pages/ProductsPage';
import CategoriesPage from './admin/pages/CategoriesPage';
import InventoryPage from './admin/pages/InventoryPage';
import OrdersPage from './admin/pages/OrdersPage';
import CustomersPage from './admin/pages/CustomersPage';
import CustomerDetailPage from './admin/pages/CustomerDetailPage';
import PaymentsPage from './admin/pages/PaymentsPage';
import GstReportsPage from './admin/pages/GstReportsPage';
import AuditLogsPage from './admin/pages/AuditLogsPage';
import SettingsPage from './admin/pages/SettingsPage';
import ShippingSettingsPage from './admin/pages/ShippingSettingsPage';
import CouponsPage from './admin/pages/CouponsPage';
import AnalyticsPage from './admin/pages/AnalyticsPage';
import AdminUsersPage from './admin/pages/AdminUsersPage';
import InquiriesPage from './admin/pages/InquiriesPage';
import AdminProfilePage from './admin/pages/AdminProfilePage';
import BusinessProfilePage from './admin/pages/BusinessProfilePage';
import ReviewsPage from './admin/pages/ReviewsPage';

import PageLoader from './components/ui/PageLoader';
import './App.css';
import Maintenance from './pages/Maintenance';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { loading: authLoading } = useAuth();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin');
  const isShopPath = location.pathname === '/shop';
  const isLightPath = isShopPath || 
                      location.pathname.startsWith('/dashboard') || 
                      location.pathname.startsWith('/checkout') || 
                      location.pathname.startsWith('/order') || 
                      location.pathname.startsWith('/review');
  const isProtectedRoute = location.pathname.startsWith('/dashboard') || 
                           location.pathname.startsWith('/checkout') || 
                           location.pathname.startsWith('/order') || 
                           location.pathname.startsWith('/review');
  const themeClass = isAdminPath ? 'admin-theme' : (isLightPath ? 'public-theme light-theme' : 'public-theme');

  return (
    <CartProvider>
      <ProgressProvider>
      <div className={`App ${themeClass} pb-16 md:pb-0`}>
        <ScrollToTop />
        <RouteTransitionLoader />
        {!isAdminPath && <Navbar />}
        {!isAdminPath && <PopupBanner />}
        <Suspense fallback={<SuspenseTrigger />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Protected Customer Routes */}
            <Route path="/checkout" element={
              <ProtectedRoute><Checkout /></ProtectedRoute>
            } />
            <Route path="/dashboard/*" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/order/:id" element={
              <ProtectedRoute><OrderDetailsPage /></ProtectedRoute>
            } />
            <Route path="/order-success" element={
              <ProtectedRoute><OrderSuccess /></ProtectedRoute>
            } />
            <Route path="/review/:orderId/:productId" element={
              <ProtectedRoute><ProductReviewPage /></ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<ProtectedAdminRoute permission="view_products"><ProductsPage /></ProtectedAdminRoute>} />
              <Route path="categories" element={<ProtectedAdminRoute permission="edit_products"><CategoriesPage /></ProtectedAdminRoute>} />
              <Route path="stock" element={<ProtectedAdminRoute permission="view_inventory"><InventoryPage /></ProtectedAdminRoute>} />
              <Route path="orders" element={<ProtectedAdminRoute permission="view_orders"><OrdersPage /></ProtectedAdminRoute>} />
              <Route path="customers" element={<ProtectedAdminRoute permission="view_customers"><CustomersPage /></ProtectedAdminRoute>} />
              <Route path="customers/:id" element={<ProtectedAdminRoute permission="view_customers"><CustomerDetailPage /></ProtectedAdminRoute>} />
              <Route path="inquiries" element={<ProtectedAdminRoute permission="view_inquiries"><InquiriesPage /></ProtectedAdminRoute>} />
              <Route path="reviews" element={<ProtectedAdminRoute permission="view_reviews"><ReviewsPage /></ProtectedAdminRoute>} />
              <Route
                path="payments"
                element={
                  <ProtectedAdminRoute permission="view_transactions">
                    <PaymentsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="analytics" element={<ProtectedAdminRoute permission="view_analytics"><AnalyticsPage /></ProtectedAdminRoute>} />
              <Route path="gstr1" element={<ProtectedAdminRoute permission="view_gst_reports"><GstReportsPage /></ProtectedAdminRoute>} />
              <Route
                path="admins"
                element={
                  <ProtectedAdminRoute permission="manage_admins">
                    <AdminUsersPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedAdminRoute permission="view_audit_logs">
                    <AuditLogsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <SettingsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="shipping-settings"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <ShippingSettingsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="coupons"
                element={
                  <ProtectedAdminRoute permission="manage_coupons">
                    <CouponsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <BusinessProfilePage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="my-account" element={<AdminProfilePage />} />
            </Route>

            {/* Super Admin Routes */}
            <Route
              path="/superadmin/*"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<ProtectedAdminRoute permission="view_products"><ProductsPage /></ProtectedAdminRoute>} />
              <Route path="categories" element={<ProtectedAdminRoute permission="edit_products"><CategoriesPage /></ProtectedAdminRoute>} />
              <Route path="stock" element={<ProtectedAdminRoute permission="view_inventory"><InventoryPage /></ProtectedAdminRoute>} />
              <Route path="orders" element={<ProtectedAdminRoute permission="view_orders"><OrdersPage /></ProtectedAdminRoute>} />
              <Route path="customers" element={<ProtectedAdminRoute permission="view_customers"><CustomersPage /></ProtectedAdminRoute>} />
              <Route path="customers/:id" element={<ProtectedAdminRoute permission="view_customers"><CustomerDetailPage /></ProtectedAdminRoute>} />
              <Route path="inquiries" element={<ProtectedAdminRoute permission="view_inquiries"><InquiriesPage /></ProtectedAdminRoute>} />
              <Route path="reviews" element={<ProtectedAdminRoute permission="view_reviews"><ReviewsPage /></ProtectedAdminRoute>} />
              <Route
                path="payments"
                element={
                  <ProtectedAdminRoute permission="view_transactions">
                    <PaymentsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="analytics" element={<ProtectedAdminRoute permission="view_analytics"><AnalyticsPage /></ProtectedAdminRoute>} />
              <Route path="gstr1" element={<ProtectedAdminRoute permission="view_gst_reports"><GstReportsPage /></ProtectedAdminRoute>} />
              <Route
                path="admins"
                element={
                  <ProtectedAdminRoute permission="manage_admins">
                    <AdminUsersPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedAdminRoute permission="view_audit_logs">
                    <AuditLogsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <SettingsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="shipping-settings"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <ShippingSettingsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="coupons"
                element={
                  <ProtectedAdminRoute permission="manage_coupons">
                    <CouponsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedAdminRoute permission="manage_settings">
                    <BusinessProfilePage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="my-account" element={<AdminProfilePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        {!isAdminPath && !(isProtectedRoute && authLoading) && <Footer />}
        <Toaster position="top-center" closeButton visibleToasts={1} />
      </div>
      </ProgressProvider>
    </CartProvider>
  );
}

function App() {
  // Check if maintenance mode is explicitly enabled
  const isMaintenanceMode = process.env.REACT_APP_MAINTENANCE_MODE === 'true';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const showMaintenance = isMaintenanceMode && (!isLocal || process.env.REACT_APP_FORCE_MAINTENANCE === 'true');

  if (showMaintenance) {
    return <Maintenance />;
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
