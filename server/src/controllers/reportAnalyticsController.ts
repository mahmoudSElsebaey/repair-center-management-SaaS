import mongoose from 'mongoose';
import type { Response } from 'express';
import { User } from '../models/User.js';
import { Invoice, INVOICE_STATUSES } from '../models/Invoice.js';
import { Payment, PAYMENT_METHODS } from '../models/Payment.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { ACTIVE_STATUSES } from '../domain/repairWorkflow.js';
import { REPAIR_STATUSES } from '../types/domain.js';

async function sectionAvailability() {
  const db = mongoose.connection.db;
  if (!db) return { repairs: false, invoices: false, payments: false };
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  return {
    repairs: existing.has('repairtickets'),
    invoices: existing.has('invoices'),
    payments: existing.has('payments'),
  };
}

function parseDateRange(query: AuthRequest['query']): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);
  let from = defaultFrom;
  let to = defaultTo;
  if (typeof query.from === 'string' && query.from) {
    const parsed = new Date(query.from);
    if (!Number.isNaN(parsed.getTime())) {
      from = parsed;
      from.setHours(0, 0, 0, 0);
    }
  }
  if (typeof query.to === 'string' && query.to) {
    const parsed = new Date(query.to);
    if (!Number.isNaN(parsed.getTime())) {
      to = parsed;
      to.setHours(23, 59, 59, 999);
    }
  }
  const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxSpanMs) {
    from = new Date(to.getTime() - maxSpanMs);
    from.setHours(0, 0, 0, 0);
  }
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

