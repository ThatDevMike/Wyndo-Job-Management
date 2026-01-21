/**
 * Configuration management
 * Loads environment variables and provides typed config
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

interface Config {
  env: 'development' | 'staging' | 'production';
  port: number;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  encryption: {
    key: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    publishableKey: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
  };
  email: {
    provider: 'sendgrid' | 'ses';
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  sms: {
    provider: 'twilio';
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  storage: {
    provider: 's3' | 'r2';
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
  };
  allowedOrigins: string[];
  appUrl: string;
  subscription: {
    freeTierLimits: {
      maxCustomers: number;
      maxJobsPerMonth: number;
      maxStorageGB: number;
      offlineDaysLimit: number;
    };
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    console.warn(`Warning: Environment variable ${key} is not set`);
    return '';
  }
  return value;
}

export const config: Config = {
  env: (process.env.NODE_ENV as Config['env']) || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: getEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/wyndo'),
  },
  redis: {
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
  },
  jwt: {
    secret: getEnv('JWT_SECRET', 'development-secret-change-in-production'),
    accessTokenExpiry: getEnv('JWT_ACCESS_EXPIRY', '15m'),
    refreshTokenExpiry: getEnv('JWT_REFRESH_EXPIRY', '7d'),
  },
  encryption: {
    key: getEnv('ENCRYPTION_KEY', 'development-key-32-characters-!!'),
  },
  stripe: {
    secretKey: getEnv('STRIPE_SECRET_KEY', ''),
    webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', ''),
    publishableKey: getEnv('STRIPE_PUBLISHABLE_KEY', ''),
  },
  paypal: {
    clientId: getEnv('PAYPAL_CLIENT_ID', ''),
    clientSecret: getEnv('PAYPAL_CLIENT_SECRET', ''),
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER as 'sendgrid' | 'ses') || 'sendgrid',
    apiKey: getEnv('EMAIL_API_KEY', ''),
    fromEmail: getEnv('FROM_EMAIL', 'noreply@wyndo.app'),
    fromName: getEnv('FROM_NAME', 'Wyndo'),
  },
  sms: {
    provider: 'twilio',
    accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    fromNumber: getEnv('TWILIO_FROM_NUMBER', ''),
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER as 's3' | 'r2') || 's3',
    accessKeyId: getEnv('STORAGE_ACCESS_KEY_ID', ''),
    secretAccessKey: getEnv('STORAGE_SECRET_ACCESS_KEY', ''),
    bucket: getEnv('STORAGE_BUCKET', 'wyndo-uploads'),
    region: getEnv('STORAGE_REGION', 'us-east-1'),
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  appUrl: getEnv('APP_URL', 'http://localhost:3000'),
  subscription: {
    freeTierLimits: {
      maxCustomers: 30,
      maxJobsPerMonth: 15,
      maxStorageGB: 1,
      offlineDaysLimit: 7,
    },
  },
};
