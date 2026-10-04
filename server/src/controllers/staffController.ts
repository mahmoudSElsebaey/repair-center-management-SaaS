import mongoose from 'mongoose';
import type { Response } from 'express';
import { User, type PublicUser } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';
import { recordActivity } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  createStaffSchema,
  listStaffQuerySchema,
  updateStaffSchema,
} from '../validators/staffValidators.js';
import { objectId } from '../validators/authValidators.js';
import type { UserRole } from '../types/domain.js';
import { TERMINAL_STATUSES } from '../domain/repairWorkflow.js';

const SORTABLE = ['name', 'createdAt', 'role', 'lastLogin'] as const;

const MANAGE_ROLES: UserRole[] = ['super_admin', 'admin'];
const VIEW_ROLES: UserRole[] = ['super_admin', 'admin', 'manager'];

function staffScope(user: AuthRequest['user'], requestedBranch?: string) {
  if (!user) throw AppError.unauthorized();

  if (user.role === 'super_admin') {
    return requestedBranch
      ? { branch: new mongoose.Types.ObjectId(requestedBranch) }
      : {};
  }

  if (!user.branch) {
    throw AppError.forbidden('Your account is not linked to a branch', 'NO_BRANCH');
  }

  return {
    branch: new mongoose.Types.ObjectId(user.branch.toString()),
    role: { $ne: 'super_admin' as UserRole },
  };
}

function assertCanManage(user: AuthRequest['user']) {
  if (!user || !MANAGE_ROLES.includes(user.role)) {
    throw AppError.forbidden('Only administrators can manage staff accounts', 'ROLE_FORBIDDEN');
  }
}

function assertCanView(user: AuthRequest['user']) {
  if (!user || !VIEW_ROLES.includes(user.role)) {
    throw AppError.forbidden('Your role cannot view the staff directory', 'ROLE_FORBIDDEN');
  }
}

function assertRoleAssignment(actor: AuthRequest['user'], role: string) {
  if (role === 'super_admin') {
    throw AppError.forbidden('The super_admin role cannot be assigned through the API', 'ROLE_FORBIDDEN');
  }
  if (role === 'admin' && actor?.role !== 'super_admin') {
    throw AppError.forbidden('Only a super admin can create or promote administrators', 'ROLE_FORBIDDEN');
  }
}

interface WorkloadRow {
  openTickets: number;
  activeTickets: number;
  completedLast30Days: number;
}

type BranchPopulated = { _id: mongoose.Types.ObjectId; name: string; code: string } | null;

async function workloadFor(userIds: mongoose.Types.ObjectId[]): Promise<Map<string, WorkloadRow>> {
  if (userIds.length === 0) return new Map();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const activeStatuses = ['diagnosing', 'approved', 'in_repair', 'waiting_parts'];

  const [openRows, activeRows, completedRows] = await Promise.all([
    RepairTicket.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { technician: { $in: userIds }, status: { $nin: TERMINAL_STATUSES } } },
      { $group: { _id: '$technician', count: { $sum: 1 } } },
    ]),
    RepairTicket.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { technician: { $in: userIds }, status: { $in: activeStatuses } } },
      { $group: { _id: '$technician', count: { $sum: 1 } } },
    ]),
    RepairTicket.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      {
        $match: {
          technician: { $in: userIds },
          status: { $in: ['ready', 'delivered'] },
          updatedAt: { $gte: since },
        },
      },
      { $group: { _id: '$technician', count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map<string, WorkloadRow>();
  for (const id of userIds) {
    map.set(id.toString(), { openTickets: 0, activeTickets: 0, completedLast30Days: 0 });
  }
  for (const row of openRows) {
    const entry = map.get(row._id.toString());
    if (entry) entry.openTickets = row.count;
  }
  for (const row of activeRows) {
    const entry = map.get(row._id.toString());
    if (entry) entry.activeTickets = row.count;
  }
  for (const row of completedRows) {
    const entry = map.get(row._id.toString());
    if (entry) entry.completedLast30Days = row.count;
  }
  return map;
}

function toStaffJSON(
  user: { toPublicJSON(): PublicUser },
  branch?: BranchPopulated,
  workload?: WorkloadRow
) {
  const base = user.toPublicJSON();
  return {
    ...base,
    branch: branch
      ? { id: branch._id.toString(), name: branch.name, code: branch.code }
      : base.branch
        ? { id: String(base.branch), name: '', code: '' }
        : null,
    workload: workload ?? null,
  };
}

export const listStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanView(req.user);

  const query = listStaffQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, SORTABLE, 'name');
  const scope = staffScope(req.user, query.branch);

  const filter: Record<string, unknown> = { ...scope };

  if (query.role) filter.role = query.role;
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  if (query.search) {
    const term = escapeRegex(query.search);
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { email: new RegExp(term, 'i') },
      { phone: new RegExp(term, 'i') },
    ];
  }

  const [rows, total] = await Promise.all([
    User.find(filter)
      .populate<{ branch: BranchPopulated }>('branch', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const workload = await workloadFor(rows.map((row) => row._id));

  res.json({
    success: true,
    data: rows.map((row) =>
      toStaffJSON(row, row.branch as BranchPopulated, workload.get(row._id.toString()))
    ),
    meta: buildPagination(page, limit, total),
  });
});

export const getStaffMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanView(req.user);

  const id = objectId.parse(req.params.id);
  const scope = staffScope(req.user);

  const user = await User.findOne({ _id: id, ...scope }).populate<{ branch: BranchPopulated }>(
    'branch',
    'name code'
  );

  if (!user) throw AppError.notFound('Staff member not found', 'STAFF_NOT_FOUND');

  const workload = await workloadFor([user._id]);

  res.json({
    success: true,
    data: {
      member: toStaffJSON(user, user.branch as BranchPopulated, workload.get(user._id.toString())),
    },
  });
});

