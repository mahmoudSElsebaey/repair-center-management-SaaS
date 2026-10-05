/**
 * Phase 14 — Structured logger (JSON in production, pretty in development).
 * Zero external dependency beyond console; swap for pino if desired later.
 */

import { env, isProd } from '../config/env.js';

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LEVEL_ORDER: Record<Level, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

const minLevel = LEVEL_ORDER[env.LOG_LEVEL] ?? 30;

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= minLevel;
}

function baseFields() {
  return {
    time: new Date().toISOString(),
    service: 'fixer-api',
    env: env.NODE_ENV,
  };
}

function write(level: Level, obj: Record<string, unknown> | string, msg?: string) {
  if (!shouldLog(level)) return;

  const payload =
    typeof obj === 'string'
      ? { ...baseFields(), level, msg: obj }
      : { ...baseFields(), level, ...obj, ...(msg ? { msg } : {}) };

  // Avoid serialising Error poorly
  if (payload.err instanceof Error) {
    payload.err = {
      name: payload.err.name,
      message: payload.err.message,
      stack: isProd ? undefined : payload.err.stack,
    };
  }

  const line = isProd ? JSON.stringify(payload) : formatPretty(payload);
  if (level === 'error' || level === 'fatal') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function formatPretty(p: Record<string, unknown>): string {
  const { level, time, msg, ...rest } = p;
  const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
  return `[${time}] ${String(level).toUpperCase()} ${msg ?? ''}${extra}`;
}

export const logger = {
  fatal: (obj: Record<string, unknown> | string, msg?: string) => write('fatal', obj, msg),
  error: (obj: Record<string, unknown> | string, msg?: string) => write('error', obj, msg),
  warn: (obj: Record<string, unknown> | string, msg?: string) => write('warn', obj, msg),
  info: (obj: Record<string, unknown> | string, msg?: string) => write('info', obj, msg),
  debug: (obj: Record<string, unknown> | string, msg?: string) => write('debug', obj, msg),
  trace: (obj: Record<string, unknown> | string, msg?: string) => write('trace', obj, msg),
};
