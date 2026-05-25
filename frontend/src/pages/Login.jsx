import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

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

    if (email && !email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Only @gmail.com email addresses are permitted on this platform.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await login(email, password);
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
        await register(email, password, fullName, phone);
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
    <div className="min-h-screen flex items-center justify-center py-12 px-6" data-testid="login-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border/50 rounded-sm p-8 shadow-float">
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
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    data-testid="register-fullname-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput
                    id="phone"
                    international
                    defaultCountry="IN"
                    value={phone}
                    onChange={setPhone}
                    data-testid="register-phone-input"
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all outline-none"
                    numberInputProps={{
                      className: "w-full focus:outline-none focus:ring-0 border-none bg-transparent pl-2 text-sm font-medium",
                      placeholder: "Enter phone number"
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete={isLogin ? "email" : "new-email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
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
              className="w-full h-12 rounded-sm font-semibold flex items-center justify-center gap-3 border-border hover:bg-slate-50 transition-colors mt-2"
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
    </div>
  );
};

export default Login;