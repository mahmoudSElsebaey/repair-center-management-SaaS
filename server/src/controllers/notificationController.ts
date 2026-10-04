import type { Response } from 'express';
import { z } from 'zod';
import { AppNotification, toNotificationJSON } from '../models/AppNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { buildPagination, parsePagination } from '../utils/pagination.js';
import { objectId } from '../validators/authValidators.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Notifications are strictly per-recipient.
 *
 * Every query filters on the authenticated user's id, so one staff member can
 * never read or mark another's notifications, regardless of role.
 */

const listQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  type: z.string().trim().max(60).optional(),
});

/** GET /api/v1/notifications */
export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const query = listQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query, 25);

  const filter: Record<string, unknown> = { recipient: user._id };
  if (query.unreadOnly) filter.readAt = null;
  if (query.type) filter.type = query.type;

  const [items, total, unread] = await Promise.all([
    AppNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AppNotification.countDocuments(filter),
    AppNotification.countDocuments({ recipient: user._id, readAt: null }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: items.map(toNotificationJSON),
      unread,
    },
    meta: buildPagination(page, limit, total),
  });
});

/**
 * GET /api/v1/notifications/summary
 * Cheap endpoint for the topbar badge — no payload beyond the counts.
 */
export const getNotificationSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  const [unread, total] = await Promise.all([
    AppNotification.countDocuments({ recipient: user._id, readAt: null }),
    AppNotification.countDocuments({ recipient: user._id }),
  ]);

  res.status(200).json({
    success: true,
    data: { unread, total },
  });
});

/** PATCH /api/v1/notifications/:id/read */
export const markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);

  // The recipient check is part of the query, not a separate branch: a wrong id
  // and someone else's notification are indistinguishable to the caller.
  const updated = await AppNotification.findOneAndUpdate(
    { _id: id, recipient: user._id },
    { $set: { readAt: new Date() } },
    { new: true }
  );

  if (!updated) throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: { notification: toNotificationJSON(updated) },
  });
});

/** PATCH /api/v1/notifications/read-all */
export const markAllNotificationsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  const result = await AppNotification.updateMany(
    { recipient: user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: { updated: result.modifiedCount },
  });
});

/** DELETE /api/v1/notifications/:id */
export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);

  const deleted = await AppNotification.findOneAndDelete({ _id: id, recipient: user._id });
  if (!deleted) throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');

  res.status(200).json({ success: true, message: 'Notification removed' });
});
