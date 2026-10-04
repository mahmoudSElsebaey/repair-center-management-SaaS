import mongoose from 'mongoose';
import type { Response } from 'express';
import { Quotation } from '../models/Quotation.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { nextSequence } from '../models/Counter.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifyRoles, recordActivity } from '../services/events.js';
import { TERMINAL_STATUSES, assertTransitionAllowed } from '../domain/repairWorkflow.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveScope } from './customerController.js';
import {
  decideQuotationSchema,
  upsertQuotationSchema,
  type UpsertQuotationInput,
} from '../validators/quotationValidators.js';
import type { UserRole } from '../types/domain.js';

const EDIT_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'technician', 'receptionist'];
const DECIDE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'receptionist'];

function formatQuotationCode(sequence: number, year = new Date().getFullYear()): string {
  return `QT-${year}-${String(sequence).padStart(5, '0')}`;
}

async function allocateQuotationCode(): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await nextSequence(`quotation_${year}`);
  return formatQuotationCode(sequence, year);
}

function totalsFromLines(lines: UpsertQuotationInput['lines'], tax = 0) {
  const normalised = lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    return {
      type: line.type,
      description: line.description.trim(),
      quantity,
      unitPrice,
      inventoryItem: line.inventoryItem
        ? new mongoose.Types.ObjectId(line.inventoryItem)
        : undefined,
      lineTotal,
    };
  });
  const subtotal = Math.round(normalised.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;
  const taxAmount = Math.round(Number(tax || 0) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { lines: normalised, subtotal, tax: taxAmount, total };
}

async function loadTicketForQuotation(req: AuthRequest, repairId: string) {
  if (!mongoose.isValidObjectId(repairId)) {
    throw AppError.badRequest('Invalid repair ticket id', 'INVALID_IDENTIFIER');
  }
  const scope = resolveScope(req.user);
  const ticket = await RepairTicket.findOne({ _id: repairId, ...scope });
  if (!ticket) {
    throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');
  }
  return ticket;
}

function assertCanEdit(role: UserRole) {
  if (!EDIT_ROLES.includes(role)) {
    throw AppError.forbidden('Your role cannot edit quotations', 'FORBIDDEN');
  }
}

function assertCanDecide(role: UserRole) {
  if (!DECIDE_ROLES.includes(role)) {
    throw AppError.forbidden('Your role cannot record customer decisions', 'FORBIDDEN');
  }
}

export const getQuotation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticket = await loadTicketForQuotation(req, req.params.id);
  const quotation = await Quotation.findOne({ repairTicket: ticket._id });
  res.status(200).json({
    success: true,
    data: {
      quotation: quotation ? quotation.toPublicJSON() : null,
      ticket: {
        id: ticket._id.toString(),
        code: ticket.code,
        status: ticket.status,
        estimatedCost: ticket.estimatedCost,
        customerApproved: ticket.customerApproved,
      },
    },
  });
});

