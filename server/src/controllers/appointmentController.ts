import mongoose from 'mongoose';
import type { Response } from 'express';
import {
  Appointment,
  ACTIVE_APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from '../models/Appointment.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifyRoles, recordActivity } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveScope } from './customerController.js';
import {
  calendarQuerySchema,
  cancelAppointmentSchema,
  conflictQuerySchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../validators/appointmentValidators.js';
import type { UserRole } from '../types/domain.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'receptionist'];

function assertCanManage(role: UserRole) {
  if (!MANAGE_ROLES.includes(role)) {
    throw AppError.forbidden('Your role cannot manage appointments', 'FORBIDDEN');
  }
}

function resolveWindow(
  startsAt: Date,
  durationMinutes?: number,
  endsAt?: Date
): { startsAt: Date; endsAt: Date; durationMinutes: number } {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    throw AppError.badRequest('Invalid start time', 'INVALID_START');
  }

  let end: Date;
  let duration: number;

  if (endsAt) {
    end = new Date(endsAt);
    if (Number.isNaN(end.getTime()) || end <= start) {
      throw AppError.badRequest('End time must be after start time', 'INVALID_END');
    }
    duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  } else {
    duration = durationMinutes ?? 30;
    if (duration < 15 || duration > 480) {
      throw AppError.badRequest('Duration must be between 15 and 480 minutes', 'INVALID_DURATION');
    }
    end = new Date(start.getTime() + duration * 60_000);
  }

  return { startsAt: start, endsAt: end, durationMinutes: duration };
}

async function findTechnicianConflicts(opts: {
  technicianId: mongoose.Types.ObjectId | string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
  branchFilter?: Record<string, unknown>;
}) {
  const filter: Record<string, unknown> = {
    technician: opts.technicianId,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    startsAt: { $lt: opts.endsAt },
    endsAt: { $gt: opts.startsAt },
    ...(opts.branchFilter ?? {}),
  };
  if (opts.excludeId && mongoose.isValidObjectId(opts.excludeId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(opts.excludeId) };
  }
  return Appointment.find(filter).sort({ startsAt: 1 }).limit(20);
}

async function populateSummary(appointment: InstanceType<typeof Appointment>) {
  const [customer, technician] = await Promise.all([
    Customer.findById(appointment.customer).select('name phone customerCode'),
    appointment.technician
      ? User.findById(appointment.technician).select('name role')
      : Promise.resolve(null),
  ]);

  return {
    appointment: appointment.toPublicJSON(),
    customer: customer
      ? {
          id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone,
          customerCode: customer.customerCode,
        }
      : null,
    technician: technician
      ? { id: technician._id.toString(), name: technician.name, role: technician.role }
      : null,
  };
}

export const listAppointments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listAppointmentsQuerySchema.parse(req.query);
  const scope = resolveScope(req.user);
  const { skip, limit, page } = parsePagination(query);
  const filter: Record<string, unknown> = { ...scope };

  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.customerId) filter.customer = query.customerId;
  if (query.technicianId) filter.technician = query.technicianId;
  if (query.from || query.to) {
    filter.startsAt = {};
    if (query.from) (filter.startsAt as Record<string, Date>).$gte = query.from;
    if (query.to) (filter.startsAt as Record<string, Date>).$lte = query.to;
  }
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: rx }, { notes: rx }];
  }

  const sort = parseSort(query, ['startsAt', 'endsAt', 'createdAt', 'status'], 'startsAt');
  const [rows, total] = await Promise.all([
    Appointment.find(filter).sort(sort).skip(skip).limit(limit),
    Appointment.countDocuments(filter),
  ]);

  const customerIds = [...new Set(rows.map((r) => r.customer.toString()))];
  const techIds = [
    ...new Set(rows.filter((r) => r.technician).map((r) => r.technician!.toString())),
  ];
  const [customers, techs] = await Promise.all([
    Customer.find({ _id: { $in: customerIds } }).select('name phone customerCode'),
    User.find({ _id: { $in: techIds } }).select('name role'),
  ]);
  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
  const techMap = new Map(techs.map((u) => [u._id.toString(), u]));

  const data = rows.map((row) => {
    const c = customerMap.get(row.customer.toString());
    const t = row.technician ? techMap.get(row.technician.toString()) : null;
    return {
      ...row.toPublicJSON(),
      customerName: c?.name ?? null,
      customerPhone: c?.phone ?? null,
      customerCode: c?.customerCode ?? null,
      technicianName: t?.name ?? null,
    };
  });

  res.status(200).json({
    success: true,
    data,
    meta: buildPagination(page, limit, total),
  });
});

