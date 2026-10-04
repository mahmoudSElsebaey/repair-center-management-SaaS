import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

export const API_PREFIX = '/api/v1';

const app: Application = express();

/**
 * Vercel terminates TLS in front of the function, so the real client IP arrives
 * in X-Forwarded-For. Rate limiting needs to trust exactly one proxy hop.
 */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // The upload/Serve endpoints are consumed by a separate Vercel origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.isProduction ? undefined : false,
  })
);

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    maxAge: 86400,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

/** Liveness + dependency probe. Used by deployment checks and the QA pass. */
app.get(`${API_PREFIX}/health`, (_req: Request, res: Response) => {
  const MONGO_STATES: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  const mongoState = MONGO_STATES[mongoose.connection.readyState] ?? 'unknown';

  res.status(mongoState === 'connected' ? 200 : 503).json({
    success: mongoState === 'connected',
    message: 'RepairFlow API',
    data: {
      version: config.apiVersion,
      environment: config.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      database: mongoState,
      cloudinary: config.isCloudinaryConfigured ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use(API_PREFIX, apiLimiter);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/activity`, activityRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/devices`, deviceRoutes);
app.use(`${API_PREFIX}/repairs`, repairRoutes);
app.use(`${API_PREFIX}/staff`, staffRoutes);

// Later phases mount: /inventory /invoices /payments
// /appointments /track

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
