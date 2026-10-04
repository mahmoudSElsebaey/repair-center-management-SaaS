/**
 * English copy. Assembled from locale parts.
 */
import p_core from './parts/en_core';
import p_landing from './parts/en_landing';
import p_g0 from './parts/en_g0';
import p_g1 from './parts/en_g1';
import p_g2 from './parts/en_g2';
import p_g3 from './parts/en_g3';

const en = {
  ...p_core,
  ...p_landing,
  ...p_g0,
  ...p_g1,
  ...p_g2,
  ...p_g3,
} as const;

export default en;
