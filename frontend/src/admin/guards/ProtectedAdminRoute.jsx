import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, isSuperAdminRole } from '../constants/rbac';
import PageLoader from '../../components/ui/PageLoader';
import authService from '../../services/auth.service';
import { toast } from 'sonner';

const FirstLoginResetScreen = ({ email, logout }) => {
  const [loading, setLoading] = useState(false);

  const handleTriggerReset = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Reset code sent to your email!');
      logout(); // clear session
      setTimeout(() => {
        window.location.href = `/forgot-password?email=${encodeURIComponent(email)}`;
      }, 1000);
    } catch (err) {
      toast.error(err.message || 'Failed to trigger password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-center max-w-md mx-auto mt-20 bg-white rounded-3xl border border-slate-200 shadow-xl">
      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">First Login Security Notice</h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Hi there! For security reasons, you must reset your temporary password before accessing the administrative panel. 
        We will send a verification code to <strong>{email}</strong>.
      </p>
      <button 
        onClick={handleTriggerReset} 
        disabled={loading}
        className="px-6 py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow w-full transition-all disabled:opacity-50"
      >
        {loading ? 'Sending Code...' : 'Send Code & Reset Password'}
      </button>
    </div>
  );
};

const ProtectedAdminRoute = ({ children, permission = null }) => {
  const { user, loading, logout, hasPermission } = useAuth();

  if (loading) {
    return <PageLoader message="Loading admin session" />;
  }
  if (!user || !isAdminRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // First Login Interceptor
  if (user.permissions?.is_first_login === true) {
    return <FirstLoginResetScreen email={user.email} logout={logout} />;
  }
  
  // If route requires specific permission and user lacks it
  if (permission && !hasPermission(permission)) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-20 bg-white rounded-3xl border border-slate-200 shadow-xl">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 mb-6">You do not have the required permissions ({permission}) to view this module. Please contact your Super Admin if you need access.</p>
        <button onClick={() => window.history.back()} className="px-6 py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow w-full transition-all">Go Back</button>
      </div>
    );
  }
  
  return children;
};

export default ProtectedAdminRoute;
