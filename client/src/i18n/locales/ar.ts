/**
 * Arabic copy. Assembled from locale parts.
 * Deep-merge nested namespaces so later parts extend earlier ones.
 */
import p_core from './parts/ar_core';
import p_landing from './parts/ar_landing';
import p_g0 from './parts/ar_g0';
import p_g1 from './parts/ar_g1';
import p_g2 from './parts/ar_g2';
import p_g3 from './parts/ar_g3';
import p_quotations from './parts/ar_quotations';
import p_invoices from './parts/ar_invoices';
import p_track from './parts/ar_track';
import p_appointments from './parts/ar_appointments';
import p_reports from './parts/ar_reports';
import p_settings from './parts/ar_settings';
import p_a11y from './parts/ar_a11y';
import p_notifications_extra from './parts/ar_notifications_extra';
import p_public from './parts/ar_public';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (isPlainObject(tv) && isPlainObject(sv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

const parts = [
  p_core,
  p_landing,
  p_g0,
  p_g1,
  p_g2,
  p_g3,
  p_quotations,
  p_invoices,
  p_track,
  p_appointments,
  p_reports,
  p_settings,
  p_a11y,
  p_notifications_extra,
  p_public,
] as Record<string, unknown>[];

const ar = parts.reduce<Record<string, unknown>>((acc, part) => deepMerge(acc, part), {});

export default ar;
