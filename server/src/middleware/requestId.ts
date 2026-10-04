/**
 * Phase 14 — Assign / propagate X-Request-Id for correlation across logs.
 */

import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length < 128
      ? incoming
      : randomUUID();

  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
};
