import type { ActivityAction } from '../../models/ActivityLog.js';
import type { NotificationSeverity, NotificationType } from '../../models/AppNotification.js';

/**
 * Demo activity and notification data.
 *
 * The audit trail is only convincing if it looks like a workshop that has been
 * running for a fortnight, so entries are spread across the last 14 days with
 * realistic working hours and a believable mix of actions.
 */

export interface ActivitySeedEntry {
  /** How many days ago this happened. */
  daysAgo: number;
  hour: number;
  minute: number;
  action: ActivityAction;
  messageKey: string;
  messageParams: Record<string, string | number>;
  /** Email of the employee who performed it. */
  actorEmail: string;
  entityType?: string;
  entityLabel?: string;
}

export const ACTIVITY_SEED: ActivitySeedEntry[] = [
  {
    daysAgo: 0,
    hour: 9,
    minute: 12,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Ahmed Gamal Sherif' },
    actorEmail: 'ahmed.sherif@repairflow.app',
  },
  {
    daysAgo: 0,
    hour: 9,
    minute: 26,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Youssef Hany Ragab' },
    actorEmail: 'youssef.ragab@repairflow.app',
  },
  {
    daysAgo: 0,
    hour: 10,
    minute: 4,
    action: 'user.updated',
    messageKey: 'activity.user.updated',
    messageParams: { name: 'Doaa Mostafa Kamel', fields: 'phone' },
    actorEmail: 'nourhan.abdelaziz@repairflow.app',
    entityType: 'User',
    entityLabel: 'Doaa Mostafa Kamel',
  },
  {
    daysAgo: 0,
    hour: 11,
    minute: 38,
    action: 'user.created',
    messageKey: 'activity.user.created',
    messageParams: { name: 'Tarek Samir Abdallah', role: 'technician' },
    actorEmail: 'mahmoud.elsebaey@repairflow.app',
    entityType: 'User',
    entityLabel: 'Tarek Samir Abdallah',
  },
  {
    daysAgo: 0,
    hour: 13,
    minute: 2,
    action: 'auth.password_changed',
    messageKey: 'activity.auth.passwordChanged',
    messageParams: { name: 'Mostafa Adel Shaker' },
    actorEmail: 'mostafa.shaker@repairflow.app',
  },
  {
    daysAgo: 1,
    hour: 9,
    minute: 45,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Karim Fathy Mansour' },
    actorEmail: 'karim.mansour@repairflow.app',
  },
  {
    daysAgo: 1,
    hour: 12,
    minute: 18,
    action: 'user.updated',
    messageKey: 'activity.user.updated',
    messageParams: { name: 'Hana Walid Farouk', fields: 'locale, phone' },
    actorEmail: 'karim.mansour@repairflow.app',
    entityType: 'User',
    entityLabel: 'Hana Walid Farouk',
  },
  {
    daysAgo: 1,
    hour: 16,
    minute: 30,
    action: 'auth.logout',
    messageKey: 'activity.auth.logout',
    messageParams: { name: 'Menna Hossam Eldin' },
    actorEmail: 'menna.hossam@repairflow.app',
  },
  {
    daysAgo: 2,
    hour: 10,
    minute: 7,
    action: 'branch.updated',
    messageKey: 'activity.branch.updated',
    messageParams: { name: 'Smouha Service Point' },
    actorEmail: 'mahmoud.elsebaey@repairflow.app',
    entityType: 'Branch',
    entityLabel: 'Smouha Service Point',
  },
  {
    daysAgo: 2,
    hour: 14,
    minute: 52,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Salma Ibrahim Zaki' },
    actorEmail: 'salma.zaki@repairflow.app',
  },
  {
    daysAgo: 3,
    hour: 9,
    minute: 30,
    action: 'user.created',
    messageKey: 'activity.user.created',
    messageParams: { name: 'Menna Hossam Eldin', role: 'receptionist' },
    actorEmail: 'nourhan.abdelaziz@repairflow.app',
    entityType: 'User',
    entityLabel: 'Menna Hossam Eldin',
  },
  {
    daysAgo: 4,
    hour: 11,
    minute: 15,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Nourhan Abdelaziz' },
    actorEmail: 'nourhan.abdelaziz@repairflow.app',
  },
  {
    daysAgo: 5,
    hour: 15,
    minute: 40,
    action: 'auth.logout',
    messageKey: 'activity.auth.logout',
    messageParams: { name: 'Ahmed Gamal Sherif' },
    actorEmail: 'ahmed.sherif@repairflow.app',
  },
  {
    daysAgo: 6,
    hour: 10,
    minute: 25,
    action: 'user.updated',
    messageKey: 'activity.user.updated',
    messageParams: { name: 'Youssef Hany Ragab', fields: 'role' },
    actorEmail: 'mahmoud.elsebaey@repairflow.app',
    entityType: 'User',
    entityLabel: 'Youssef Hany Ragab',
  },
  {
    daysAgo: 8,
    hour: 9,
    minute: 5,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Doaa Mostafa Kamel' },
    actorEmail: 'doaa.kamel@repairflow.app',
  },
  {
    daysAgo: 10,
    hour: 13,
    minute: 48,
    action: 'branch.updated',
    messageKey: 'activity.branch.updated',
    messageParams: { name: 'Nasr City Flagship Workshop' },
    actorEmail: 'mahmoud.elsebaey@repairflow.app',
    entityType: 'Branch',
    entityLabel: 'Nasr City Flagship Workshop',
  },
  {
    daysAgo: 12,
    hour: 11,
    minute: 2,
    action: 'auth.login',
    messageKey: 'activity.auth.login',
    messageParams: { name: 'Karim Fathy Mansour' },
    actorEmail: 'karim.mansour@repairflow.app',
  },
  {
    daysAgo: 13,
    hour: 16,
    minute: 20,
    action: 'user.deactivated',
    messageKey: 'activity.user.deactivated',
    messageParams: { name: 'Former contractor' },
    actorEmail: 'mahmoud.elsebaey@repairflow.app',
    entityType: 'User',
    entityLabel: 'Former contractor',
  },
];

