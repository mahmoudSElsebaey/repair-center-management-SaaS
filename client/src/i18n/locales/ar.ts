/**
 * Arabic copy. Assembled from locale parts.
 */
import p_core from './parts/ar_core';
import p_landing from './parts/ar_landing';
import p_g0 from './parts/ar_g0';
import p_g1 from './parts/ar_g1';
import p_g2 from './parts/ar_g2';
import p_g3 from './parts/ar_g3';

const ar = {
  ...p_core,
  ...p_landing,
  ...p_g0,
  ...p_g1,
  ...p_g2,
  ...p_g3,
} as const;

export default ar;
