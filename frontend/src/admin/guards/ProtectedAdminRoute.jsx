import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, isSuperAdminRole } from '../constants/rbac';
import PageLoader from '../../components/ui/PageLoader';
import authService from '../../services/auth.service';
import { toast } from 'sonner';

const FirstLoginResetScreen = ({ email, logout }) => {
  const [step, setStep] = useState(1); // 1: Send OTP trigger, 2: OTP & New Password Form
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleTriggerReset = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Security code sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to send security code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the 6-digit security code');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        otp,
        new_password: newPassword
      });
      toast.success('Password updated successfully! Please login with your new password.');
      logout(); // clear session and redirect to login
      setTimeout(() => {
        window.location.href = `/login?email=${encodeURIComponent(email)}`;
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-[#ffffff]/60 dark:bg-[#131b17]/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 p-8 rounded-3xl shadow-2xl text-slate-900 dark:text-slate-100 transition-all duration-300">
        {step === 1 ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse border border-amber-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold uppercase tracking-tight mb-3">Security Notice</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Hi there! For security reasons, you must reset your temporary password before accessing the administrative panel. 
              We will send a verification code to <strong>{email}</strong>.
            </p>
            <button 
              onClick={handleTriggerReset} 
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-primary hover:bg-[#005a14] text-white font-bold uppercase tracking-wider shadow-lg shadow-primary/20 w-full transition-all disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight mb-2">Set New Password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter the 6-digit security code sent to <strong>{email}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Code</label>
              <input 
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                required
                className="w-full h-12 text-center tracking-widest text-lg font-bold bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm Password</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="mt-4 px-6 py-3.5 rounded-xl bg-primary hover:bg-[#005a14] text-white font-bold uppercase tracking-wider shadow-lg shadow-primary/20 w-full transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Reset Password'}
            </button>

            <button 
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-2"
            >
              Go Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const ProtectedAdminRoute = ({ children, permission = null }) => {
  const { user, loading, logout, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs text-slate-550 font-bold uppercase tracking-wider">Loading admin session...</p>
      </div>
    );
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
      <div className="p-8 text-center max-w-md mx-auto mt-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-slate-950 dark:text-slate-100">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-tighter mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You do not have the required permissions ({permission}) to view this module. Please contact your Super Admin if you need access.</p>
        <button onClick={() => window.history.back()} className="px-6 py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:bg-emerald-hover shadow-lg shadow-emerald-glow w-full transition-all">Go Back</button>
      </div>
    );
  }
  
  return children;
};

export default ProtectedAdminRoute;
