/**
 * Phase 14 — Ensure critical MongoDB indexes exist at boot.
 *
 * Call `ensureIndexes()` once after mongoose.connect in server bootstrap.
 * Idempotent — createIndex is a no-op when the index already exists.
 *
 * Adjust collection/field names to match actual models if they differ.
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

type IndexSpec = {
  collection: string;
  keys: Record<string, 1 | -1 | 'text'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    name?: string;
    expireAfterSeconds?: number;
  };
};

/** Production-critical indexes for RepairFlow domain models. */
export const CRITICAL_INDEXES: IndexSpec[] = [
  // Auth / users
  { collection: 'users', keys: { email: 1 }, options: { unique: true, name: 'users_email_unique' } },
  { collection: 'users', keys: { branch: 1, role: 1 }, options: { name: 'users_branch_role' } },

  // Customers & devices
  { collection: 'customers', keys: { branch: 1, phone: 1 }, options: { name: 'customers_branch_phone' } },
  { collection: 'customers', keys: { branch: 1, name: 'text' }, options: { name: 'customers_text' } },
  { collection: 'devices', keys: { customer: 1 }, options: { name: 'devices_customer' } },
  { collection: 'devices', keys: { branch: 1, serialNumber: 1 }, options: { sparse: true, name: 'devices_serial' } },

  // Repairs
  { collection: 'repairs', keys: { code: 1 }, options: { unique: true, name: 'repairs_code_unique' } },
  { collection: 'repairs', keys: { branch: 1, status: 1, createdAt: -1 }, options: { name: 'repairs_branch_status_date' } },
  { collection: 'repairs', keys: { technician: 1, status: 1 }, options: { name: 'repairs_technician_status' } },
  { collection: 'repairs', keys: { customer: 1 }, options: { name: 'repairs_customer' } },

  // Inventory
  { collection: 'inventoryitems', keys: { branch: 1, sku: 1 }, options: { unique: true, name: 'inventory_branch_sku' } },
  { collection: 'stockmovements', keys: { item: 1, createdAt: -1 }, options: { name: 'stock_item_date' } },

  // Quotations / invoices / payments
  { collection: 'quotations', keys: { repair: 1 }, options: { unique: true, sparse: true, name: 'quotations_repair' } },
  { collection: 'invoices', keys: { code: 1 }, options: { unique: true, name: 'invoices_code_unique' } },
  { collection: 'invoices', keys: { branch: 1, status: 1, issuedAt: -1 }, options: { name: 'invoices_branch_status_date' } },
  { collection: 'payments', keys: { invoice: 1, createdAt: -1 }, options: { name: 'payments_invoice_date' } },

  // Appointments
  { collection: 'appointments', keys: { technician: 1, startAt: 1, endAt: 1 }, options: { name: 'appointments_tech_range' } },
  { collection: 'appointments', keys: { branch: 1, startAt: 1 }, options: { name: 'appointments_branch_start' } },

  // Activity & notifications
  { collection: 'activitylogs', keys: { createdAt: -1 }, options: { name: 'activity_created' } },
  { collection: 'activitylogs', keys: { branch: 1, category: 1, createdAt: -1 }, options: { name: 'activity_branch_cat_date' } },
  { collection: 'notifications', keys: { user: 1, read: 1, createdAt: -1 }, options: { name: 'notifications_user_read' } },

  // Counters (ticket / invoice codes)
  { collection: 'counters', keys: { key: 1 }, options: { unique: true, name: 'counters_key' } },
];

export async function ensureIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    logger.warn('ensureIndexes skipped — no database connection');
    return;
  }

  let created = 0;
  let existing = 0;

  for (const spec of CRITICAL_INDEXES) {
    try {
      const coll = db.collection(spec.collection);
      await coll.createIndex(spec.keys as Record<string, number | 'text'>, {
        background: true,
        ...spec.options,
      });
      created += 1;
    } catch (err) {
      // Index already exists with different options, or collection missing in fresh DB
      existing += 1;
      logger.debug(
        { collection: spec.collection, name: spec.options?.name, err },
        'Index ensure note'
      );
    }
  }

  logger.info(
    { attempted: CRITICAL_INDEXES.length, ok: created, notes: existing },
    'MongoDB indexes ensured'
  );
}
