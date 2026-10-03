import { BRANCHES, STAFF } from './data/staff.js';
import { CUSTOMERS } from './data/customers.js';

/**
 * Development credentials.
 *
 * Every seeded account shares one documented password so a reviewer can sign in
 * as any role and see how permissions shape the interface. These accounts exist
 * in development and demo databases only — never in a real production tenant.
 */
export const SEED_PASSWORD = process.env.SEED_PASSWORD || 'RepairFlow@2026';

export const seedManifest = {
  password: SEED_PASSWORD,
  branches: BRANCHES,
  staff: STAFF,
  customers: CUSTOMERS,
};

export { BRANCHES, STAFF, CUSTOMERS };
