/**
 * English copy. Assembled from locale parts.
 * Keys stay in lockstep with ar.ts — verified by scripts/check-i18n-parity.ts.
 */
import p_core from './parts/en_core.ts';
import p_landing from './parts/en_landing.ts';
import p_g0 from './parts/en_g0.ts';
import p_g1 from './parts/en_g1.ts';
import p_g2 from './parts/en_g2.ts';
import p_g3 from './parts/en_g3.ts';
import p_quotations from './parts/en_quotations.ts';
import p_invoices from './parts/en_invoices.ts';
import p_track from './parts/en_track.ts';

const en = {
  ...p_core,
  ...p_landing,
  ...p_g0,
  ...p_g1,
  ...p_g2,
  ...p_g3,
  ...p_quotations,
  ...p_invoices,
  ...p_track,
} as const;

export default en;