export const calendarAppointments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = calendarQuerySchema.parse(req.query);
  if (query.to <= query.from) {
    throw AppError.badRequest('`to` must be after `from`', 'INVALID_RANGE');
  }
  const spanDays = (query.to.getTime() - query.from.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > 62) {
    throw AppError.badRequest('Calendar range cannot exceed 62 days', 'RANGE_TOO_LARGE');
  }

  const scope = resolveScope(req.user);
  const filter: Record<string, unknown> = {
    ...scope,
    startsAt: { $lt: query.to },
    endsAt: { $gt: query.from },
  };
  if (query.technicianId) filter.technician = query.technicianId;
  if (query.status) filter.status = query.status;
  else filter.status = { $in: ACTIVE_APPOINTMENT_STATUSES };

  const rows = await Appointment.find(filter).sort({ startsAt: 1 }).limit(500);
  const customerIds = [...new Set(rows.map((r) => r.customer.toString()))];
  const techIds = [
    ...new Set(rows.filter((r) => r.technician).map((r) => r.technician!.toString())),
  ];
  const [customers, techs] = await Promise.all([
    Customer.find({ _id: { $in: customerIds } }).select('name phone customerCode'),
    User.find({ _id: { $in: techIds } }).select('name role'),
  ]);
  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
  const techMap = new Map(techs.map((u) => [u._id.toString(), u]));

  const data = rows.map((row) => {
    const c = customerMap.get(row.customer.toString());
    const t = row.technician ? techMap.get(row.technician.toString()) : null;
    return {
      ...row.toPublicJSON(),
      customerName: c?.name ?? null,
      customerPhone: c?.phone ?? null,
      customerCode: c?.customerCode ?? null,
      technicianName: t?.name ?? null,
    };
  });

  res.status(200).json({ success: true, data });
});

export const checkConflicts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = conflictQuerySchema.parse(req.query);
  if (query.endsAt <= query.startsAt) {
    throw AppError.badRequest('End time must be after start time', 'INVALID_END');
  }
  const scope = resolveScope(req.user);
  const conflicts = await findTechnicianConflicts({
    technicianId: query.technicianId,
    startsAt: query.startsAt,
    endsAt: query.endsAt,
    excludeId: query.excludeId,
    branchFilter: scope,
  });

  res.status(200).json({
    success: true,
    data: {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.map((c) => c.toPublicJSON()),
    },
  });
});

export const getAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const scope = resolveScope(req.user);
  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');

  const summary = await populateSummary(appointment);
  res.status(200).json({ success: true, data: summary });
});

