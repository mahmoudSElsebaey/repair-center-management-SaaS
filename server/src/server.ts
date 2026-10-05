import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/index.js';

/**
 * Local / long-running entry point.
 *
 * Vercel imports `src/app.ts` directly through `api/[...path].ts`, so the
 * listener is only started when this file runs outside a serverless runtime.
 */

let server: ReturnType<typeof app.listen> | undefined;

async function start(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
    });

    console.log(`[db] MongoDB connected → ${mongoose.connection.name}`);

    server = app.listen(config.port, () => {
      console.log(
        `[api] Fixer v${config.apiVersion} listening on http://localhost:${config.port}/api/v1  (${config.nodeEnv})`
      );
    });
  } catch (error) {
    console.error('[api] Failed to start:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[api] ${signal} received — shutting down`);
  server?.close(() => {
    void mongoose.connection.close(false).then(() => process.exit(0));
  });
  // Do not hang forever on lingering keep-alive sockets.
  setTimeout(() => process.exit(0), 8_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[api] Unhandled rejection:', reason);
});

// Vercel and other serverless runtimes own the HTTP server lifecycle.
if (!process.env.VERCEL) {
  void start();
}

export { app };
