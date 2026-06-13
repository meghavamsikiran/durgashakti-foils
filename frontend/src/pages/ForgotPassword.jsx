import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import authService from '../services/auth.service';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('themeMode') !== 'light');

  React.useEffect(() => {
    const handleThemeToggle = (e) => {
      setIsDark(e.detail === 'dark');
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  React.useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('OTP sent to your email');
      setStep(2);
      setResendTimer(30); // Start 30s countdown
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('OTP resent to your email');
      setResendTimer(30); // Restart 30s countdown
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword({ 
        email, 
        otp, 
        new_password: newPassword 
      });
      toast.success('Password reset successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-6" 
      style={{ 
        backgroundImage: isDark
          ? "linear-gradient(rgba(19, 27, 23, 0.82), rgba(19, 27, 23, 0.82)), url('/login_bg.webp')"
          : "linear-gradient(rgba(247, 250, 248, 0.78), rgba(247, 250, 248, 0.78)), url('/login_bg.webp')",
        backgroundSize: "360px",
        backgroundRepeat: "repeat",
        backgroundPosition: "center"
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div 
          className={`border rounded-xl p-8 shadow-2xl transition-all duration-300 backdrop-blur-lg ${
            isDark 
              ? 'bg-[#131B17]/45 border-white/10 text-white' 
              : 'bg-white/45 border-black/5 text-[#181c1b]'
          }`}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
            {step === 1 ? 'Forgot Password?' : 'Verify OTP'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {step === 1 
              ? 'Enter your email to receive a password reset code' 
              : 'Enter the 6-digit code sent to your email'}
          </p>

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <Label htmlFor="email" className={isDark ? "text-slate-200" : "text-slate-700 font-semibold"}>Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-[#005a14] text-white font-bold rounded-sm">
                {loading ? 'Sending...' : 'Send Recovery Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="otp" className={isDark ? "text-slate-200" : "text-slate-700 font-semibold"}>6-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="000000"
                  className="tracking-widest text-center font-bold text-lg bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-[11px] text-muted-foreground">
                    Didn't receive the code?
                  </span>
                  <button
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleResendOTP}
                    className={`text-[11px] font-bold transition-all ${
                      resendTimer > 0 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-primary hover:text-emerald-hover hover:underline cursor-pointer'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword" className={isDark ? "text-slate-200" : "text-slate-700 font-semibold"}>New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-[#005a14] text-white font-bold rounded-sm">
                {loading ? 'Resetting...' : 'Update Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
