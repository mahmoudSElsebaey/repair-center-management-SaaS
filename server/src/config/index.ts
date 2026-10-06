import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';
const isVercel = Boolean(process.env.VERCEL);

const MIN_SECRET_LENGTH = 32;

const WEAK_SECRET_MARKERS = [
  'change_me',
  'changeme',
  'dev_access_secret',
  'dev_refresh_secret',
  'your_super_secure',
  'placeholder',
  'replace_me',
];

/** On Vercel throw (caught by api handler). Locally exit. */
function fail(message: string): never {
  console.error(`[config] FATAL: ${message}`);
  if (isVercel) {
    throw new Error(`[config] ${message}`);
  }
  process.exit(1);
}

function resolveSecret(name: string, value: string | undefined, devFallback: string): string {
  const raw = (value || '').trim();

  if (!isProduction) return raw || devFallback;

  if (!raw || raw.length < MIN_SECRET_LENGTH) {
    fail(`${name} must be set in production and be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (WEAK_SECRET_MARKERS.some((marker) => raw.toLowerCase().includes(marker))) {
    fail(`${name} looks like a placeholder value — set a real random secret.`);
  }
  return raw;
}

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

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixer';

if (isProduction && /localhost|127\.0\.0\.1/.test(mongodbUri)) {
  fail('MONGODB_URI points at localhost — set a MongoDB Atlas connection string.');
}

const cloudinary = {
  cloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  apiKey: (process.env.CLOUDINARY_API_KEY || '').trim(),
  apiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  folder: (process.env.CLOUDINARY_FOLDER || 'fixer').trim(),
};

export const isCloudinaryConfigured = Boolean(
  cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret
);

if (isProduction && !isCloudinaryConfigured) {
  console.warn('[config] Cloudinary not configured — uploads will be unavailable.');
}

export const config = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  clientUrl: parseClientOrigins(process.env.CLIENT_URL || process.env.CLIENT_ORIGIN),
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
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  apiVersion: process.env.API_VERSION || '0.1.0',
} as const;
