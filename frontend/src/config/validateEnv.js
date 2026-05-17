/**
 * Validates required environment variables at startup.
 * Fails loud in development, warns in production.
 */
const REQUIRED_ENV = {
  REACT_APP_BACKEND_URL: {
    required: true,
    description: 'Backend API base URL (e.g., http://localhost:8001)',
  },
};

const OPTIONAL_ENV = {
  REACT_APP_RAZORPAY_KEY_ID: {
    description: 'Razorpay key ID for payment integration',
    fallback: 'rzp_test_SlmLztmM54CPAn',
  },
};

export const validateEnv = () => {
  const errors = [];
  const warnings = [];

  Object.entries(REQUIRED_ENV).forEach(([key, config]) => {
    const value = process.env[key];
    if (!value && config.required) {
      errors.push(`Missing required env: ${key} — ${config.description}`);
    }
  });

  Object.entries(OPTIONAL_ENV).forEach(([key, config]) => {
    const value = process.env[key];
    if (!value) {
      warnings.push(`Optional env not set: ${key} — using fallback: ${config.fallback}`);
    }
  });

  if (warnings.length > 0) {
    console.warn('[ENV] Warnings:', warnings.join('\n'));
  }

  if (errors.length > 0) {
    const message = `[ENV] Configuration errors:\n${errors.join('\n')}`;
    if (process.env.NODE_ENV === 'development') {
      console.error(message);
      // Don't crash in dev, but make it very visible
    } else {
      console.error(message);
    }
  }

  return { errors, warnings };
};

export default validateEnv;
