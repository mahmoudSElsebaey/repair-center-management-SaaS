/**
 * Phase 14 — Example server bootstrap wiring (merge into existing src/index.ts / app.ts).
 *
 * Order matters:
 * 1. load env (side-effect import)
 * 2. create app
 * 3. security + request id + body parsers + rate limits
 * 4. routes
 * 5. notFound + errorHandler
 * 6. connect Mongo → ensureIndexes → listen
 */

import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { env, isProd } from './config/env.js';
import { ensureIndexes } from './config/indexes.js';
import { applySecurity } from './middleware/security.js';
import { requestId } from './middleware/requestId.js';
import { globalLimiter, authLimiter, publicLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/healthRoutes.js';

// Existing route mounts (keep as in project)
// import authRoutes from './routes/authRoutes.js';
// import trackRoutes from './routes/trackRoutes.js';
// ...

async function main() {
  const app = express();

  applySecurity(app);
  app.use(requestId);

  if (env.ENABLE_REQUEST_LOGGING) {
    app.use(
      morgan(isProd ? 'combined' : 'dev', {
        skip: (req) => req.path === '/api/v1/health' || req.path === '/api/v1/ready',
      })
    );
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use('/api/v1', globalLimiter);
  app.use('/api/v1', healthRoutes);

  // Stricter limits on auth
  // app.use('/api/v1/auth/login', authLimiter);
  // app.use('/api/v1/auth/refresh', authLimiter);

  // Public track (Phase 09)
  // app.use('/api/v1/track', publicLimiter, trackRoutes);

  // ... remaining protected routes ...

  app.use(notFoundHandler);
  app.use(errorHandler);

  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
  await ensureIndexes();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'RepairFlow API listening');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
