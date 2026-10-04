import type { Response } from 'express';
import { RepairTicket } from '../models/RepairTicket.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseTicketCode } from '../utils/codes.js';
import type { AuthRequest } from '../middleware/auth.js';
import { TERMINAL_STATUSES } from '../domain/repairWorkflow.js';

/**
 * Public customer tracking — intentionally limited fields.
 *
 * The code is the only credential. Anything a competitor or scraper should not
 * see (costs, diagnosis notes, customer phone/email, technician identity) stays
 * off this payload.
 */
export const getPublicTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
  const raw = String(req.params.code ?? '').trim().toUpperCase();
  if (!raw) {
    throw AppError.badRequest('Ticket code is required', 'TRACK_CODE_REQUIRED');
  }

  const parsed = parseTicketCode(raw);
  const code = parsed
    ? `RF-${parsed.year}-${String(parsed.sequence).padStart(5, '0')}`
    : raw;

  const ticket = await RepairTicket.findOne({ code })
    .populate('device', 'brand modelName deviceType color')
    .populate('branch', 'name code city phone')
    .populate('customer', 'name preferredLanguage');

  if (!ticket) {
    throw AppError.notFound('No repair found for this code', 'TRACK_NOT_FOUND');
  }

  const deviceDoc = ticket.device as unknown as {
    brand?: string;
    modelName?: string;
    deviceType?: string;
    color?: string;
  } | null;

  const branchDoc = ticket.branch as unknown as {
    name?: string;
    code?: string;
    city?: string;
    phone?: string;
  } | null;

  const customerDoc = ticket.customer as unknown as {
    name?: string;
    preferredLanguage?: string;
  } | null;

  const history = (ticket.statusHistory ?? []).map((entry) => ({
    to: entry.to,
    at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
  }));

  if (history.length === 0) {
    history.push({
      to: ticket.status,
      at: ticket.createdAt.toISOString(),
    });
  }

  res.status(200).json({
    success: true,
    data: {
      code: ticket.code,
      status: ticket.status,
      isOpen: !TERMINAL_STATUSES.includes(ticket.status),
      issue: ticket.issue,
      expectedCompletionAt: ticket.expectedCompletionAt
        ? ticket.expectedCompletionAt.toISOString()
        : null,
      completedAt: ticket.completedAt ? ticket.completedAt.toISOString() : null,
      deliveredAt: ticket.deliveredAt ? ticket.deliveredAt.toISOString() : null,
      warrantyDays: ticket.warrantyDays ?? null,
      updatedAt: ticket.updatedAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      statusHistory: history,
      device: deviceDoc
        ? {
            brand: deviceDoc.brand ?? null,
            modelName: deviceDoc.modelName ?? null,
            deviceType: deviceDoc.deviceType ?? null,
            color: deviceDoc.color ?? null,
          }
        : null,
      branch: branchDoc
        ? {
            name: branchDoc.name ?? null,
            city: branchDoc.city ?? null,
            phone: branchDoc.phone ?? null,
          }
        : null,
      customer: customerDoc
        ? {
            name: customerDoc.name ?? null,
            preferredLanguage: customerDoc.preferredLanguage ?? null,
          }
        : null,
    },
  });
});
