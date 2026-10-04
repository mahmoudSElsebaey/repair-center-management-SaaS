import mongoose from 'mongoose';
import type { Response } from 'express';
import { RepairTicket } from '../models/RepairTicket.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { nextTicketSequence } from '../models/Counter.js';
import { formatTicketCode, parseTicketCode } from '../utils/codes.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';
import { notify, notifyRoles, recordActivity } from '../services/events.js';
import {
  ACTIVE_STATUSES,
  OPEN_STATUSES,
  TERMINAL_STATUSES,
  assertTransitionAllowed,
  availableTransitions,
} from '../domain/repairWorkflow.js';
import type { AuthRequest } from '../middleware/auth.js';
import { objectId } from '../validators/authValidators.js';
import {
  changeStatusSchema,
  createRepairSchema,
  listRepairsQuerySchema,
  updateRepairSchema,
} from '../validators/repairValidators.js';
import { resolveScope } from './customerController.js';
import type { RepairStatus, UserRole } from '../types/domain.js';

const SORTABLE = ['createdAt', 'priority', 'code', 'status'] as const;

/**
 * Technician search may only find people who actually work on devices.
 * Letting any role be assigned would let a receptionist end up on a worklist.
 */
const ASSIGNABLE_ROLES: UserRole[] = ['technician', 'manager', 'admin', 'super_admin'];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Allocates the next ticket code for the current year.
 *
 * Sequential rather than random because the code is spoken aloud and printed on
 * a receipt. The counter's atomic `$inc` is what keeps two simultaneous intakes
 * from colliding; the unique index on `code` is the belt-and-braces guarantee.
 */
async function allocateTicketCode(): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await nextTicketSequence(year);
  return formatTicketCode(sequence, year);
}

/** `RF-2026-00421` typed into the search box becomes an exact code filter. */
function codeFromSearch(term: string): string | null {
  const parsed = parseTicketCode(term);
  if (!parsed) return null;
  return formatTicketCode(parsed.sequence, parsed.year);
}

/** The populated shape a ticket detail response carries alongside the ticket. */
interface PopulatedTicketRefs {
  customer: { _id: { toString(): string }; name: string; customerCode: string; phone: string; email?: string } | null;
  device: {
    _id: { toString(): string };
    brand: string;
    modelName: string;
    deviceType: string;
    serialNumber?: string;
    imei?: string;
    color?: string;
    condition: string;
  } | null;
  technician: { _id: { toString(): string }; name: string; role: string; avatar?: string } | null;
  branch: { _id: { toString(): string }; name: string; code: string } | null;
}

function summariseRefs(ticket: {
  customer?: unknown;
  device?: unknown;
  technician?: unknown;
  branch?: unknown;
}) {
  const customer = ticket.customer as unknown as PopulatedTicketRefs['customer'];
  const device = ticket.device as unknown as PopulatedTicketRefs['device'];
  const technician = ticket.technician as unknown as PopulatedTicketRefs['technician'];
  const branch = ticket.branch as unknown as PopulatedTicketRefs['branch'];

  return {
    customer: customer
      ? {
          id: customer._id.toString(),
          name: customer.name,
          customerCode: customer.customerCode,
          phone: customer.phone,
          email: customer.email,
        }
      : null,
    device: device
      ? {
          id: device._id.toString(),
          brand: device.brand,
          model: device.modelName,
          displayName: `${device.brand} ${device.modelName}`.trim(),
          deviceType: device.deviceType,
          serialNumber: device.serialNumber,
          imei: device.imei,
          color: device.color,
          condition: device.condition,
        }
      : null,
    technician: technician
      ? {
          id: technician._id.toString(),
          name: technician.name,
          role: technician.role,
          avatar: technician.avatar,
        }
      : null,
    branch: branch ? { id: branch._id.toString(), name: branch.name, code: branch.code } : null,
  };
}

