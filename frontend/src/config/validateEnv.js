/**
 * Validates required environment variables at startup.
 * Fails loud in development, warns in production.
 */
const REQUIRED_ENV = {
  REACT_APP_BACKEND_URL: {
    required: true,
    description: 'Backend API base URL (e.g., http://localhost:8080)',
  },
};

const OPTIONAL_ENV = {};

export const validateEnv = () => {
  const errors = [];
  const warnings = [];

  Object.entries(REQUIRED_ENV).forEach(([key, config]) => {
    const value = process.env[key];
    if (!value && config.required) {
      errors.push(`Missing required env: ${key} - ${config.description}`);
    }
  });

  Object.entries(OPTIONAL_ENV).forEach(([key]) => {
    const value = process.env[key];
    if (!value) {
      warnings.push(`Optional env not set: ${key} - backend payment order response must provide it.`);
    }
  });

  if (warnings.length > 0) {
    console.warn('[ENV] Warnings:', warnings.join('\n'));
  }

  if (errors.length > 0) {
    const message = `[ENV] Configuration errors:\n${errors.join('\n')}`;
    console.error(message);
  }

  return { errors, warnings };
};

export default validateEnv;
