import mongoose from 'mongoose';
import type { Response } from 'express';
import { Invoice, type InvoiceLine } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Quotation } from '../models/Quotation.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { Customer } from '../models/Customer.js';
import { nextSequence } from '../models/Counter.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifyRoles, recordActivity } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveScope } from './customerController.js';
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  listPaymentsQuerySchema,
  recordPaymentSchema,
  type CreateInvoiceInput,
} from '../validators/invoiceValidators.js';
import type { UserRole } from '../types/domain.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'receptionist'];

function assertCanManage(role: UserRole) {
  if (!MANAGE_ROLES.includes(role)) {
    throw AppError.forbidden('Your role cannot manage invoices or payments', 'FORBIDDEN');
  }
}

function formatInvoiceNumber(sequence: number, year = new Date().getFullYear()): string {
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
}

async function allocateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await nextSequence(`invoice_${year}`);
  return formatInvoiceNumber(sequence, year);
}

function totalsFromLines(
  lines: Array<{ type: InvoiceLine['type']; description: string; quantity: number; unitPrice: number }>,
  tax = 0,
  discount = 0
) {
  const normalised: InvoiceLine[] = lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    return {
      type: line.type,
      description: line.description.trim(),
      quantity,
      unitPrice,
      lineTotal,
    };
  });
  const subtotal = Math.round(normalised.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;
  const taxAmount = Math.round(Number(tax || 0) * 100) / 100;
  const discountAmount = Math.round(Number(discount || 0) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);
  return { lines: normalised, subtotal, tax: taxAmount, discount: discountAmount, total };
}

function recomputePaymentStatus(amountPaid: number, total: number): 'issued' | 'partially_paid' | 'paid' {
  if (amountPaid <= 0) return 'issued';
  if (amountPaid + 0.001 >= total) return 'paid';
  return 'partially_paid';
}

async function buildLinesFromRepair(ticket: {
  _id: mongoose.Types.ObjectId;
  code: string;
  finalCost?: number;
  estimatedCost?: number;
  issue?: string;
}) {
  const quotation = await Quotation.findOne({
    repairTicket: ticket._id,
    status: { $in: ['approved', 'sent'] },
  }).sort({ updatedAt: -1 });

  if (quotation && quotation.lines.length > 0) {
    return totalsFromLines(
      quotation.lines.map((l) => ({
        type: l.type as InvoiceLine['type'],
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      quotation.tax ?? 0,
      0
    );
  }

  const amount = ticket.finalCost ?? ticket.estimatedCost ?? 0;
  if (amount <= 0) {
    throw AppError.badRequest(
      'Set a final or estimated cost, or approve a quotation, before invoicing',
      'INVOICE_NO_AMOUNT'
    );
  }

  return totalsFromLines(
    [
      {
        type: 'labor',
        description: `Repair ${ticket.code}${ticket.issue ? ` — ${ticket.issue.slice(0, 120)}` : ''}`,
        quantity: 1,
        unitPrice: amount,
      },
    ],
    0,
    0
  );
}

export const listInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listInvoicesQuerySchema.parse(req.query);
  const scope = resolveScope(req.user);
  const { skip, limit, page } = parsePagination(query);
  const filter: Record<string, unknown> = { ...scope };
  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customer = query.customerId;
  if (query.repairTicketId) filter.repairTicket = query.repairTicketId;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ number: rx }, { repairCode: rx }, { notes: rx }];
  }
  const sort = parseSort(query, ['createdAt', 'number', 'total', 'balance', 'status'], '-createdAt');
  const [rows, total] = await Promise.all([
    Invoice.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(filter),
  ]);
  const invoices = rows.map((doc) => Invoice.hydrate(doc).toPublicJSON());
  res.status(200).json({ success: true, data: invoices, meta: buildPagination(page, limit, total) });
});

export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid invoice id', 'INVALID_IDENTIFIER');
  const scope = resolveScope(req.user);
  const invoice = await Invoice.findOne({ _id: id, ...scope });
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  const payments = await Payment.find({ invoice: invoice._id }).sort({ paidAt: -1 });
  const customer = await Customer.findById(invoice.customer).select('name phone customerCode');
  res.status(200).json({
    success: true,
    data: {
      invoice: invoice.toPublicJSON(),
      payments: payments.map((p) => p.toPublicJSON()),
      customer: customer
        ? { id: customer._id.toString(), name: customer.name, phone: customer.phone, customerCode: customer.customerCode }
        : null,
    },
  });
});