/** Appends a history entry. Always paired with a status change. */
function pushHistory(
  ticket: { statusHistory: unknown[] },
  entry: {
    from: RepairStatus | null;
    to: RepairStatus;
    at: Date;
    by?: unknown;
    byName?: string;
    byRole?: string;
    note?: string;
  }
) {
  ticket.statusHistory.push(entry);
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/repairs */
export const listRepairs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const query = listRepairsQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, SORTABLE, '-createdAt');

  const filter: Record<string, unknown> = { ...resolveScope(user, query.branch) };

  if (query.status) filter.status = query.status;

  if (query.state === 'open') filter.status = { $in: OPEN_STATUSES };
  if (query.state === 'closed') filter.status = { $in: TERMINAL_STATUSES };
  if (query.state === 'active') filter.status = { $in: ACTIVE_STATUSES };

  if (query.priority) filter.priority = query.priority;
  if (query.customer) filter.customer = query.customer;
  if (query.device) filter.device = query.device;

  /**
   * Bench scoping, in priority order:
   *   mine=true        â†’ only my tickets, whatever my role
   *   unassigned=true  â†’ only tickets nobody has picked up
   *   technician=<id>  â†’ that person's bench
   *   otherwise        â†’ technicians default to their own bench; other roles see
   *                      the whole branch
   */
  if (query.mine === 'true') filter.technician = user._id;
  else if (query.unassigned === 'true') filter.technician = { $exists: false };
  else if (query.technician) filter.technician = new mongoose.Types.ObjectId(query.technician);
  else if (user.role === 'technician') filter.technician = user._id;

  if (query.search) {
    const term = escapeRegex(query.search);
    const exactCode = codeFromSearch(query.search);

    // Codes are searched exactly, everything else fuzzily.
    const or: Record<string, unknown>[] = exactCode ? [{ code: exactCode }] : [];
    or.push({ code: new RegExp(term, 'i') }, { issue: new RegExp(term, 'i') });

    // Matching on the related records means an operator can search the way they
    // think: by customer name, phone, or device.
    const [matchingCustomers, matchingDevices] = await Promise.all([
      Customer.find({ name: new RegExp(term, 'i') }).select('_id').limit(200),
      Device.find({
        $or: [
          { brand: new RegExp(term, 'i') },
          { modelName: new RegExp(term, 'i') },
          { serialNumber: new RegExp(term, 'i') },
        ],
      })
        .select('_id')
        .limit(200),
    ]);

    const customerIds = matchingCustomers.map((doc) => doc._id);
    const deviceIds = matchingDevices.map((doc) => doc._id);

    if (customerIds.length) or.push({ customer: { $in: customerIds } });
    if (deviceIds.length) or.push({ device: { $in: deviceIds } });

    // Raw phone digits: "+20 100 552 3311" should match "01005523311".
    const digits = query.search.replace(/\D/g, '');
    if (digits.length >= 5) {
      const byPhone = await Customer.find({
        phone: new RegExp(digits.split('').join('\\D*')),
      })
        .select('_id')
        .limit(200);
      if (byPhone.length) or.push({ customer: { $in: byPhone.map((doc) => doc._id) } });
    }

    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    RepairTicket.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate<{ customer: PopulatedTicketRefs['customer'] }>('customer', 'name customerCode phone')
      .populate<{ device: PopulatedTicketRefs['device'] }>(
        'device',
        'brand modelName deviceType serialNumber imei color condition'
      )
      .populate<{ technician: PopulatedTicketRefs['technician'] }>('technician', 'name role avatar')
      .lean(),
    RepairTicket.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items.map((ticket) => {
      const refs = summariseRefs(ticket);
      // The list carries summaries, not the full status history.
      const { statusHistory, ...rest } = ticket as unknown as Record<string, unknown>;
      void statusHistory;

      return {
        id: String((ticket as unknown as { _id: unknown })._id),
        ...rest,
        customer: refs.customer?.id,
        device: refs.device?.id,
        technician: refs.technician?.id ?? null,
        customerSummary: refs.customer,
        deviceSummary: refs.device,
        technicianSummary: refs.technician,
      };
    }),
    meta: buildPagination(page, limit, total),
  });
});

