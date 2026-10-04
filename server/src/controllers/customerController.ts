import mongoose from 'mongoose';
import type { Response } from 'express';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { Branch } from '../models/Branch.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateCode } from '../utils/codes.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';
import { recordActivity } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from '../validators/customerValidators.js';
import { objectId } from '../validators/authValidators.js';

const CUSTOMER_CODE_PREFIX = 'CUS';
const SORTABLE = ['name', 'createdAt', 'lastVisitAt'] as const;

/**
 * Branch scoping.
 *
 * A super admin works across the organisation; everyone else is confined to
 * their own branch. This is applied to the query itself, never by filtering the
 * response in the browser, so a crafted request cannot read another branch.
 *
 * The branch is returned as a real `ObjectId`. That matters more than it looks:
 * Mongoose casts strings inside `find()`, but an aggregation pipeline receives
 * the filter verbatim, so a string branch silently matches nothing. Returning a
 * typed id means every caller â€” query or aggregation â€” behaves identically.
 */
export function resolveScope(user: AuthRequest['user'], requested?: string) {
  if (!user) throw AppError.unauthorized();

  if (user.role === 'super_admin') {
    return requested ? { branch: new mongoose.Types.ObjectId(requested) } : {};
  }

  if (!user.branch) {
    throw AppError.forbidden('Your account is not linked to a branch', 'NO_BRANCH');
  }

  return { branch: new mongoose.Types.ObjectId(user.branch.toString()) };
}

/**
 * Allocates a unique customer code.
 *
 * Random rather than sequential: a counter would need an atomic find-and-update
 * on every registration, and a random code leaks nothing about how many
 * customers a competitor has. Collisions are resolved by retrying, and the
 * unique index is the real guarantee.
 */
async function allocateCustomerCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateCode(CUSTOMER_CODE_PREFIX, 6);
    const exists = await Customer.exists({ customerCode: code });
    if (!exists) return code;
  }

  throw new AppError(
    'Could not allocate a customer code â€” please retry',
    503,
    'CODE_ALLOCATION_FAILED'
  );
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

/** GET /api/v1/customers */
export const listCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listCustomersQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, SORTABLE);

  const filter: Record<string, unknown> = { ...resolveScope(req.user, query.branch) };

  if (query.isActive) filter.isActive = query.isActive === 'true';
  if (query.city) filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');

  if (query.search) {
    // Operators type either a name or the digits of a phone number, so the
    // search spans both and ignores phone formatting.
    const term = escapeRegex(query.search);
    const digits = query.search.replace(/\D/g, '');
    const or: Record<string, unknown>[] = [
      { name: new RegExp(term, 'i') },
      { customerCode: new RegExp(term, 'i') },
      { email: new RegExp(term, 'i') },
    ];

    if (digits.length >= 3) {
      or.push({ phone: new RegExp(digits.split('').join('\\D*')) });
    } else {
      or.push({ phone: new RegExp(term, 'i') });
    }

    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  // Device counts for the visible page only â€” one aggregate, not N queries.
  const ids = items.map((item) => item._id);
  const deviceCounts = ids.length
    ? await Device.aggregate<{ _id: unknown; count: number }>([
        { $match: { customer: { $in: ids }, isActive: true } },
        { $group: { _id: '$customer', count: { $sum: 1 } } },
      ])
    : [];

  const countByCustomer = new Map(deviceCounts.map((row) => [String(row._id), row.count]));

  res.status(200).json({
    success: true,
    data: items.map((customer) => ({
      ...customer.toPublicJSON(),
      deviceCount: countByCustomer.get(customer._id.toString()) ?? 0,
    })),
    meta: buildPagination(page, limit, total),
  });
});

/** GET /api/v1/customers/:id */
export const getCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const customer = await Customer.findOne({ _id: id, ...scope });
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const devices = await Device.find({ customer: customer._id, isActive: true }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    data: {
      customer: customer.toPublicJSON(),
      devices: devices.map((device) => device.toPublicJSON()),
    },
  });
});

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

/** POST /api/v1/customers */
export const createCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const input = createCustomerSchema.parse(req.body);

  const branchId = user.role === 'super_admin' ? input.branch : user.branch;
  if (!branchId) {
    throw AppError.badRequest('A branch is required to register a customer', 'BRANCH_REQUIRED');
  }

  const branch = await Branch.findById(branchId);
  if (!branch) throw AppError.badRequest('That branch does not exist', 'BRANCH_NOT_FOUND');

  const customer = await Customer.create({
    ...input,
    branch: branchId,
    customerCode: await allocateCustomerCode(),
    createdBy: user._id,
  });

  void recordActivity({
    action: 'customer.created',
    messageKey: 'activity.customer.created',
    messageParams: { name: customer.name },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: customer.branch,
    entityType: 'Customer',
    entityId: customer._id,
    entityLabel: customer.name,
  });

  res.status(201).json({
    success: true,
    message: 'Customer registered',
    data: { customer: customer.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

/** PATCH /api/v1/customers/:id */
export const updateCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const updates = updateCustomerSchema.parse(req.body);
  const scope = resolveScope(req.user);

  const customer = await Customer.findOneAndUpdate(
    { _id: id, ...scope },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  // Deactivating a customer hides their devices too, so an inactive account
  // cannot still appear in device pickers.
  if (updates.isActive === false) {
    await Device.updateMany({ customer: customer._id }, { $set: { isActive: false } });
  }

  void recordActivity({
    action: 'customer.updated',
    messageKey: 'activity.customer.updated',
    messageParams: { name: customer.name },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: customer.branch,
    entityType: 'Customer',
    entityId: customer._id,
    entityLabel: customer.name,
  });

  res.status(200).json({
    success: true,
    message: 'Customer updated',
    data: { customer: customer.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Delete                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/v1/customers/:id
 *
 * Soft delete. A customer with repair history is never removed â€” the invoices
 * and warranty records that reference them must stay resolvable â€” so the record
 * is deactivated and hidden from default listings instead.
 */
export const deleteCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const customer = await Customer.findOne({ _id: id, ...scope });
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  customer.isActive = false;
  await customer.save();

  const devices = await Device.updateMany(
    { customer: customer._id },
    { $set: { isActive: false } }
  );

  void recordActivity({
    action: 'customer.deleted',
    messageKey: 'activity.customer.deleted',
    messageParams: { name: customer.name },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: customer.branch,
    entityType: 'Customer',
    entityId: customer._id,
    entityLabel: customer.name,
    metadata: { devicesDeactivated: devices.modifiedCount },
  });

  res.status(200).json({
    success: true,
    message: 'Customer archived',
    data: { id: customer._id.toString(), devicesDeactivated: devices.modifiedCount },
  });
});