export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const input = createInvoiceSchema.parse(req.body) as CreateInvoiceInput;
  const scope = resolveScope(req.user);
  let customerId: mongoose.Types.ObjectId;
  let branchId: mongoose.Types.ObjectId;
  let repairTicketId: mongoose.Types.ObjectId | undefined;
  let repairCode: string | undefined;
  let totals: ReturnType<typeof totalsFromLines>;

  if (input.repairTicketId) {
    const ticket = await RepairTicket.findOne({ _id: input.repairTicketId, ...scope });
    if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');
    const existing = await Invoice.findOne({
      repairTicket: ticket._id,
      status: { $in: ['draft', 'issued', 'partially_paid', 'paid'] },
    });
    if (existing) throw AppError.conflict(`Invoice ${existing.number} already exists for this repair`, 'INVOICE_EXISTS');
    if (['cancelled', 'received'].includes(ticket.status)) {
      throw AppError.conflict('Cannot invoice a cancelled ticket or one that has not been diagnosed', 'TICKET_NOT_INVOICEABLE');
    }
    totals =
      input.lines && input.lines.length > 0
        ? totalsFromLines(input.lines, input.tax ?? 0, input.discount ?? 0)
        : await buildLinesFromRepair(ticket);
    customerId = ticket.customer as mongoose.Types.ObjectId;
    branchId = ticket.branch as mongoose.Types.ObjectId;
    repairTicketId = ticket._id;
    repairCode = ticket.code;
  } else {
    const customer = await Customer.findOne({ _id: input.customerId, ...scope });
    if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    if (!input.lines || input.lines.length === 0) throw AppError.badRequest('At least one line is required', 'INVOICE_EMPTY');
    totals = totalsFromLines(input.lines, input.tax ?? 0, input.discount ?? 0);
    customerId = customer._id;
    branchId = (customer.branch as mongoose.Types.ObjectId) ?? (req.user!.branch as mongoose.Types.ObjectId);
    if (!branchId) throw AppError.badRequest('Branch is required', 'BRANCH_REQUIRED');
  }

  if (totals.total <= 0) throw AppError.badRequest('Invoice total must be greater than zero', 'INVOICE_ZERO_TOTAL');
  const issueImmediately = input.issueImmediately !== false;
  const now = new Date();
  const invoice = await Invoice.create({
    number: await allocateInvoiceNumber(),
    repairTicket: repairTicketId,
    repairCode,
    customer: customerId,
    branch: branchId,
    lines: totals.lines,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    amountPaid: 0,
    balance: totals.total,
    status: issueImmediately ? 'issued' : 'draft',
    notes: input.notes ?? undefined,
    issuedAt: issueImmediately ? now : undefined,
    createdBy: req.user!._id,
  });

  void recordActivity({
    action: 'invoice.created',
    messageKey: 'activity.invoice.created',
    messageParams: { number: invoice.number },
    actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
    branch: branchId,
    entityType: 'Invoice',
    entityId: invoice._id,
    entityLabel: invoice.number,
    metadata: { total: invoice.total, repairCode },
  });

  if (issueImmediately) {
    void notifyRoles(['receptionist', 'manager', 'admin', 'super_admin'], {
      type: 'invoice_issued',
      severity: 'info',
      titleKey: 'invoiceNotifications.issued.title',
      bodyKey: 'invoiceNotifications.issued.body',
      params: { number: invoice.number, total: String(invoice.total) },
      entityType: 'invoice',
      entityId: invoice._id,
      link: `/app/invoices/${invoice._id.toString()}`,
    });
  }

  res.status(201).json({
    success: true,
    message: issueImmediately ? 'Invoice issued' : 'Invoice draft created',
    data: { invoice: invoice.toPublicJSON() },
  });
});

export const issueInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid invoice id', 'INVALID_IDENTIFIER');
  const scope = resolveScope(req.user);
  const invoice = await Invoice.findOne({ _id: id, ...scope });
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  if (invoice.status !== 'draft') throw AppError.conflict('Only draft invoices can be issued', 'INVOICE_NOT_DRAFT');
  if (invoice.lines.length < 1 || invoice.total <= 0) throw AppError.badRequest('Invoice has no billable lines', 'INVOICE_EMPTY');
  invoice.status = 'issued';
  invoice.issuedAt = new Date();
  await invoice.save();
  void notifyRoles(['receptionist', 'manager', 'admin', 'super_admin'], {
    type: 'invoice_issued',
    severity: 'info',
    titleKey: 'invoiceNotifications.issued.title',
    bodyKey: 'invoiceNotifications.issued.body',
    params: { number: invoice.number, total: String(invoice.total) },
    entityType: 'invoice',
    entityId: invoice._id,
    link: `/app/invoices/${invoice._id.toString()}`,
  });
  res.status(200).json({ success: true, message: 'Invoice issued', data: { invoice: invoice.toPublicJSON() } });
});

