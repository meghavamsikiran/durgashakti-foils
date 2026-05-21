import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../services/core/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Normalizes role strings from the backend to a consistent format.
 * Backend uses: "customer", "admin", "SUPER_ADMIN"
 */
const normalizeRole = (role) => {
  if (!role) return 'customer';
  const upper = role.toUpperCase();
  if (upper === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (upper === 'ADMIN') return 'admin';
  return 'customer';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (tokenOverride) => {
    const authToken = tokenOverride || token;
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const userData = response.data.user || response.data;
      // Normalize role for consistent frontend checks
      if (userData) {
        userData.role = normalizeRole(userData.role);
      }
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      if (error?.status === 401 || error?.response?.status === 401) {
        // Token expired or invalid — clean up silently
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      // For network errors, keep the cached user data to avoid logout on transient failures
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const accessToken = response.data.token;
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    await fetchUser(accessToken);
    return response.data;
  }, [fetchUser]);

  const register = useCallback(async (email, password, full_name, phone) => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      full_name,
      phone
    });
    const accessToken = response.data.token;
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    await fetchUser(accessToken);
    return response.data;
  }, [fetchUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ds_guest_cart');
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.permissions && user.permissions[permission]) return true;

    const PERMISSION_MAPPING = {
      'manage_orders': ['view_orders', 'update_order_status', 'cancel_orders', 'view_order_details'],
      'manage_products': ['view_products', 'create_products', 'edit_products', 'delete_products'],
      'manage_inventory': ['view_inventory', 'update_stock'],
      'manage_customers': ['view_customers', 'view_customer_history', 'view_inquiries', 'update_inquiry_status', 'reply_inquiry'],
      'access_financial_reports': ['view_transactions', 'update_payment_status', 'export_payment_reports', 'view_analytics'],
      'access_gst_reports': ['view_gst_reports', 'export_gst_reports', 'upload_gst_files', 'import_gst_data'],
      'manage_admins': ['create_admin', 'edit_admin', 'disable_admin', 'delete_admin', 'assign_permissions', 'view_audit_logs'],
      'manage_settings': ['manage_settings']
    };

    if (PERMISSION_MAPPING[permission]) {
      return PERMISSION_MAPPING[permission].some(p => user.permissions && user.permissions[p]);
    }

    for (const [legacy, granularList] of Object.entries(PERMISSION_MAPPING)) {
      if (granularList.includes(permission)) {
        if (user.permissions && user.permissions[legacy]) return true;
      }
    }

    return false;
  }, [user]);

  const loginWithGoogle = useCallback(async (accessToken) => {
    const response = await apiClient.post('/auth/google', { access_token: accessToken });
    const tokenVal = response.data.token;
    setToken(tokenVal);
    localStorage.setItem('token', tokenVal);
    await fetchUser(tokenVal);
    return response.data;
  }, [fetchUser]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAdmin: user?.role === 'admin' || user?.role === 'SUPER_ADMIN',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAuthenticated: !!user && !!token,
    hasPermission,
    refreshUser: fetchUser
  }), [user, token, loading, login, register, loginWithGoogle, logout, fetchUser, hasPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};