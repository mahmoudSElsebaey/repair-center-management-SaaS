import express from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import cors from 'cors';
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
import inventoryRoutes from './routes/inventoryRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

/**
 * helmet@8 ships dual CJS/ESM; under NodeNext the default import type is not
 * always callable. Resolve at runtime and cast for TypeScript.
 */
import helmetImport from 'helmet';
type HelmetFactory = (options?: Record<string, unknown>) => RequestHandler;
const helmet = (
  typeof helmetImport === 'function'
    ? helmetImport
    : (helmetImport as unknown as { default: HelmetFactory }).default
) as HelmetFactory;

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
    message: 'Fixer API',
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
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/track`, trackRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