export const upsertQuotation = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanEdit(req.user!.role);
  const input = upsertQuotationSchema.parse(req.body);
  const ticket = await loadTicketForQuotation(req, req.params.id);

  if (TERMINAL_STATUSES.includes(ticket.status)) {
    throw AppError.conflict('This ticket is closed; its quotation cannot be edited', 'TICKET_CLOSED');
  }

  let quotation = await Quotation.findOne({ repairTicket: ticket._id });

  if (quotation && (quotation.status === 'approved' || quotation.status === 'rejected')) {
    throw AppError.conflict(
      'A decided quotation cannot be rewritten. Open a new repair if the scope changed.',
      'QUOTATION_LOCKED'
    );
  }

  const { lines, subtotal, tax, total } = totalsFromLines(input.lines, input.tax ?? 0);
  const isCreate = !quotation;

  if (quotation) {
    quotation.lines = lines;
    quotation.subtotal = subtotal;
    quotation.tax = tax;
    quotation.total = total;
    quotation.notes = input.notes ?? undefined;
    quotation.validUntil = input.validUntil ?? undefined;
    if (quotation.status === 'sent') {
      quotation.status = 'draft';
      quotation.sentAt = undefined;
    }
    await quotation.save();
  } else {
    quotation = await Quotation.create({
      code: await allocateQuotationCode(),
      repairTicket: ticket._id,
      branch: ticket.branch,
      customer: ticket.customer,
      lines,
      subtotal,
      tax,
      total,
      status: 'draft',
      notes: input.notes ?? undefined,
      validUntil: input.validUntil ?? undefined,
      createdBy: req.user!._id,
    });
  }

  ticket.estimatedCost = total;
  await ticket.save();

  void recordActivity({
    action: isCreate ? 'quotation.created' : 'quotation.updated',
    messageKey: isCreate ? 'activity.quotation.created' : 'activity.quotation.updated',
    messageParams: { code: quotation.code, ticket: ticket.code, total: String(total) },
    actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
    branch: ticket.branch,
    entityType: 'Quotation',
    entityId: quotation._id,
    entityLabel: quotation.code,
    metadata: { ticketCode: ticket.code, total, lines: lines.length },
  });

  res.status(isCreate ? 201 : 200).json({
    success: true,
    message: 'Quotation saved',
    data: { quotation: quotation.toPublicJSON() },
  });
});

export const sendQuotation = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanEdit(req.user!.role);
  const ticket = await loadTicketForQuotation(req, req.params.id);
  const quotation = await Quotation.findOne({ repairTicket: ticket._id });

  if (!quotation) {
    throw AppError.notFound('Build a quotation before sending it', 'QUOTATION_NOT_FOUND');
  }
  if (quotation.status === 'approved' || quotation.status === 'rejected') {
    throw AppError.conflict('This quotation has already been decided', 'QUOTATION_LOCKED');
  }
  if (quotation.lines.length < 1) {
    throw AppError.badRequest('Add at least one line before sending', 'QUOTATION_EMPTY');
  }
  if (!ticket.diagnosis?.trim()) {
    throw AppError.badRequest(
      'Record a diagnosis before sending the quotation',
      'DIAGNOSIS_REQUIRED'
    );
  }

  const now = new Date();
  quotation.status = 'sent';
  quotation.sentAt = now;
  await quotation.save();

  ticket.estimatedCost = quotation.total;

  if (ticket.status === 'diagnosing' || ticket.status === 'received') {
    const from = ticket.status;
    if (from === 'received') {
      throw AppError.conflict(
        'Start diagnosis before sending a quotation',
        'STATUS_NOT_READY'
      );
    }
    assertTransitionAllowed(
      {
        status: ticket.status,
        diagnosis: ticket.diagnosis,
        estimatedCost: ticket.estimatedCost,
        finalCost: ticket.finalCost,
        technician: ticket.technician ? String(ticket.technician) : null,
        customerApproved: ticket.customerApproved,
      },
      'waiting_customer',
      req.user!.role
    );
    ticket.status = 'waiting_customer';
    ticket.statusHistory.push({
      from,
      to: 'waiting_customer',
      at: now,
      by: req.user!._id,
      byName: req.user!.name,
      byRole: req.user!.role,
      note: `Quotation ${quotation.code} sent`,
    });
  }

  await ticket.save();

  void recordActivity({
    action: 'quotation.sent',
    messageKey: 'activity.quotation.sent',
    messageParams: { code: quotation.code, ticket: ticket.code, total: String(quotation.total) },
    actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
    branch: ticket.branch,
    entityType: 'Quotation',
    entityId: quotation._id,
    entityLabel: quotation.code,
    metadata: { ticketCode: ticket.code, total: quotation.total },
  });

  void notifyRoles(
    ['receptionist', 'manager', 'admin', 'super_admin'],
    {
      type: 'approval_requested',
      severity: 'warning',
      titleKey: 'repairNotifications.approvalRequested.title',
      bodyKey: 'repairNotifications.approvalRequested.body',
      params: { code: ticket.code, device: ticket.code },
      entityType: 'repair',
      entityId: ticket._id,
      link: `/app/repairs/${ticket._id.toString()}`,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Quotation sent for customer approval',
    data: {
      quotation: quotation.toPublicJSON(),
      ticketStatus: ticket.status,
    },
  });
});

