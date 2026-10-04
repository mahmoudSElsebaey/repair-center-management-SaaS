/**
 * Arabic copy. Assembled from locale parts.
 * Keys stay in lockstep with en.ts — verified by scripts/check-i18n-parity.ts.
 */
import p_core from './parts/ar_core.ts';
import p_landing from './parts/ar_landing.ts';
import p_g0 from './parts/ar_g0.ts';
import p_g1 from './parts/ar_g1.ts';
import p_g2 from './parts/ar_g2.ts';
import p_g3 from './parts/ar_g3.ts';
import p_quotations from './parts/ar_quotations.ts';
import p_invoices from './parts/ar_invoices.ts';
import p_track from './parts/ar_track.ts';
import p_appointments from './parts/ar_appointments.ts';

const ar = {
  ...p_core,
  ...p_landing,
  ...p_g0,
  ...p_g1,
  ...p_g2,
  ...p_g3,
  ...p_quotations,
  ...p_invoices,
  ...p_track,
  ...p_appointments,
} as const;

export default ar;
