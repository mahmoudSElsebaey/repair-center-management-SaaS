import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless entry.
 * Dynamic import so config/boot failures become a JSON 500 instead of
 * FUNCTION_INVOCATION_FAILED with an empty body.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const { default: mongoose } = await import('mongoose');
    const { config } = await import('../src/config/index.js');
    const { default: app } = await import('../src/app.js');

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
      });
    }

    // Express app as request listener
    await new Promise<void>((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app(req as any, res as any, () => resolve());
      // If Express already ended the response, resolve on finish
      res.on?.('finish', () => resolve());
      // Fallback: if headers already sent, we're done
      if (res.headersSent) resolve();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[vercel] boot/handler failed:', message, stack);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        code: 'BOOT_FAILED',
        message,
        hint: 'Check Vercel env vars: NODE_ENV, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_URL',
      });
    }
  }
}
