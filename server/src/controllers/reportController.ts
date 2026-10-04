import mongoose from 'mongoose';
import type { Response } from 'express';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { AppNotification } from '../models/AppNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { REPAIR_STATUSES, USER_ROLES, type RepairStatus, type UserRole } from '../types/domain.js';

/* -------------------------------------------------------------------------- */
/* Capability detection                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Section availability.
 *
 * The dashboard is built in Phase 02, but most of its richest figures are
 * aggregates over customers, devices and repair tickets — data that does not
 * exist until Phases 03 and 04. Rather than invent placeholder numbers or leave
 * a "coming soon" panel, each section reports whether it is `available`, and the
 * client renders exactly what is real.
 *
 * This means the dashboard becomes richer on its own as later phases land, with
 * no rewrite and no fabricated data in the meantime.
 */
async function sectionAvailability() {
  const db = mongoose.connection.db;
  if (!db) return { customers: false, devices: false, repairs: false, inventory: false, invoices: false };

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  return {
    customers: existing.has('customers'),
    devices: existing.has('devices'),
    repairs: existing.has('repairtickets'),
    inventory: existing.has('inventoryitems'),
    invoices: existing.has('invoices'),
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregations that are real today                                            */
/* -------------------------------------------------------------------------- */

/** Headcount by role, padded with zeroes so the chart never has gaps. */
async function staffByRole(branchFilter: Record<string, unknown>) {
  const rows = await User.aggregate<{ _id: UserRole; count: number }>([
    { $match: branchFilter },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  const counts = new Map(rows.map((row) => [row._id, row.count]));

  return USER_ROLES.map((role) => ({ role, count: counts.get(role) ?? 0 }));
}

/** Headcount per branch, for the branch comparison chart. */
async function staffByBranch(branchFilter: Record<string, unknown>) {
  return User.aggregate<{ branchId: mongoose.Types.ObjectId | null; name: string; code: string; count: number }>([
    { $match: branchFilter },
    {
      $group: {
        _id: '$branch',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'branches',
        localField: '_id',
        foreignField: '_id',
        as: 'branch',
      },
    },
    { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        branchId: '$_id',
        name: { $ifNull: ['$branch.name', null] },
        code: { $ifNull: ['$branch.code', null] },
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);
}

/**
 * Audit entries per day for the last `days` days.
 *
 * Days with no activity are filled with zero in JavaScript rather than in the
 * aggregation: a `$range`-based date scaffold is harder to read and does not
 * behave consistently across MongoDB versions, and fourteen elements is nothing
 * to fill in memory.
 */
async function activitySeries(days: number, branchFilter: Record<string, unknown>) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await ActivityLog.aggregate<{ _id: string; count: number }>([
    { $match: { ...branchFilter, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const series: Array<{ date: string; count: number }> = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + offset);
    const key = day.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return series;
}

/** Most frequent audit actions, for the "what is the team doing" panel. */
async function topActions(branchFilter: Record<string, unknown>, limit = 6) {
  return ActivityLog.aggregate<{ action: string; category: string; count: number }>([
    { $match: branchFilter },
    { $group: { _id: { action: '$action', category: '$category' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        action: '$_id.action',
        category: '$_id.category',
        count: 1,
      },
    },
  ]);
}

/* -------------------------------------------------------------------------- */
/* Controller                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/reports/dashboard
 *
 * Branch-scoped: a super admin sees the whole organisation, everyone else sees
 * only their own branch. Scoping happens in the query, never by filtering the
 * response in the browser.
 */
export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const requestedBranch = typeof req.query.branch === 'string' ? req.query.branch : undefined;

  // A super admin may ask for any branch; other roles are pinned to their own.
  const isGlobal = user.role === 'super_admin';
  const scopeBranch = isGlobal ? requestedBranch : user.branch?.toString();

  const branchFilter: Record<string, unknown> = scopeBranch
    ? { branch: new mongoose.Types.ObjectId(scopeBranch) }
    : {};

  const [availability, roleBreakdown, branchBreakdown, activity, actions, branchCounts, unread] =
    await Promise.all([
      sectionAvailability(),
      staffByRole(branchFilter),
      staffByBranch(branchFilter),
      activitySeries(14, branchFilter),
      topActions(branchFilter),
      Branch.aggregate<{ total: number; active: number }>([
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      ]),
      AppNotification.countDocuments({ recipient: user._id, readAt: null }),
    ]);

  const staff = roleBreakdown.reduce((sum, row) => sum + row.count, 0);
  const totalStaffAllBranches = await User.countDocuments({});

  const recentActivity = await ActivityLog.find(branchFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .select('action category messageKey messageParams actorName actorRole entityType entityLabel createdAt');

  /**
   * Repair metrics. These are `null` until Phase 04 creates the collection, and
   * the client shows the real figures as soon as they exist.
   */
  let repairMetrics: Record<string, number> | null = null;
  if (availability.repairs) {
    const rows = await mongoose.connection
      .db!.collection('repairtickets')
      .aggregate<{ _id: RepairStatus; count: number }>([
        { $match: branchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();

    const counts = new Map(rows.map((row) => [row._id, row.count]));
    repairMetrics = {};
    for (const status of REPAIR_STATUSES) {
      repairMetrics[status] = counts.get(status) ?? 0;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      scope: {
        branchId: scopeBranch ?? null,
        isGlobal,
      },
      sections: availability,
      metrics: {
        staff,
        staffAllBranches: totalStaffAllBranches,
        branches: branchCounts[0]?.total ?? 0,
        activeBranches: branchCounts[0]?.active ?? 0,
        unreadNotifications: unread,
        /** null until Phase 03 creates the customers collection. */
        customers: availability.customers
          ? await mongoose.connection.db!.collection('customers').countDocuments(branchFilter)
          : null,
        devices: availability.devices
          ? await mongoose.connection.db!.collection('devices').countDocuments(branchFilter)
          : null,
        repairs: repairMetrics,
      },
      charts: {
        staffByRole: roleBreakdown,
        staffByBranch: branchBreakdown,
        activityOverTime: activity,
        topActions: actions,
      },
      recentActivity: recentActivity.map((entry) => ({
        id: entry._id.toString(),
        action: entry.action,
        category: entry.category,
        messageKey: entry.messageKey,
        messageParams: entry.messageParams,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        entityType: entry.entityType,
        entityLabel: entry.entityLabel,
        createdAt: entry.createdAt,
      })),
    },
  });
});
