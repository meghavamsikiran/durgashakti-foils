import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import OrderSuccess from './pages/OrderSuccess';
import api from './utils/api';
import AdminLayout from './admin/layouts/AdminLayout';
import ProtectedAdminRoute from './admin/guards/ProtectedAdminRoute';
import AdminDashboard from './admin/pages/AdminDashboard';
import ProductsPage from './admin/pages/ProductsPage';
import InventoryPage from './admin/pages/InventoryPage';
import OrdersPage from './admin/pages/OrdersPage';
import CustomersPage from './admin/pages/CustomersPage';
import PaymentsPage from './admin/pages/PaymentsPage';
import GstImportPage from './admin/pages/GstImportPage';
import GstReportsPage from './admin/pages/GstReportsPage';
import AuditLogsPage from './admin/pages/AuditLogsPage';
import SettingsPage from './admin/pages/SettingsPage';
import AnalyticsPage from './admin/pages/AnalyticsPage';
import AdminUsersPage from './admin/pages/AdminUsersPage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function AppRoutes() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminPath) return;
    const seedProducts = async () => {
      try {
        await api.seedProducts();
      } catch (error) {
        console.log('Products already seeded or error seeding');
      }
    };
    seedProducts();
  }, [isAdminPath]);

  return (
    <AuthProvider>
      <CartProvider>
        <div className="App">
          {!isAdminPath && <Navbar />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/order-success" element={<OrderSuccess />} />
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
              <Route path="products" element={<ProductsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route
                path="payments"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <PaymentsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route
                path="gst-reports"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <GstReportsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="import-gst-data"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <GstImportPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="admins"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <AdminUsersPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <AuditLogsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedAdminRoute superAdminOnly>
                    <SettingsPage />
                  </ProtectedAdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {!isAdminPath && <Footer />}
          <Toaster position="bottom-right" />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
