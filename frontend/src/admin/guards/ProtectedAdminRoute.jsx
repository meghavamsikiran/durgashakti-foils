import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, isSuperAdminRole } from '../constants/rbac';

const ProtectedAdminRoute = ({ children, superAdminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Loading admin session...</div>;
  }
  if (!user || !isAdminRole(user.role)) {
    return <Navigate to="/login" replace />;
  }
  if (superAdminOnly && !isSuperAdminRole(user.role)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

export default ProtectedAdminRoute;