/* -------------------------------------------------------------------------- */
/* Detail                                                                      */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/repairs/:id */
export const getRepair = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const ticket = await RepairTicket.findOne({ _id: id, ...scope })
    .populate('customer', 'name customerCode phone email preferredLanguage city address')
    .populate('device', 'brand modelName deviceType serialNumber imei color condition accessories reportedIssue')
    .populate('technician', 'name role avatar phone')
    .populate('branch', 'name code city');

  if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');

  const role = req.user!.role;

  // The client renders its buttons from this list, so what it offers and what
  // the server accepts can never diverge.
  const actions = availableTransitions(
    {
      status: ticket.status,
      diagnosis: ticket.diagnosis,
      estimatedCost: ticket.estimatedCost,
      finalCost: ticket.finalCost,
      technician: ticket.technician ? String(ticket.technician) : null,
      customerApproved: ticket.customerApproved,
    },
    role
  ).map((rule) => ({ to: rule.to, labelKey: rule.labelKey }));

  res.status(200).json({
    success: true,
    data: {
      ticket: ticket.toPublicJSON(),
      ...summariseRefs(ticket),
      availableActions: actions,
      isTerminal: TERMINAL_STATUSES.includes(ticket.status),
    },
  });
});

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/v1/repairs
 *
 * Opening a ticket is the moment the workshop takes responsibility for someone's
 * property, so the device and its owner are verified rather than trusted, and the
 * opening status is recorded in the history like every later move.
 */
