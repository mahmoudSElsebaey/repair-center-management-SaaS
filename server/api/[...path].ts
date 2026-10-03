import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/index.js';

/**
 * Vercel serverless entry point.
 *
 * Mongoose connections are pooled across warm invocations: the promise is
 * cached so a burst of concurrent requests triggers exactly one connect().
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('[vercel] MongoDB connection failed:', error);
    res.status(503).json({
      success: false,
      message: 'The service is temporarily unavailable. Please try again shortly.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  app(req, res);
}