export const decideQuotation = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanDecide(req.user!.role);
  const input = decideQuotationSchema.parse(req.body);
  const ticket = await loadTicketForQuotation(req, req.params.id);
  const quotation = await Quotation.findOne({ repairTicket: ticket._id });

  if (!quotation) {
    throw AppError.notFound('No quotation exists for this ticket', 'QUOTATION_NOT_FOUND');
  }
  if (quotation.status === 'approved' || quotation.status === 'rejected') {
    throw AppError.conflict('This quotation has already been decided', 'QUOTATION_LOCKED');
  }
  if (quotation.status !== 'sent' && ticket.status !== 'waiting_customer') {
    throw AppError.conflict(
      'Send the quotation before recording a customer decision',
      'QUOTATION_NOT_SENT'
    );
  }

  const now = new Date();
  const from = ticket.status;

  if (input.approved) {
    quotation.status = 'approved';
    quotation.decidedAt = now;
    quotation.decidedBy = req.user!._id;
    quotation.rejectionReason = undefined;
    await quotation.save();

    ticket.customerApproved = true;
    ticket.customerApprovedAt = now;
    ticket.customerRejectionReason = undefined;
    ticket.estimatedCost = quotation.total;

    if (ticket.status === 'waiting_customer') {
      assertTransitionAllowed(
        {
          status: ticket.status,
          diagnosis: ticket.diagnosis,
          estimatedCost: ticket.estimatedCost,
          finalCost: ticket.finalCost,
          technician: ticket.technician ? String(ticket.technician) : null,
          customerApproved: true,
        },
        'approved',
        req.user!.role
      );
    } else if (ticket.status === 'approved') {
      // already there
    } else if (!['diagnosing', 'waiting_customer'].includes(ticket.status)) {
      throw AppError.conflict(
        'Customer decisions are recorded while the ticket is awaiting approval',
        'STATUS_NOT_READY'
      );
    }

    ticket.status = 'approved';
    ticket.statusHistory.push({
      from,
      to: 'approved',
      at: now,
      by: req.user!._id,
      byName: req.user!.name,
      byRole: req.user!.role,
      note: input.note?.trim() || `Customer approved quotation ${quotation.code}`,
    });
    await ticket.save();

    void recordActivity({
      action: 'quotation.approved',
      messageKey: 'activity.quotation.approved',
      messageParams: { code: quotation.code, ticket: ticket.code },
      actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
      branch: ticket.branch,
      entityType: 'Quotation',
      entityId: quotation._id,
      entityLabel: quotation.code,
      metadata: { ticketCode: ticket.code, total: quotation.total },
    });
  } else {
    quotation.status = 'rejected';
    quotation.decidedAt = now;
    quotation.decidedBy = req.user!._id;
    quotation.rejectionReason = input.rejectionReason!.trim();
    await quotation.save();

    ticket.customerApproved = false;
    ticket.customerApprovedAt = now;
    ticket.customerRejectionReason = input.rejectionReason!.trim();
    ticket.status = 'cancelled';
    ticket.statusHistory.push({
      from,
      to: 'cancelled',
      at: now,
      by: req.user!._id,
      byName: req.user!.name,
      byRole: req.user!.role,
      note: input.rejectionReason!.trim(),
    });
    await ticket.save();

    void recordActivity({
      action: 'quotation.rejected',
      messageKey: 'activity.quotation.rejected',
      messageParams: { code: quotation.code, ticket: ticket.code },
      actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
      branch: ticket.branch,
      entityType: 'Quotation',
      entityId: quotation._id,
      entityLabel: quotation.code,
      metadata: {
        ticketCode: ticket.code,
        reason: input.rejectionReason,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: input.approved ? 'Quotation approved' : 'Quotation rejected — ticket cancelled',
    data: {
      quotation: quotation.toPublicJSON(),
      ticketStatus: ticket.status,
      customerApproved: ticket.customerApproved,
    },
  });
});
