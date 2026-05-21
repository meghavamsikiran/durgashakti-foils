import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
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

// Admin (lazy loaded)
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout'));
const ProtectedAdminRoute = lazy(() => import('./admin/guards/ProtectedAdminRoute'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const ProductsPage = lazy(() => import('./admin/pages/ProductsPage'));
const InventoryPage = lazy(() => import('./admin/pages/InventoryPage'));
const OrdersPage = lazy(() => import('./admin/pages/OrdersPage'));
const CustomersPage = lazy(() => import('./admin/pages/CustomersPage'));
const PaymentsPage = lazy(() => import('./admin/pages/PaymentsPage'));
const GstImportPage = lazy(() => import('./admin/pages/GstImportPage'));
const GstReportsPage = lazy(() => import('./admin/pages/GstReportsPage'));
const AuditLogsPage = lazy(() => import('./admin/pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage'));
const AnalyticsPage = lazy(() => import('./admin/pages/AnalyticsPage'));
const AdminUsersPage = lazy(() => import('./admin/pages/AdminUsersPage'));
const InquiriesPage = lazy(() => import('./admin/pages/InquiriesPage'));

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
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <AuthProvider>
      <CartProvider>
        <ProgressProvider>
        <div className="App">
          <ScrollToTop />
          <RouteTransitionLoader />
          {!isAdminPath && <Navbar />}
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
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/order/:id" element={
                <ProtectedRoute><OrderDetailsPage /></ProtectedRoute>
              } />
              <Route path="/order-success" element={
                <ProtectedRoute><OrderSuccess /></ProtectedRoute>
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
                <Route path="stock" element={<ProtectedAdminRoute permission="view_inventory"><InventoryPage /></ProtectedAdminRoute>} />
                <Route path="orders" element={<ProtectedAdminRoute permission="view_orders"><OrdersPage /></ProtectedAdminRoute>} />
                <Route path="customers" element={<ProtectedAdminRoute permission="view_customers"><CustomersPage /></ProtectedAdminRoute>} />
                <Route path="inquiries" element={<ProtectedAdminRoute permission="view_inquiries"><InquiriesPage /></ProtectedAdminRoute>} />
                <Route
                  path="payments"
                  element={
                    <ProtectedAdminRoute permission="view_transactions">
                      <PaymentsPage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route path="analytics" element={<ProtectedAdminRoute permission="view_analytics"><AnalyticsPage /></ProtectedAdminRoute>} />
                <Route
                  path="gst-reports"
                  element={
                    <ProtectedAdminRoute permission="view_gst_reports">
                      <GstReportsPage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="import-gst-data"
                  element={
                    <ProtectedAdminRoute permission="upload_gst_files">
                      <GstImportPage />
                    </ProtectedAdminRoute>
                  }
                />
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
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          {!isAdminPath && <Footer />}
          <Toaster position="top-center" closeButton visibleToasts={1} />
        </div>
        </ProgressProvider>
      </CartProvider>
    </AuthProvider>
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
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
