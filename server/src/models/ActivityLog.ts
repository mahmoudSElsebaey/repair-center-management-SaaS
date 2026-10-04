import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Audit trail of meaningful business actions.
 *
 * Every entry answers four questions: who did it, what did they do, to which
 * record, and when. Entries are append-only — nothing in the application
 * updates or deletes an ActivityLog row.
 */

export const ACTIVITY_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.password_changed',
  'user.created',
  'user.updated',
  'user.deactivated',
  'user.activated',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'device.created',
  'device.updated',
  'device.deleted',
  'repair.created',
  'repair.updated',
  'repair.status_changed',
  'repair.assigned',
  'repair.delivered',
  'inventory.created',
  'inventory.updated',
  'inventory.consumed',
  'inventory.low_stock',
  'invoice.created',
  'payment.recorded',
  'appointment.created',
  'appointment.updated',
  'branch.created',
  'branch.updated',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Coarse grouping so the feed can be filtered and tinted without a lookup table. */
export type ActivityCategory = 'auth' | 'staff' | 'customer' | 'device' | 'repair' | 'inventory' | 'finance' | 'appointment';

export const ACTION_CATEGORY: Record<ActivityAction, ActivityCategory> = {
  'auth.login': 'auth',
  'auth.logout': 'auth',
  'auth.password_changed': 'auth',
  'user.created': 'staff',
  'user.updated': 'staff',
  'user.deactivated': 'staff',
  'user.activated': 'staff',
  'customer.created': 'customer',
  'customer.updated': 'customer',
  'customer.deleted': 'customer',
  'device.created': 'device',
  'device.updated': 'device',
  'device.deleted': 'device',
  'repair.created': 'repair',
  'repair.updated': 'repair',
  'repair.status_changed': 'repair',
  'repair.assigned': 'repair',
  'repair.delivered': 'repair',
  'inventory.created': 'inventory',
  'inventory.updated': 'inventory',
  'inventory.consumed': 'inventory',
  'inventory.low_stock': 'inventory',
  'invoice.created': 'finance',
  'payment.recorded': 'finance',
  'appointment.created': 'appointment',
  'appointment.updated': 'appointment',
  'branch.created': 'staff',
  'branch.updated': 'staff',
};

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  action: ActivityAction;
  category: ActivityCategory;
  /** Short, already-localisable summary key plus interpolation data. */
  messageKey: string;
  messageParams?: Record<string, string | number>;
  /** Denormalised actor name so the feed survives a user being removed. */
  actor?: Types.ObjectId;
  actorName?: string;
  actorRole?: string;
  branch?: Types.ObjectId;
  /** Loose reference to the affected record. */
  entityType?: string;
  entityId?: Types.ObjectId;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    action: {
      type: String,
      enum: { values: [...ACTIVITY_ACTIONS], message: 'Unknown activity action: {VALUE}' },
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['auth', 'staff', 'customer', 'device', 'repair', 'inventory', 'finance', 'appointment'],
      required: true,
      index: true,
    },
    messageKey: { type: String, required: true, trim: true },
    messageParams: { type: Schema.Types.Mixed },
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    entityType: { type: String, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    entityLabel: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// The feed is always "newest first", optionally narrowed by branch or actor.
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ branch: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
