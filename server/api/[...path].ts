import type { Request, Response } from 'express';

/**
 * Vercel serverless entry.
 * Dynamic imports so config failures return JSON instead of FUNCTION_INVOCATION_FAILED.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const mongoose = (await import('mongoose')).default;
    const { config } = await import('../src/config/index.js');
    const app = (await import('../src/app.js')).default;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
      });
    }

    app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[vercel] boot/handler failed:', message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        code: 'BOOT_FAILED',
        message,
        hint: 'Check Vercel env: NODE_ENV, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_URL',
      });
    }
  }
}