export const voidInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid invoice id', 'INVALID_IDENTIFIER');
  const scope = resolveScope(req.user);
  const invoice = await Invoice.findOne({ _id: id, ...scope });
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  if (invoice.status === 'void') throw AppError.conflict('Invoice is already void', 'INVOICE_ALREADY_VOID');
  if (invoice.status === 'paid' || invoice.amountPaid > 0) {
    throw AppError.conflict('Cannot void an invoice that has received payments', 'INVOICE_HAS_PAYMENTS');
  }
  invoice.status = 'void';
  invoice.voidedAt = new Date();
  invoice.balance = 0;
  await invoice.save();
  res.status(200).json({ success: true, message: 'Invoice voided', data: { invoice: invoice.toPublicJSON() } });
});

export const recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('Invalid invoice id', 'INVALID_IDENTIFIER');
  const input = recordPaymentSchema.parse(req.body);
  const scope = resolveScope(req.user);
  const invoice = await Invoice.findOne({ _id: id, ...scope });
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  if (invoice.status === 'void') throw AppError.conflict('Cannot record payment on a void invoice', 'INVOICE_VOID');
  if (invoice.status === 'draft') throw AppError.conflict('Issue the invoice before recording payments', 'INVOICE_NOT_ISSUED');
  if (invoice.status === 'paid' || invoice.balance <= 0) throw AppError.conflict('Invoice is already fully paid', 'INVOICE_PAID');
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (amount > invoice.balance + 0.001) {
    throw AppError.badRequest(`Payment exceeds remaining balance of ${invoice.balance}`, 'PAYMENT_EXCEEDS_BALANCE');
  }
  const payment = await Payment.create({
    invoice: invoice._id,
    invoiceNumber: invoice.number,
    branch: invoice.branch,
    amount,
    method: input.method,
    reference: input.reference ?? undefined,
    notes: input.notes ?? undefined,
    paidAt: input.paidAt ?? new Date(),
    recordedBy: req.user!._id,
    recordedByName: req.user!.name,
  });
  invoice.amountPaid = Math.round((invoice.amountPaid + amount) * 100) / 100;
  invoice.balance = Math.max(0, Math.round((invoice.total - invoice.amountPaid) * 100) / 100);
  invoice.status = recomputePaymentStatus(invoice.amountPaid, invoice.total);
  await invoice.save();
  void recordActivity({
    action: 'payment.recorded',
    messageKey: 'activity.payment.recorded',
    messageParams: { amount: String(amount), number: invoice.number },
    actor: { id: req.user!._id, name: req.user!.name, role: req.user!.role, branch: req.user!.branch },
    branch: invoice.branch,
    entityType: 'Payment',
    entityId: payment._id,
    entityLabel: invoice.number,
    metadata: { method: input.method, invoiceId: invoice._id.toString() },
  });
  void notifyRoles(['receptionist', 'manager', 'admin', 'super_admin'], {
    type: 'payment_received',
    severity: 'success',
    titleKey: 'invoiceNotifications.paymentReceived.title',
    bodyKey: 'invoiceNotifications.paymentReceived.body',
    params: { number: invoice.number, amount: String(amount) },
    entityType: 'invoice',
    entityId: invoice._id,
    link: `/app/invoices/${invoice._id.toString()}`,
  });
  res.status(201).json({
    success: true,
    message: 'Payment recorded',
    data: { payment: payment.toPublicJSON(), invoice: invoice.toPublicJSON() },
  });
});

export const listPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listPaymentsQuerySchema.parse(req.query);
  const scope = resolveScope(req.user);
  const { skip, limit, page } = parsePagination(query);
  const filter: Record<string, unknown> = { ...scope };
  if (query.method) filter.method = query.method;
  if (query.invoiceId) filter.invoice = query.invoiceId;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ invoiceNumber: rx }, { reference: rx }, { notes: rx }, { recordedByName: rx }];
  }
  const sort = parseSort(query, ['paidAt', 'amount', 'createdAt'], '-paidAt');
  const [rows, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);
  res.status(200).json({
    success: true,
    data: rows.map((p) => p.toPublicJSON()),
    meta: buildPagination(page, limit, total),
  });
});