export const createAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const input = createAppointmentSchema.parse(req.body) as CreateAppointmentInput;
  const scope = resolveScope(req.user);

  const customer = await Customer.findOne({ _id: input.customerId, ...scope });
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const branchId =
    (customer.branch as mongoose.Types.ObjectId) ??
    (req.user!.branch as mongoose.Types.ObjectId | undefined);
  if (!branchId) throw AppError.badRequest('Branch is required', 'BRANCH_REQUIRED');

  const window = resolveWindow(input.startsAt, input.durationMinutes, input.endsAt);

  let technicianId: mongoose.Types.ObjectId | undefined;
  if (input.technicianId) {
    const tech = await User.findOne({
      _id: input.technicianId,
      role: 'technician',
      isActive: true,
    });
    if (!tech) throw AppError.notFound('Technician not found', 'TECHNICIAN_NOT_FOUND');
    if (req.user!.role !== 'super_admin' && tech.branch && req.user!.branch) {
      if (tech.branch.toString() !== req.user!.branch.toString()) {
        throw AppError.forbidden('Technician belongs to another branch', 'TECHNICIAN_BRANCH');
      }
    }
    technicianId = tech._id;

    const conflicts = await findTechnicianConflicts({
      technicianId: tech._id,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      branchFilter: scope,
    });
    if (conflicts.length > 0) {
      throw AppError.conflict(
        `Technician is already booked from ${conflicts[0].startsAt.toISOString()} to ${conflicts[0].endsAt.toISOString()}`,
        'APPOINTMENT_CONFLICT'
      );
    }
  }

  if (input.repairTicketId) {
    const ticket = await RepairTicket.findOne({ _id: input.repairTicketId, ...scope });
    if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');
  }

  const appointment = await Appointment.create({
    customer: customer._id,
    branch: branchId,
    technician: technicianId,
    repairTicket: input.repairTicketId
      ? new mongoose.Types.ObjectId(input.repairTicketId)
      : undefined,
    title: input.title.trim(),
    type: input.type ?? 'consultation',
    status: (input.status as AppointmentStatus) ?? 'scheduled',
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    durationMinutes: window.durationMinutes,
    notes: input.notes ?? undefined,
    createdBy: req.user!._id,
  });

  void recordActivity({
    action: 'appointment.created',
    messageKey: 'activity.appointment.created',
    messageParams: { title: appointment.title },
    actor: {
      id: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      branch: req.user!.branch,
    },
    branch: branchId,
    entityType: 'Appointment',
    entityId: appointment._id,
    entityLabel: appointment.title,
    metadata: {
      startsAt: appointment.startsAt.toISOString(),
      technicianId: technicianId?.toString(),
    },
  });

  void notifyRoles(['receptionist', 'manager', 'admin', 'super_admin'], {
    type: 'appointment_reminder',
    severity: 'info',
    titleKey: 'appointmentNotifications.created.title',
    bodyKey: 'appointmentNotifications.created.body',
    params: { title: appointment.title },
    entityType: 'appointment',
    entityId: appointment._id,
    link: `/app/appointments`,
    exclude: [req.user!._id],
  });

  const summary = await populateSummary(appointment);
  res.status(201).json({
    success: true,
    message: 'Appointment scheduled',
    data: summary,
  });
});

