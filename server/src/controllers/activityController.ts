import type { Response } from 'express';
import { z } from 'zod';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { objectId } from '../validators/authValidators.js';
import type { AuthRequest } from '../middleware/auth.js';
import { buildPagination, parsePagination } from '../utils/pagination.js';

/** The audit trail is append-only: there is no create, update or delete here. */

const listQuerySchema = z.object({
  category: z
    .enum(['auth', 'staff', 'customer', 'device', 'repair', 'inventory', 'finance', 'appointment'])
    .optional(),
  actor: objectId.optional(),
  search: z.string().trim().max(120).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

/**
 * GET /api/v1/activity
 * Branch-scoped, newest first. Super admins see everything unless they filter.
 */
export const listActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const query = listQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);

  const filter: Record<string, unknown> = {};

  if (user.role !== 'super_admin') {
    if (!user.branch) throw AppError.forbidden('Your account is not linked to a branch');
    filter.branch = user.branch;
  }

  if (query.category) filter.category = query.category;
  if (query.actor) filter.actor = query.actor;

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
      ...(query.dateTo ? { $lte: query.dateTo } : {}),
    };
  }

  // Search spans the denormalised actor name and the human-readable label, which
  // is what an operator would actually type.
  if (query.search) {
    const term = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ actorName: term }, { entityLabel: term }, { messageKey: term }];
  }

  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items.map((entry) => ({
      id: entry._id.toString(),
      action: entry.action,
      category: entry.category,
      messageKey: entry.messageKey,
      messageParams: entry.messageParams,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      entityType: entry.entityType,
      entityLabel: entry.entityLabel,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    })),
    meta: buildPagination(page, limit, total),
  });
});
