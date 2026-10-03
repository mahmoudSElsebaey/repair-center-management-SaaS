import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const MIN_SECRET_LENGTH = 32;

/** Placeholder fragments that must never survive into production. */
const WEAK_SECRET_MARKERS = [
  'change_me',
  'changeme',
  'dev_access',
  'dev_refresh',
  'your_super_secure',
  'secret',
  'password',
  'placeholder',
];

function fail(message: string): never {
  console.error(`[config] FATAL: ${message}`);
  process.exit(1);
}

/**
 * Resolves a JWT secret. In production a missing, short or placeholder secret is
 * a hard failure — RepairFlow refuses to boot with forgeable tokens.
 */
function resolveSecret(name: string, value: string | undefined, devFallback: string): string {
  const raw = (value || '').trim();

  if (!isProduction) return raw || devFallback;

  if (!raw || raw.length < MIN_SECRET_LENGTH) {
    fail(`${name} must be set in production and be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (WEAK_SECRET_MARKERS.some((marker) => raw.toLowerCase().includes(marker))) {
    fail(`${name} looks like a placeholder value — refusing to start in production.`);
  }
  return raw;
}

/** Accepts a single origin or a comma-separated list, for preview deployments. */
function parseClientOrigins(raw: string | undefined): string | string[] {
  const value = (raw || 'http://localhost:5173').trim();
  if (value.includes(',')) {
    return value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return value;
}

if (isProduction && !process.env.MONGODB_URI) {
  fail('MONGODB_URI is required in production.');
}

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/repairflow';

if (isProduction && /localhost|127\.0\.0\.1/.test(mongodbUri)) {
  fail('MONGODB_URI points at localhost — set a MongoDB Atlas connection string in production.');
}

const cloudinary = {
  cloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  apiKey: (process.env.CLOUDINARY_API_KEY || '').trim(),
  apiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  folder: (process.env.CLOUDINARY_FOLDER || 'repairflow').trim(),
};

/** Uploads degrade gracefully in development, but are mandatory in production. */
export const isCloudinaryConfigured = Boolean(
  cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret
);

if (isProduction && !isCloudinaryConfigured) {
  fail(
    'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are all required in production.'
  );
}

export const config = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  clientUrl: parseClientOrigins(process.env.CLIENT_URL),
  mongodbUri,
  isCloudinaryConfigured,
  cloudinary,
  jwt: {
    accessSecret: resolveSecret(
      'JWT_ACCESS_SECRET',
      process.env.JWT_ACCESS_SECRET,
      'dev_access_secret_change_me_min_32_chars_flow'
    ),
    refreshSecret: resolveSecret(
      'JWT_REFRESH_SECRET',
      process.env.JWT_REFRESH_SECRET,
      'dev_refresh_secret_change_me_min_32_chars_flow'
    ),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  apiVersion: process.env.API_VERSION || '0.1.0',
} as const;

if (isProduction && !isCloudinaryConfigured) {
  console.warn('[config] Cloudinary is not configured — upload endpoints will reject requests.');
}