export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user);

  const input = createStaffSchema.parse(req.body);
  assertRoleAssignment(req.user, input.role);

  const existing = await User.findOne({ email: input.email });
  if (existing) throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');

  let branchId: mongoose.Types.ObjectId | undefined;
  if (input.branch) {
    const branch = await Branch.findById(input.branch);
    if (!branch) throw AppError.badRequest('Branch not found', 'BRANCH_NOT_FOUND');
    branchId = branch._id;
  } else if (req.user!.role !== 'super_admin') {
    if (!req.user!.branch) {
      throw AppError.badRequest('A branch is required for this account', 'BRANCH_REQUIRED');
    }
    branchId = new mongoose.Types.ObjectId(req.user!.branch.toString());
  }

  if (req.user!.role !== 'super_admin' && branchId && req.user!.branch) {
    if (branchId.toString() !== req.user!.branch.toString()) {
      throw AppError.forbidden('You can only create staff in your own branch', 'BRANCH_FORBIDDEN');
    }
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    password: input.password,
    role: input.role,
    branch: branchId,
    locale: input.locale ?? 'ar',
    isActive: true,
  });

  void recordActivity({
    action: 'user.created',
    messageKey: 'activity.user.created',
    messageParams: { name: user.name, role: user.role },
    actor: {
      id: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      branch: req.user!.branch,
    },
    branch: user.branch,
    entityType: 'User',
    entityId: user._id,
    entityLabel: user.name,
  });

  const populated = await User.findById(user._id).populate<{ branch: BranchPopulated }>(
    'branch',
    'name code'
  );

  res.status(201).json({
    success: true,
    message: 'Staff member created',
    data: {
      member: toStaffJSON(populated!, populated!.branch as BranchPopulated),
    },
  });
});

export const updateStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanManage(req.user);

  const id = objectId.parse(req.params.id);
  const input = updateStaffSchema.parse(req.body);

  const user = await User.findById(id);
  if (!user) throw AppError.notFound('Staff member not found', 'STAFF_NOT_FOUND');

  if (user._id.toString() === req.user!._id.toString()) {
    if (input.role && input.role !== user.role) {
      throw AppError.forbidden('You cannot change your own role here', 'SELF_ROLE_CHANGE');
    }
    if (input.isActive === false) {
      throw AppError.forbidden('You cannot deactivate your own account', 'SELF_DEACTIVATE');
    }
  }

  if (user.role === 'super_admin' && req.user!.role !== 'super_admin') {
    throw AppError.forbidden('You cannot modify a super admin account', 'ROLE_FORBIDDEN');
  }

  if (input.role) assertRoleAssignment(req.user, input.role);

  if (req.user!.role !== 'super_admin') {
    if (!req.user!.branch || !user.branch || user.branch.toString() !== req.user!.branch.toString()) {
      throw AppError.forbidden('You can only manage staff in your own branch', 'BRANCH_FORBIDDEN');
    }
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone ?? undefined;
  if (input.role !== undefined) user.role = input.role as UserRole;
  if (input.locale !== undefined) user.locale = input.locale;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  if (input.password) user.password = input.password;

  if (input.branch !== undefined) {
    if (input.branch === null) {
      user.branch = undefined;
    } else {
      const branch = await Branch.findById(input.branch);
      if (!branch) throw AppError.badRequest('Branch not found', 'BRANCH_NOT_FOUND');
      user.branch = branch._id;
    }
  }

  await user.save();

  const action =
    input.isActive === false
      ? 'user.deactivated'
      : input.isActive === true
        ? 'user.activated'
        : 'user.updated';

  void recordActivity({
    action,
    messageKey:
      action === 'user.deactivated'
        ? 'activity.user.deactivated'
        : action === 'user.activated'
          ? 'activity.user.activated'
          : 'activity.user.updated',
    messageParams: { name: user.name, role: user.role, fields: Object.keys(input).join(', ') },
    actor: {
      id: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      branch: req.user!.branch,
    },
    branch: user.branch,
    entityType: 'User',
    entityId: user._id,
    entityLabel: user.name,
  });

  const populated = await User.findById(user._id).populate<{ branch: BranchPopulated }>(
    'branch',
    'name code'
  );

  const workload = await workloadFor([user._id]);

  res.json({
    success: true,
    message: 'Staff member updated',
    data: {
      member: toStaffJSON(
        populated!,
        populated!.branch as BranchPopulated,
        workload.get(user._id.toString())
      ),
    },
  });
});

export const listTechnicianWorkload = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanView(req.user);

  const scope = staffScope(req.user);

  const filter: Record<string, unknown> = {
    ...scope,
    role: { $in: ['technician', 'manager'] },
    isActive: true,
  };

  const technicians = await User.find(filter)
    .populate<{ branch: BranchPopulated }>('branch', 'name code')
    .sort({ name: 1 });

  const workload = await workloadFor(technicians.map((t) => t._id));

  res.json({
    success: true,
    data: technicians.map((row) =>
      toStaffJSON(row, row.branch as BranchPopulated, workload.get(row._id.toString()))
    ),
  });
});

export const listBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertCanView(req.user);

  let filter: Record<string, unknown> = { isActive: true };
  if (req.user!.role !== 'super_admin' && req.user!.branch) {
    filter = { _id: req.user!.branch, isActive: true };
  }

  const branches = await Branch.find(filter).sort({ name: 1 }).select('name code city');

  res.json({
    success: true,
    data: branches.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      code: b.code,
      city: b.city,
    })),
  });
});