export const updateAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const input = updateAppointmentSchema.parse(req.body) as UpdateAppointmentInput;
  const scope = resolveScope(req.user);

  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    throw AppError.conflict(
      'Cannot edit a cancelled or completed appointment',
      'APPOINTMENT_CLOSED'
    );
  }

  if (input.customerId) {
    const customer = await Customer.findOne({ _id: input.customerId, ...scope });
    if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    appointment.customer = customer._id;
  }

  if (input.title !== undefined) appointment.title = input.title.trim();
  if (input.type !== undefined) appointment.type = input.type;
  if (input.notes !== undefined) appointment.notes = input.notes ?? undefined;
  if (input.repairTicketId !== undefined) {
    if (input.repairTicketId) {
      const ticket = await RepairTicket.findOne({ _id: input.repairTicketId, ...scope });
      if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');
      appointment.repairTicket = ticket._id;
    } else {
      appointment.repairTicket = undefined;
    }
  }

  const nextStart = input.startsAt ? new Date(input.startsAt) : appointment.startsAt;
  const nextDuration = input.durationMinutes ?? appointment.durationMinutes;
  const nextEnd = input.endsAt
    ? new Date(input.endsAt)
    : new Date(nextStart.getTime() + nextDuration * 60_000);
  const window = resolveWindow(nextStart, nextDuration, nextEnd);
  appointment.startsAt = window.startsAt;
  appointment.endsAt = window.endsAt;
  appointment.durationMinutes = window.durationMinutes;

  if (input.technicianId !== undefined) {
    if (input.technicianId) {
      const tech = await User.findOne({
        _id: input.technicianId,
        role: 'technician',
        isActive: true,
      });
      if (!tech) throw AppError.notFound('Technician not found', 'TECHNICIAN_NOT_FOUND');
      appointment.technician = tech._id;
    } else {
      appointment.technician = undefined;
    }
  }

  if (appointment.technician) {
    const conflicts = await findTechnicianConflicts({
      technicianId: appointment.technician,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      excludeId: appointment._id.toString(),
      branchFilter: scope,
    });
    if (conflicts.length > 0) {
      throw AppError.conflict(
        `Technician is already booked from ${conflicts[0].startsAt.toISOString()} to ${conflicts[0].endsAt.toISOString()}`,
        'APPOINTMENT_CONFLICT'
      );
    }
  }

  if (input.status !== undefined) {
    if (input.status === 'cancelled') {
      throw AppError.badRequest('Use the cancel endpoint to cancel an appointment', 'USE_CANCEL');
    }
    appointment.status = input.status;
    if (input.status === 'completed') {
      appointment.completedAt = new Date();
    }
  }

  await appointment.save();

  void recordActivity({
    action: 'appointment.updated',
    messageKey: 'activity.appointment.updated',
    messageParams: { title: appointment.title },
    actor: {
      id: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      branch: req.user!.branch,
    },
    branch: appointment.branch,
    entityType: 'Appointment',
    entityId: appointment._id,
    entityLabel: appointment.title,
  });

  const summary = await populateSummary(appointment);
  res.status(200).json({
    success: true,
    message: 'Appointment updated',
    data: summary,
  });
});

export const confirmAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const scope = resolveScope(req.user);
  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  if (appointment.status !== 'scheduled') {
    throw AppError.conflict('Only scheduled appointments can be confirmed', 'INVALID_STATUS');
  }
  appointment.status = 'confirmed';
  await appointment.save();
  const summary = await populateSummary(appointment);
  res.status(200).json({ success: true, message: 'Appointment confirmed', data: summary });
});

export const completeAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const scope = resolveScope(req.user);
  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw AppError.conflict('Appointment is already closed', 'APPOINTMENT_CLOSED');
  }
  appointment.status = 'completed';
  appointment.completedAt = new Date();
  await appointment.save();
  const summary = await populateSummary(appointment);
  res.status(200).json({ success: true, message: 'Appointment completed', data: summary });
});

export const cancelAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const input = cancelAppointmentSchema.parse(req.body ?? {});
  const scope = resolveScope(req.user);
  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  if (appointment.status === 'cancelled') {
    throw AppError.conflict('Appointment is already cancelled', 'ALREADY_CANCELLED');
  }
  if (appointment.status === 'completed') {
    throw AppError.conflict('Cannot cancel a completed appointment', 'APPOINTMENT_COMPLETED');
  }
  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  appointment.cancelReason = input.reason ?? undefined;
  await appointment.save();

  void recordActivity({
    action: 'appointment.updated',
    messageKey: 'activity.appointment.cancelled',
    messageParams: { title: appointment.title },
    actor: {
      id: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      branch: req.user!.branch,
    },
    branch: appointment.branch,
    entityType: 'Appointment',
    entityId: appointment._id,
    entityLabel: appointment.title,
  });

  const summary = await populateSummary(appointment);
  res.status(200).json({ success: true, message: 'Appointment cancelled', data: summary });
});

export const markNoShow = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user!.role);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.badRequest('Invalid appointment id', 'INVALID_IDENTIFIER');
  }
  const scope = resolveScope(req.user);
  const appointment = await Appointment.findOne({ _id: id, ...scope });
  if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw AppError.conflict('Appointment is already closed', 'APPOINTMENT_CLOSED');
  }
  appointment.status = 'no_show';
  await appointment.save();
  const summary = await populateSummary(appointment);
  res.status(200).json({ success: true, message: 'Marked as no-show', data: summary });
});
