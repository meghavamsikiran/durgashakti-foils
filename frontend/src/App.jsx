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
import OrderPolicies from './pages/OrderPolicies';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Lazy loaded (authenticated routes)
const Checkout = lazy(() => import('./pages/Checkout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const ProductReviewPage = lazy(() => import('./pages/ProductReviewPage'));

// Admin (lazy loaded)
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout'));
const ProtectedAdminRoute = lazy(() => import('./admin/guards/ProtectedAdminRoute'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const ProductsPage = lazy(() => import('./admin/pages/ProductsPage'));
const CategoriesPage = lazy(() => import('./admin/pages/CategoriesPage'));
const InventoryPage = lazy(() => import('./admin/pages/InventoryPage'));
const OrdersPage = lazy(() => import('./admin/pages/OrdersPage'));
const AdminOrderDetailsPage = lazy(() => import('./admin/pages/AdminOrderDetailsPage'));
const CustomersPage = lazy(() => import('./admin/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./admin/pages/CustomerDetailPage'));
const PaymentsPage = lazy(() => import('./admin/pages/PaymentsPage'));
const GstReportsPage = lazy(() => import('./admin/pages/GstReportsPage'));
const AuditLogsPage = lazy(() => import('./admin/pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage'));
const ShippingSettingsPage = lazy(() => import('./admin/pages/ShippingSettingsPage'));
const WhatsAppBotPage = lazy(() => import('./admin/pages/WhatsAppBotPage'));
const CouponsPage = lazy(() => import('./admin/pages/CouponsPage'));
const AdminWalletPage = lazy(() => import('./admin/pages/AdminWalletPage'));
const AnalyticsPage = lazy(() => import('./admin/pages/AnalyticsPage'));
const AdminUsersPage = lazy(() => import('./admin/pages/AdminUsersPage'));
const InquiriesPage = lazy(() => import('./admin/pages/InquiriesPage'));
const AdminProfilePage = lazy(() => import('./admin/pages/AdminProfilePage'));
const BusinessProfilePage = lazy(() => import('./admin/pages/BusinessProfilePage'));
const ReviewsPage = lazy(() => import('./admin/pages/ReviewsPage'));

import NotFound from './pages/NotFound';

import PageLoader from './components/ui/PageLoader';
import './App.css';
import Maintenance from './pages/Maintenance';
import AiAssistant from './components/AiAssistant';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { loading: authLoading } = useAuth();
  const location = useLocation();
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('themeMode') || 'dark');

  React.useEffect(() => {
    const handleThemeToggle = (e) => {
      setThemeMode(e.detail);
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark');
    }
  }, [themeMode]);

  const isAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin');
  const isProtectedRoute = location.pathname.startsWith('/dashboard') || 
                           location.pathname.startsWith('/checkout') || 
                           location.pathname.startsWith('/order') || 
                           location.pathname.startsWith('/review');
  const themeClass = isAdminPath 
    ? (themeMode === 'light' ? 'admin-theme light-theme' : 'admin-theme dark')
    : (themeMode === 'light' ? 'public-theme light-theme' : 'public-theme dark');

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
            <Route path="/policies" element={<OrderPolicies />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

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

            {/* Admin and Super Admin Shared Routes */}
            {['/admin/*', '/superadmin/*'].map((rootPath) => (
              <Route
                key={rootPath}
                path={rootPath}
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<ProtectedAdminRoute permission="view_products"><ProductsPage /></ProtectedAdminRoute>} />
                <Route path="shop" element={<ProtectedAdminRoute permission="view_products"><Shop /></ProtectedAdminRoute>} />
                <Route path="categories" element={<ProtectedAdminRoute permission="edit_products"><CategoriesPage /></ProtectedAdminRoute>} />
                <Route path="stock" element={<ProtectedAdminRoute permission="view_inventory"><InventoryPage /></ProtectedAdminRoute>} />
                <Route path="orders" element={<ProtectedAdminRoute permission="view_orders"><OrdersPage /></ProtectedAdminRoute>} />
                <Route path="orders/:id" element={<ProtectedAdminRoute permission="view_order_details"><AdminOrderDetailsPage /></ProtectedAdminRoute>} />
                <Route path="customers" element={<ProtectedAdminRoute permission="view_customers"><CustomersPage /></ProtectedAdminRoute>} />
                <Route path="customers/:id" element={<ProtectedAdminRoute permission="view_customers"><CustomerDetailPage /></ProtectedAdminRoute>} />
                <Route path="cases" element={<ProtectedAdminRoute permission="view_inquiries"><InquiriesPage /></ProtectedAdminRoute>} />
                <Route path="cases/:caseId" element={<ProtectedAdminRoute permission="view_inquiries"><InquiriesPage /></ProtectedAdminRoute>} />
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
                  path="whatsapp"
                  element={
                    <ProtectedAdminRoute permission="manage_settings">
                      <WhatsAppBotPage />
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
                <Route path="wallet" element={<AdminWalletPage />} />
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
            ))}

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {!isAdminPath && !(isProtectedRoute && authLoading) && <Footer />}
        {!isAdminPath && <AiAssistant />}
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
