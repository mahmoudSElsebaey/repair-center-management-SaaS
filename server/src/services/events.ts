import type { Types } from 'mongoose';
import { ActivityLog, ACTION_CATEGORY, type ActivityAction } from '../models/ActivityLog.js';
import {
  AppNotification,
  type NotificationSeverity,
  type NotificationType,
} from '../models/AppNotification.js';
import { User } from '../models/User.js';
import type { UserRole } from '../types/domain.js';

/**
 * Event recording.
 *
 * Two side effects accompany meaningful business actions: an entry in the audit
 * trail, and one notification per interested user. Both are fire-and-forget by
 * design — a failure to record an event must never fail the business action that
 * produced it, so callers do not await these and errors are logged, not thrown.
 *
 * Later phases call these helpers; Phase 02 establishes the pattern and uses it
 * for the events that already exist (sign-in, profile and password changes,
 * seeding).
 */

export interface ActivityActor {
  id: Types.ObjectId | string;
  name?: string;
  role?: UserRole | string;
  branch?: Types.ObjectId | string | null;
}

export interface RecordActivityInput {
  action: ActivityAction;
  /** i18n key, e.g. `activity.auth.login` — never a pre-rendered sentence. */
  messageKey: string;
  messageParams?: Record<string, string | number>;
  actor?: ActivityActor;
  branch?: Types.ObjectId | string | null;
  entityType?: string;
  entityId?: Types.ObjectId | string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Appends an audit entry. Never throws: auditing is important, but not so
 * important that it should break a repair being booked.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await ActivityLog.create({
      action: input.action,
      category: ACTION_CATEGORY[input.action],
      messageKey: input.messageKey,
      messageParams: input.messageParams,
      actor: input.actor?.id,
      actorName: input.actor?.name,
      actorRole: input.actor?.role ? String(input.actor.role) : undefined,
      branch: input.branch ?? input.actor?.branch ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error('[activity] failed to record', input.action, error);
  }
}

export interface NotifyInput {
  recipients: Array<Types.ObjectId | string>;
  type: NotificationType;
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  severity?: NotificationSeverity;
  link?: string;
  entityType?: string;
  entityId?: Types.ObjectId | string;
}

/** Creates one notification row per recipient. Never throws. */
export async function notify(input: NotifyInput): Promise<void> {
  const recipients = input.recipients.filter(Boolean);
  if (recipients.length === 0) return;

  try {
    await AppNotification.insertMany(
      recipients.map((recipient) => ({
        recipient,
        type: input.type,
        severity: input.severity ?? 'info',
        titleKey: input.titleKey,
        bodyKey: input.bodyKey,
        params: input.params,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
      })),
      { ordered: false }
    );
  } catch (error) {
    console.error('[notify] failed to create notifications', input.type, error);
  }
}

/**
 * Notifies every active holder of the given roles.
 *
 * Resolving recipients here rather than at each call site keeps "who cares about
 * this event" in one place.
 */
export async function notifyRoles(
  roles: UserRole[],
  input: Omit<NotifyInput, 'recipients'> & {
    exclude?: Array<Types.ObjectId | string>;
    /** When set, only users in this branch (plus super_admins) are notified. */
    branch?: Types.ObjectId | string | null;
  }
): Promise<void> {
  try {
    const excluded = new Set((input.exclude ?? []).map(String));

    const filter: Record<string, unknown> = { role: { $in: roles }, isActive: true };
    if (input.branch) {
      // Super admins are org-wide and still receive branch-scoped operational alerts.
      filter.$or = [
        { branch: input.branch },
        { role: 'super_admin' },
        { branch: { $exists: false } },
        { branch: null },
      ];
    }

    const users = await User.find(filter).select('_id');
    const recipients = users
      .map((user) => user._id)
      .filter((id) => !excluded.has(id.toString()));

    await notify({ ...input, recipients });
  } catch (error) {
    console.error('[notify] failed to resolve role recipients', input.type, error);
  }
}