function fillDailySeries(
  from: Date,
  to: Date,
  rows: Array<{ _id: string; amount?: number; count?: number }>,
  valueKey: 'amount' | 'count'
): Array<{ date: string; value: number }> {
  const map = new Map(
    rows.map((row) => [row._id, valueKey === 'amount' ? (row.amount ?? 0) : (row.count ?? 0)])
  );
  const series: Array<{ date: string; value: number }> = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

function resolveBranchFilter(user: NonNullable<AuthRequest['user']>, requestedBranch?: string) {
  const isGlobal = user.role === 'super_admin';
  const scopeBranch = isGlobal ? requestedBranch : user.branch?.toString();
  const branchFilter: Record<string, unknown> = scopeBranch
    ? { branch: new mongoose.Types.ObjectId(scopeBranch) }
    : {};
  return { branchFilter, scopeBranch, isGlobal };
}

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const requestedBranch = typeof req.query.branch === 'string' ? req.query.branch : undefined;
  const { branchFilter, scopeBranch, isGlobal } = resolveBranchFilter(user, requestedBranch);
  const { from, to } = parseDateRange(req.query);
  const dateRange = { $gte: from, $lte: to };
  const availability = await sectionAvailability();

  let revenueTotal = 0;
  let revenueSeries: Array<{ date: string; value: number }> = [];
  let paymentsByMethod: Array<{ method: string; amount: number; count: number }> = [];
  let paymentCount = 0;

  if (availability.payments) {
    const [dailyRows, methodRows, totals] = await Promise.all([
      Payment.aggregate<{ _id: string; amount: number }>([
        { $match: { ...branchFilter, paidAt: dateRange } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate<{ _id: string; amount: number; count: number }>([
        { $match: { ...branchFilter, paidAt: dateRange } },
        { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate<{ total: number; count: number }>([
        { $match: { ...branchFilter, paidAt: dateRange } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);
    revenueTotal = totals[0]?.total ?? 0;
    paymentCount = totals[0]?.count ?? 0;
    revenueSeries = fillDailySeries(from, to, dailyRows, 'amount');
    const methodMap = new Map(methodRows.map((row) => [row._id, row]));
    paymentsByMethod = PAYMENT_METHODS.map((method) => ({
      method,
      amount: methodMap.get(method)?.amount ?? 0,
      count: methodMap.get(method)?.count ?? 0,
    }));
  }

  let invoiceMetrics: {
    issued: number; paid: number; partiallyPaid: number; voided: number; draft: number;
    totalInvoiced: number; totalOutstanding: number;
  } | null = null;
  let invoicesByStatus: Array<{ status: string; count: number; total: number }> = [];

  if (availability.invoices) {
    const statusRows = await Invoice.aggregate<{ _id: string; count: number; total: number; balance: number }>([
      { $match: { ...branchFilter, $or: [{ issuedAt: dateRange }, { createdAt: dateRange }] } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' }, balance: { $sum: '$balance' } } },
    ]);
    const statusMap = new Map(statusRows.map((row) => [row._id, row]));
    invoicesByStatus = INVOICE_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status)?.count ?? 0,
      total: statusMap.get(status)?.total ?? 0,
    }));
    invoiceMetrics = {
      issued: statusMap.get('issued')?.count ?? 0,
      paid: statusMap.get('paid')?.count ?? 0,
      partiallyPaid: statusMap.get('partially_paid')?.count ?? 0,
      voided: statusMap.get('void')?.count ?? 0,
      draft: statusMap.get('draft')?.count ?? 0,
      totalInvoiced: statusRows.filter((r) => r._id !== 'void' && r._id !== 'draft').reduce((s, r) => s + r.total, 0),
      totalOutstanding: statusRows.filter((r) => r._id === 'issued' || r._id === 'partially_paid').reduce((s, r) => s + r.balance, 0),
    };
  }

  let repairMetrics: { created: number; completed: number; cancelled: number; active: number } | null = null;
  let repairsByStatus: Array<{ status: string; count: number }> = [];
  let repairsCreatedSeries: Array<{ date: string; value: number }> = [];

  if (availability.repairs) {
    const [createdRows, statusRows, completedCount, cancelledCount, activeCount] = await Promise.all([
      RepairTicket.aggregate<{ _id: string; count: number }>([
        { $match: { ...branchFilter, createdAt: dateRange } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      RepairTicket.aggregate<{ _id: string; count: number }>([
        { $match: { ...branchFilter, createdAt: dateRange } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      RepairTicket.countDocuments({ ...branchFilter, status: { $in: ['delivered', 'ready'] }, updatedAt: dateRange }),
      RepairTicket.countDocuments({ ...branchFilter, status: 'cancelled', updatedAt: dateRange }),
      RepairTicket.countDocuments({ ...branchFilter, status: { $in: [...ACTIVE_STATUSES] } }),
    ]);
    const createdTotal = createdRows.reduce((sum, r) => sum + r.count, 0);
    repairsCreatedSeries = fillDailySeries(from, to, createdRows, 'count');
    const statusMap = new Map(statusRows.map((row) => [row._id, row.count]));
    repairsByStatus = REPAIR_STATUSES.map((status) => ({ status, count: statusMap.get(status) ?? 0 }));
    repairMetrics = { created: createdTotal, completed: completedCount, cancelled: cancelledCount, active: activeCount };
  }

  let technicianPerformance: Array<{ userId: string; name: string; completed: number; active: number; cancelled: number }> = [];

  if (availability.repairs) {
    const rows = await User.aggregate<{ userId: mongoose.Types.ObjectId; name: string; completed: number; active: number; cancelled: number }>([
      { $match: { role: 'technician', isActive: true, ...branchFilter } },
      {
        $lookup: {
          from: 'repairtickets',
          let: { technicianId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$technician', '$$technicianId'] } } },
            {
              $group: {
                _id: null,
                completed: {
                  $sum: {
                    $cond: [
                      { $and: [{ $in: ['$status', ['delivered', 'ready']] }, { $gte: ['$updatedAt', from] }, { $lte: ['$updatedAt', to] }] },
                      1, 0,
                    ],
                  },
                },
                active: { $sum: { $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0] } },
                cancelled: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', 'cancelled'] }, { $gte: ['$updatedAt', from] }, { $lte: ['$updatedAt', to] }] },
                      1, 0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'stats',
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$name',
          completed: { $ifNull: [{ $first: '$stats.completed' }, 0] },
          active: { $ifNull: [{ $first: '$stats.active' }, 0] },
          cancelled: { $ifNull: [{ $first: '$stats.cancelled' }, 0] },
        },
      },
      { $sort: { completed: -1, name: 1 } },
    ]);
    technicianPerformance = rows.map((row) => ({
      userId: row.userId.toString(),
      name: row.name,
      completed: row.completed,
      active: row.active,
      cancelled: row.cancelled,
    }));
  }

  res.status(200).json({
    success: true,
    data: {
      scope: { branchId: scopeBranch ?? null, isGlobal },
      range: { from: from.toISOString(), to: to.toISOString() },
      sections: {
        payments: availability.payments,
        invoices: availability.invoices,
        repairs: availability.repairs,
      },
      kpis: {
        revenueTotal,
        paymentCount,
        totalInvoiced: invoiceMetrics?.totalInvoiced ?? null,
        totalOutstanding: invoiceMetrics?.totalOutstanding ?? null,
        repairsCreated: repairMetrics?.created ?? null,
        repairsCompleted: repairMetrics?.completed ?? null,
        repairsActive: repairMetrics?.active ?? null,
        repairsCancelled: repairMetrics?.cancelled ?? null,
      },
      charts: {
        revenueOverTime: revenueSeries,
        paymentsByMethod,
        invoicesByStatus,
        repairsByStatus,
        repairsCreatedOverTime: repairsCreatedSeries,
        technicianPerformance,
      },
      invoiceMetrics,
      repairMetrics,
    },
  });
});