export interface NotificationSeedEntry {
  recipientEmail: string;
  type: NotificationType;
  severity: NotificationSeverity;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
  link?: string;
  daysAgo: number;
  hour: number;
  read: boolean;
}

export const NOTIFICATION_SEED: NotificationSeedEntry[] = [
  {
    recipientEmail: 'karim.mansour@repairflow.app',
    type: 'system',
    severity: 'info',
    titleKey: 'notifications.seed.welcome.title',
    bodyKey: 'notifications.seed.welcome.body',
    params: { branch: 'Nasr City Flagship Workshop' },
    link: '/app',
    daysAgo: 0,
    hour: 9,
    read: false,
  },
  {
    recipientEmail: 'karim.mansour@repairflow.app',
    type: 'system',
    severity: 'success',
    titleKey: 'notifications.seed.staffAdded.title',
    bodyKey: 'notifications.seed.staffAdded.body',
    params: { name: 'Tarek Samir Abdallah' },
    link: '/app/staff',
    daysAgo: 0,
    hour: 11,
    read: false,
  },
  {
    recipientEmail: 'karim.mansour@repairflow.app',
    type: 'low_stock',
    severity: 'warning',
    titleKey: 'notifications.seed.lowStock.title',
    bodyKey: 'notifications.seed.lowStock.body',
    params: { count: 3 },
    link: '/app/inventory',
    daysAgo: 1,
    hour: 14,
    read: false,
  },
  {
    recipientEmail: 'karim.mansour@repairflow.app',
    type: 'system',
    severity: 'info',
    titleKey: 'notifications.seed.phaseNotice.title',
    bodyKey: 'notifications.seed.phaseNotice.body',
    daysAgo: 2,
    hour: 10,
    read: true,
  },
  {
    recipientEmail: 'mahmoud.elsebaey@repairflow.app',
    type: 'system',
    severity: 'info',
    titleKey: 'notifications.seed.ownerDigest.title',
    bodyKey: 'notifications.seed.ownerDigest.body',
    params: { branches: 2, staff: 11 },
    link: '/app',
    daysAgo: 0,
    hour: 8,
    read: false,
  },
  {
    recipientEmail: 'youssef.ragab@repairflow.app',
    type: 'system',
    severity: 'info',
    titleKey: 'notifications.seed.technicianReady.title',
    bodyKey: 'notifications.seed.technicianReady.body',
    daysAgo: 0,
    hour: 9,
    read: false,
  },
  {
    recipientEmail: 'doaa.kamel@repairflow.app',
    type: 'low_stock',
    severity: 'warning',
    titleKey: 'notifications.seed.lowStock.title',
    bodyKey: 'notifications.seed.lowStock.body',
    params: { count: 3 },
    link: '/app/inventory',
    daysAgo: 1,
    hour: 14,
    read: false,
  },
  {
    recipientEmail: 'ahmed.sherif@repairflow.app',
    type: 'system',
    severity: 'info',
    titleKey: 'notifications.seed.frontDesk.title',
    bodyKey: 'notifications.seed.frontDesk.body',
    daysAgo: 1,
    hour: 9,
    read: true,
  },
];
