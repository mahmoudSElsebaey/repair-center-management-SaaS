/** Notification vocabulary, mirrored from `server/src/models/AppNotification.ts`. */

export const NOTIFICATION_SEVERITIES = ['info', 'success', 'warning', 'critical'] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export interface AppNotification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  /** i18n key — the server never sends a pre-rendered sentence. */
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  link?: string;
  entityType?: string;
  entityId?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: AppNotification[];
  unread: number;
}
