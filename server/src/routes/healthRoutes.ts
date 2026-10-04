/**
 * Phase 14 — Liveness + readiness probes for orchestrators / Vercel / load balancers.
 *
 * GET /api/v1/health  — process is up (no dependency checks)
 * GET /api/v1/ready   — process can serve traffic (Mongo ping when HEALTH_DEEP_CHECK)
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  if (!env.HEALTH_DEEP_CHECK) {
    return res.status(200).json({ success: true, status: 'ready' });
  }

  try {
    const state = mongoose.connection.readyState;
    // 1 = connected
    if (state !== 1) {
      return res.status(503).json({
        success: false,
        status: 'not_ready',
        mongo: state,
      });
    }

    // Lightweight ping
    await mongoose.connection.db?.admin().ping();

    return res.status(200).json({
      success: true,
      status: 'ready',
      mongo: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'not_ready',
      error: 'database_unreachable',
    });
  }
});

export default router;
