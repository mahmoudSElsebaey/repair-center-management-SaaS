import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Per-user notification.
 *
 * Notifications are addressed to a person rather than broadcast, so read state
 * is meaningful and a user only sees what concerns them. The same business event
 * may generate several rows — one per recipient.
 */

export const NOTIFICATION_TYPES = [
  'repair_assigned',
  'repair_status_changed',
  'approval_requested',
  'approval_received',
  'parts_needed',
  'low_stock',
  'invoice_issued',
  'payment_received',
  'appointment_reminder',
  'system',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_SEVERITIES = ['info', 'success', 'warning', 'critical'] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export interface IAppNotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  severity: NotificationSeverity;
  /** i18n key plus its interpolation data — never a pre-rendered sentence. */
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  /** Where clicking the notification should take the user. */
  link?: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const appNotificationSchema = new Schema<IAppNotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: { values: [...NOTIFICATION_TYPES], message: 'Unknown notification type: {VALUE}' },
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: [...NOTIFICATION_SEVERITIES],
      default: 'info',
    },
    titleKey: { type: String, required: true, trim: true },
    bodyKey: { type: String, trim: true },
    params: { type: Schema.Types.Mixed },
    link: { type: String, trim: true },
    entityType: { type: String, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The bell queries unread first, always newest-first, for one recipient.
appNotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

/** Shape sent to the client. `read` is derived rather than stored twice. */
export function toNotificationJSON(doc: IAppNotification) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    severity: doc.severity,
    titleKey: doc.titleKey,
    bodyKey: doc.bodyKey,
    params: doc.params,
    link: doc.link,
    entityType: doc.entityType,
    entityId: doc.entityId ? doc.entityId.toString() : null,
    read: Boolean(doc.readAt),
    readAt: doc.readAt,
    createdAt: doc.createdAt,
  };
}

export type NotificationJSON = ReturnType<typeof toNotificationJSON>;

export const AppNotification = mongoose.model<IAppNotification>(
  'AppNotification',
  appNotificationSchema
);
