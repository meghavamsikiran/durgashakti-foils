import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async (tokenOverride) => {
    const authToken = tokenOverride || token;
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      let response;
      response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const userData = response.data.user || response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logout();
      } else {
        console.error('Network or server error during auth check:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const accessToken = response.data.token;
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    await fetchUser(accessToken);
    return response.data;
  };

  const register = async (email, password, full_name, phone) => {
    const response = await axios.post(`${API_URL}/auth/register`, {
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
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = ['admin', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isSuperAdmin, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};