export const createRepair = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const input = createRepairSchema.parse(req.body);
  const scope = resolveScope(req.user);

  const device = await Device.findOne({ _id: input.device, ...scope });
  if (!device) throw AppError.badRequest('That device does not exist', 'DEVICE_NOT_FOUND');

  const customer = await Customer.findById(device.customer);
  if (!customer) throw AppError.badRequest('The device has no owner', 'CUSTOMER_NOT_FOUND');

  // An assigned technician must be a real, active, assignable member of staff.
  if (input.technician) {
    const technician = await User.findOne({
      _id: input.technician,
      isActive: true,
      role: { $in: ASSIGNABLE_ROLES },
    });
    if (!technician) {
      throw AppError.badRequest('That technician is not available', 'TECHNICIAN_NOT_FOUND');
    }
  }

  const now = new Date();

  const ticket = await RepairTicket.create({
    code: await allocateTicketCode(),
    customer: customer._id,
    device: device._id,
    branch: device.branch,
    technician: input.technician,
    status: 'received',
    priority: input.priority,
    // Defaulting to the fault recorded at intake saves the counter from retyping.
    issue: input.issue ?? device.reportedIssue,
    estimatedCost: input.estimatedCost,
    expectedCompletionAt: input.expectedCompletionAt,
    warrantyDays: input.warrantyDays,
    notes: input.notes,
    createdBy: user._id,
    statusHistory: [
      {
        from: null,
        to: 'received',
        at: now,
        by: user._id,
        byName: user.name,
        byRole: user.role,
        note: 'Ticket opened',
      },
    ],
  });

  customer.lastVisitAt = now;
  await customer.save({ validateBeforeSave: false });

  const displayName = `${device.brand} ${device.modelName}`.trim();

  void recordActivity({
    action: 'repair.created',
    messageKey: 'activity.repair.created',
    messageParams: { code: ticket.code },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: ticket.branch,
    entityType: 'RepairTicket',
    entityId: ticket._id,
    entityLabel: ticket.code,
    metadata: { customer: customer.name, device: displayName },
  });

  // Whoever is on the bench needs to know a unit is waiting.
  if (input.technician) {
    void notify({
      recipients: [input.technician],
      type: 'repair_assigned',
      severity: 'info',
      titleKey: 'repairNotifications.repairAssigned.title',
      bodyKey: 'repairNotifications.repairAssigned.body',
      params: { code: ticket.code, device: displayName },
      link: `/app/repairs/${ticket._id.toString()}`,
      entityType: 'RepairTicket',
      entityId: ticket._id,
    });
  } else {
    void notifyRoles(['technician'], {
      type: 'repair_assigned',
      severity: 'info',
      titleKey: 'repairNotifications.repairUnassigned.title',
      bodyKey: 'repairNotifications.repairUnassigned.body',
      params: { code: ticket.code, device: displayName },
      link: `/app/repairs/${ticket._id.toString()}`,
      entityType: 'RepairTicket',
      entityId: ticket._id,
      exclude: [user._id],
    });
  }

  res.status(201).json({
    success: true,
    message: 'Repair ticket opened',
    data: { ticket: ticket.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/v1/repairs/:id
 *
 * Only the descriptive fields. Status is deliberately excluded â€” it moves through
 * `PATCH /repairs/:id/status`, which enforces the workflow.
 */
export const updateRepair = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const updates = updateRepairSchema.parse(req.body);
  const scope = resolveScope(req.user);

  if (updates.technician) {
    const technician = await User.findOne({
      _id: updates.technician,
      isActive: true,
      role: { $in: ASSIGNABLE_ROLES },
    });
    if (!technician) {
      throw AppError.badRequest('That technician is not available', 'TECHNICIAN_NOT_FOUND');
    }
  }

  const ticket = await RepairTicket.findOne({ _id: id, ...scope });
  if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');

  if (TERMINAL_STATUSES.includes(ticket.status)) {
    throw AppError.badRequest(
      'A closed ticket can no longer be edited',
      'REPAIR_CLOSED'
    );
  }

  const previousTechnician = ticket.technician ? String(ticket.technician) : null;

  Object.assign(ticket, updates);
  await ticket.save();

  const nextTechnician = ticket.technician ? String(ticket.technician) : null;

  void recordActivity({
    action: nextTechnician !== previousTechnician ? 'repair.assigned' : 'repair.updated',
    messageKey:
      nextTechnician !== previousTechnician ? 'activity.repair.assigned' : 'activity.repair.updated',
    messageParams: {
      code: ticket.code,
      technician: nextTechnician ?? '',
    },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: ticket.branch,
    entityType: 'RepairTicket',
    entityId: ticket._id,
    entityLabel: ticket.code,
  });

  if (nextTechnician && nextTechnician !== previousTechnician) {
    void notify({
      recipients: [nextTechnician],
      type: 'repair_assigned',
      severity: 'info',
      titleKey: 'repairNotifications.repairAssigned.title',
      bodyKey: 'repairNotifications.repairAssigned.body',
      params: { code: ticket.code },
      link: `/app/repairs/${ticket._id.toString()}`,
      entityType: 'RepairTicket',
      entityId: ticket._id,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Repair ticket updated',
    data: { ticket: ticket.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Status transition                                                           */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /api/v1/repairs/:id/status
 *
 * The only way a ticket's status changes. The workflow module decides whether the
 * move is defined, whether this role may make it, and whether the ticket carries
 * the information the step requires â€” so the rules live in one auditable place
 * rather than being re-implemented per caller.
 */
export const changeRepairStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const input = changeStatusSchema.parse(req.body);
  const scope = resolveScope(req.user);

  const ticket = await RepairTicket.findOne({ _id: id, ...scope }).populate(
    'device',
    'brand modelName'
  );
  if (!ticket) throw AppError.notFound('Repair ticket not found', 'REPAIR_NOT_FOUND');

  const from = ticket.status;

  // Throws with a specific code for each failure mode.
  assertTransitionAllowed(
    {
      status: ticket.status,
      diagnosis: ticket.diagnosis,
      estimatedCost: ticket.estimatedCost,
      finalCost: ticket.finalCost,
      technician: ticket.technician ? String(ticket.technician) : null,
      customerApproved: ticket.customerApproved,
    },
    input.status,
    user.role
  );

  const now = new Date();

  // Recording the customer decision travels with the approval move, so a ticket
  // can never sit in `approved` without a recorded decision behind it.
  if (input.status === 'approved') {
    if (input.customerApproved === false) {
      throw AppError.badRequest(
        'A rejected quotation should cancel the ticket, not approve it',
        'APPROVAL_CONTRADICTION'
      );
    }
    ticket.customerApproved = true;
    ticket.customerApprovedAt = now;
    ticket.customerRejectionReason = undefined;
  }

  if (input.status === 'cancelled' && input.customerApproved === false) {
    ticket.customerApproved = false;
    ticket.customerApprovedAt = now;
    ticket.customerRejectionReason = input.customerRejectionReason;
  }

  ticket.status = input.status;

  // Lifecycle timestamps the reports and warranty depend on.
  if (input.status === 'ready') ticket.completedAt = now;
  if (input.status === 'delivered') {
    ticket.deliveredAt = now;
    ticket.completedAt = ticket.completedAt ?? now;
  }

  const device = ticket.device as unknown as { brand: string; modelName: string } | null;
  const displayName = device ? `${device.brand} ${device.modelName}`.trim() : '';

  pushHistory(ticket, {
    from,
    to: input.status,
    at: now,
    by: user._id,
    byName: user.name,
    byRole: user.role,
    note: input.note,
  });

  await ticket.save();

  void recordActivity({
    action:
      input.status === 'delivered'
        ? 'repair.delivered'
        : input.status === 'in_repair' && !ticket.technician
          ? 'repair.updated'
          : 'repair.status_changed',
    messageKey:
      input.status === 'delivered' ? 'activity.repair.delivered' : 'activity.repair.statusChanged',
    messageParams: { code: ticket.code, status: input.status },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: ticket.branch,
    entityType: 'RepairTicket',
    entityId: ticket._id,
    entityLabel: ticket.code,
    metadata: { from, to: input.status },
  });

  // The two moments a customer is actually waiting on.
  if (input.status === 'waiting_customer') {
    void notifyRoles(['receptionist', 'manager', 'admin'], {
      type: 'approval_requested',
      severity: 'warning',
      titleKey: 'repairNotifications.approvalRequested.title',
      bodyKey: 'repairNotifications.approvalRequested.body',
      params: { code: ticket.code, device: displayName },
      link: `/app/repairs/${ticket._id.toString()}`,
      entityType: 'RepairTicket',
      entityId: ticket._id,
      exclude: [user._id],
    });
  }

  if (input.status === 'ready') {
    void notifyRoles(['receptionist', 'manager', 'admin'], {
      type: 'repair_status_changed',
      severity: 'success',
      titleKey: 'repairNotifications.repairReady.title',
      bodyKey: 'repairNotifications.repairReady.body',
      params: { code: ticket.code, device: displayName },
      link: `/app/repairs/${ticket._id.toString()}`,
      entityType: 'RepairTicket',
      entityId: ticket._id,
      exclude: [user._id],
    });
  }

  res.status(200).json({
    success: true,
    message: 'Repair status updated',
    data: { ticket: ticket.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Reference data                                                              */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/repairs/technicians â€” the people a ticket can be assigned to. */
export const listAssignableTechnicians = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const scope: Record<string, unknown> = {};

  // Branch staff only see their own colleagues; a super admin sees everyone.
  if (user.role !== 'super_admin' && user.branch) scope.branch = user.branch;

  const technicians = await User.find({
    ...scope,
    isActive: true,
    role: { $in: ASSIGNABLE_ROLES },
  })
    .select('name role avatar branch')
    .sort({ name: 1 })
    .lean();

  /**
   * Live workload: how many tickets each person is holding right now. Computed
   * here rather than in a second request so the assignment dropdown can show it
   * without an extra round trip.
   */
  const workload = await RepairTicket.aggregate<{ _id: unknown; count: number }>([
    { $match: { technician: { $in: technicians.map((t) => t._id) }, status: { $in: ACTIVE_STATUSES } } },
    { $group: { _id: '$technician', count: { $sum: 1 } } },
  ]);

  const countByTechnician = new Map(workload.map((row) => [String(row._id), row.count]));

  res.status(200).json({
    success: true,
    data: technicians.map((technician) => ({
      id: String(technician._id),
      name: technician.name,
      role: technician.role,
      avatar: technician.avatar,
      activeTickets: countByTechnician.get(String(technician._id)) ?? 0,
    })),
  });
});

/** GET /api/v1/repairs/summary â€” counts used by the list header and filters. */
export const getRepairSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const scope = resolveScope(user);

  const rows = await RepairTicket.aggregate<{ _id: RepairStatus; count: number }>([
    { $match: scope },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = Object.fromEntries(rows.map((row) => [row._id, row.count])) as Partial<
    Record<RepairStatus, number>
  >;

  const open = OPEN_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const active = ACTIVE_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

  res.status(200).json({
    success: true,
    data: {
      byStatus: counts,
      total: rows.reduce((sum, row) => sum + row.count, 0),
      open,
      active,
      ready: counts.ready ?? 0,
      awaitingApproval: counts.waiting_customer ?? 0,
      waitingParts: counts.waiting_parts ?? 0,
    },
  });
});

/** Throws `BRANCH_NOT_FOUND` when a branch id does not resolve. */
export async function assertBranchExists(branchId: string): Promise<void> {
  const exists = await Branch.exists({ _id: branchId });
  if (!exists) throw AppError.badRequest('That branch does not exist', 'BRANCH_NOT_FOUND');
}


