import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const normalizeAuthError = (error) => {
  if (error?.message) {
    return error.message;
  }
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((entry) => entry?.msg || entry?.type || 'Validation error').join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return 'Authentication failed';
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
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
    // Dynamically inject the official Google Identity Services client script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && !acceptTerms) {
      toast.error('You must accept the Terms and Conditions to create an account.');
      setLoading(false);
      return;
    }

    const identifier = email.trim();
    if (!isLogin && !identifier.includes('@')) {
      toast.error('Please enter your full @gmail.com address to create an account.');
      setLoading(false);
      return;
    }

    if (identifier.includes('@') && !identifier.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Only @gmail.com email addresses are permitted on this platform.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await login(identifier, password);
        toast.success('Login successful!');
        window.dispatchEvent(new CustomEvent('triggerLoginLoader', { detail: { duration: 3000 } }));
        const role = res.user?.role;
        
        setTimeout(() => {
          if (role === 'SUPER_ADMIN') {
            navigate('/superadmin/dashboard');
          } else if (role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/shop');
          }
          setLoading(false);
        }, 3000);
      } else {
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        if (!cleanPhone) {
          toast.error("Phone number is required");
          setLoading(false);
          return;
        }
        const last10 = cleanPhone.slice(-10);
        if (last10.length !== 10) {
          toast.error("Phone number must be exactly 10 digits");
          setLoading(false);
          return;
        }
        if (!/^[6-9]\d{9}$/.test(last10)) {
          toast.error("Please enter a valid 10-digit phone number (starts with 6-9)");
          setLoading(false);
          return;
        }
        await register(email, password, fullName, cleanPhone);
        toast.success('Registration successful!');
        window.dispatchEvent(new CustomEvent('triggerLoginLoader', { detail: { duration: 3000 } }));
        
        setTimeout(() => {
          navigate('/shop');
          setLoading(false);
        }, 3000);
      }
    } catch (error) {
      toast.error(normalizeAuthError(error));
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    if (!clientId || clientId === 'your_google_client_id_here' || clientId.trim() === '') {
      toast.error('Google Sign-In is not configured yet!', {
        description: 'Please set the REACT_APP_GOOGLE_CLIENT_ID environment variable in your deployment settings.',
        duration: 8000,
      });
      return;
    }

    try {
      const client = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId, 
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            setLoading(true);
            try {
              const res = await loginWithGoogle(tokenResponse.access_token);
              toast.success('Successfully authenticated with Google!');
              window.dispatchEvent(new CustomEvent('triggerLoginLoader', { detail: { duration: 3000 } }));
              const role = res.user?.role;
              
              setTimeout(() => {
                if (role === 'SUPER_ADMIN') {
                  navigate('/superadmin/dashboard');
                } else if (role === 'admin') {
                  navigate('/admin/dashboard');
                } else {
                  navigate('/shop');
                }
                setLoading(false);
              }, 3000);
            } catch (err) {
              toast.error(normalizeAuthError(err));
              setLoading(false);
            }
          }
        },
      });
      if (client) {
        client.requestAccessToken();
      } else {
        toast.error("Failed to load Google Sign-In. Please check your network connection.");
      }
    } catch (err) {
      console.error("Google Login Init Failed:", err);
      toast.error("Failed to initialize Google Login. Please try again.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-6 bg-cover bg-center bg-no-repeat" 
      style={{ backgroundImage: "url('/login_bg.webp')" }} 
      data-testid="login-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#131B17] border border-[#26322B] rounded-sm p-8 shadow-float text-white">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope' }} data-testid="login-title">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? 'Login to your account to continue shopping'
              : 'Sign up to start shopping'}
          </p>

          <form key={isLogin ? 'login-form' : 'register-form'} onSubmit={handleSubmit} className="space-y-4" autoComplete={isLogin ? "on" : "off"}>
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName" className="text-slate-200">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    data-testid="register-fullname-input"
                    className="bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-slate-200">Phone Number</Label>
                  <Input
                    id="phone"
                    type="text"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                    }}
                    required
                    data-testid="register-phone-input"
                    className="h-12 bg-[#131B17] border border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                    placeholder="Enter 10-digit phone number"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-200">{isLogin ? 'Email or Gmail Username' : 'Email'}</Label>
              <Input
                id="email"
                type="text"
                inputMode="email"
                autoComplete={isLogin ? "username" : "new-email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="bg-[#131B17] border-[#26322B] text-white placeholder:text-slate-550 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-12"
              />
              {isLogin && (
                <div className="flex justify-end mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="flex items-start gap-2.5 my-4" data-testid="terms-checkbox-container">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#26322B] text-primary focus:ring-primary/25 bg-[#131B17] accent-primary cursor-pointer"
                  required
                />
                <label htmlFor="acceptTerms" className="text-xs font-semibold text-slate-300 leading-normal select-none cursor-pointer">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary hover:underline font-extrabold focus:outline-none"
                  >
                    Terms & Conditions
                  </button>
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-sm font-semibold mb-4"
              data-testid="login-submit-button"
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/60"></div>
              <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase tracking-widest font-black">or</span>
              <div className="flex-grow border-t border-border/60"></div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full h-12 rounded-sm font-semibold flex items-center justify-center gap-3 border-[#26322B] bg-[#131B17] text-white hover:bg-white/5 hover:text-[#25D958] transition-colors mt-2"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setFullName('');
                setPhone('');
              }}
              className="text-sm text-primary hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </motion.div>
      {showTermsModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-testid="terms-modal">
          <div className={`relative w-full max-w-xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border transition-all duration-200 ${isDark ? 'bg-[#131B17] border-[#26322B] text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-[#26322B]' : 'border-slate-100'}`}>
              <h2 className={`text-lg font-black font-manrope ${isDark ? 'text-white' : 'text-slate-900'}`}>Terms & Conditions</h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className={`rounded-full p-1.5 transition-colors ${isDark ? 'text-slate-400 hover:bg-[#19231F] hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                data-testid="terms-modal-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Terms Content */}
            <div className={`flex-1 overflow-y-auto px-6 py-5 text-sm space-y-4 leading-relaxed no-scrollbar font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Welcome to Durga Shakti Foils. Please read these Terms and Conditions carefully before registering an account or purchasing from us.
              </p>
              
              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>1. Introduction</h3>
                <p className="mt-1">
                  By creating an account or using our services, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not create an account or place an order.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>2. Account Information & Security</h3>
                <p className="mt-1">
                  When you register, you must provide accurate, current, and complete information. You are solely responsible for safeguarding the credentials of your account and for any activities or actions under your password.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>3. Registration Rules</h3>
                <p className="mt-1">
                  Our platform permits account registration only using valid email addresses. Specifically, to ensure identity verification, we only accept standard Google accounts (@gmail.com) for customer registration.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>4. Product Specifications & Pricing</h3>
                <p className="mt-1">
                  We strive to present all products, categories, dimensions, and specifications (such as foil thickness, length, and width) as accurately as possible. Prices are subject to change without notice and include GST unless stated otherwise.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>5. Ordering & Payment</h3>
                <p className="mt-1">
                  All orders are subject to availability. You can pay via credit card, UPI, net banking, or Cash on Delivery (COD) where eligible. We reserve the right to cancel or refuse any order for reasons including stock limitations or suspect transactional fraud.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>6. Limitation of Liability</h3>
                <p className="mt-1">
                  Durga Shakti Foils shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our products or services.
                </p>
              </div>

              <div>
                <h3 className={`font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-950'}`}>7. Updates to Terms</h3>
                <p className="mt-1">
                  We may modify these Terms and Conditions at any time. Your continued use of the platform following updates signifies your acceptance of the revised terms.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-[#26322B] bg-[#0C1310]' : 'border-slate-100 bg-slate-50'}`}>
              <Button
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  setShowTermsModal(false);
                }}
                className="rounded-lg bg-primary hover:bg-[#005a14] text-white font-bold px-5"
                data-testid="terms-modal-accept"
              >
                Accept Terms
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTermsModal(false)}
                className={`rounded-lg font-bold border transition-colors ${isDark ? 'border-[#26322B] bg-[#131B17] text-slate-300 hover:bg-white/5' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
