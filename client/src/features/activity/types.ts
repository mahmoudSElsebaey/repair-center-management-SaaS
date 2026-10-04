/** Audit-trail vocabulary, mirrored from `server/src/models/ActivityLog.ts`. */

export const ACTIVITY_CATEGORIES = [
  'auth',
  'staff',
  'customer',
  'device',
  'repair',
  'inventory',
  'finance',
  'appointment',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface ActivityEntry {
  id: string;
  action: string;
  category: ActivityCategory;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  actorName?: string;
  actorRole?: string;
  entityType?: string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityQuery {
  page?: number;
  limit?: number;
  category?: ActivityCategory;
  actor?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
