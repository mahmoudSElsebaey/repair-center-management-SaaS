import type { Response } from 'express';
import { Device } from '../models/Device.js';
import { Customer } from '../models/Customer.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';
import { recordActivity } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import { objectId } from '../validators/authValidators.js';
import {
  createDeviceSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
} from '../validators/customerValidators.js';
import { resolveScope } from './customerController.js';

const SORTABLE = ['createdAt', 'brand', 'modelName', 'model'] as const;

/**
 * Translates the wire field `model` into the stored field `modelName`.
 *
 * Mongoose reserves `Document.model`, so the schema stores the device model as
 * `modelName`. Keeping the translation in one function means the rest of the
 * controller â€” and the API contract â€” can keep saying `model`.
 */
function toStorageFields(input: Record<string, unknown>): Record<string, unknown> {
  const { model, ...rest } = input as { model?: unknown };
  return model === undefined ? rest : { ...rest, modelName: model };
}

/**
 * The shape of `device.customer` after `.populate()`.
 *
 * Declaring it explicitly is what makes `device.customer.name` type-safe.
 * Relying on Mongoose's `document.populated(path)` accessor returned `undefined`
 * at runtime and silently dropped the owner from every list response.
 */
interface PopulatedCustomerRef {
  _id: { toString(): string };
  name: string;
  customerCode: string;
  phone: string;
  email?: string;
}

const CUSTOMER_SUMMARY = 'name customerCode phone email';

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/devices
 *
 * The unlock code is never included here: this endpoint feeds tables and device
 * pickers, and a screen full of customers' PINs would be a real leak. Only the
 * single-device endpoint opts in.
 */
export const listDevices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listDevicesQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, SORTABLE);

  const filter: Record<string, unknown> = { ...resolveScope(req.user, query.branch) };

  if (query.customer) filter.customer = query.customer;
  if (query.deviceType) filter.deviceType = query.deviceType;
  if (query.condition) filter.condition = query.condition;
  if (query.isActive) filter.isActive = query.isActive === 'true';

  if (query.search) {
    const term = escapeRegex(query.search);
    filter.$or = [
      { brand: new RegExp(term, 'i') },
      { modelName: new RegExp(term, 'i') },
      { serialNumber: new RegExp(term, 'i') },
      { imei: new RegExp(term, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Device.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate<{ customer: PopulatedCustomerRef | null }>('customer', CUSTOMER_SUMMARY),
    Device.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items.map((device) => {
      // `populate` replaces the ObjectId with the referenced document.
      const owner = device.customer as unknown as PopulatedCustomerRef | null;

      return {
        ...device.toPublicJSON(),
        customerName: owner?.name,
        customerCode: owner?.customerCode,
        customerPhone: owner?.phone,
      };
    }),
    meta: buildPagination(page, limit, total),
  });
});

/** GET /api/v1/devices/:id */
export const getDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const device = await Device.findOne({ _id: id, ...scope })
    // Unlock codes are `select: false`, so this single-device view opts in.
    .select('+unlockCode')
    .populate<{ customer: PopulatedCustomerRef | null }>('customer', CUSTOMER_SUMMARY);

  if (!device) throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');

  const owner = device.customer as unknown as PopulatedCustomerRef | null;

  res.status(200).json({
    success: true,
    data: {
      // Unlock code included only on this single-device view.
      device: device.toPublicJSON({ includeUnlockCode: true }),
      customer: owner
        ? {
            id: owner._id.toString(),
            name: owner.name,
            customerCode: owner.customerCode,
            phone: owner.phone,
            email: owner.email,
          }
        : null,
    },
  });
});

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

/** POST /api/v1/devices */
export const createDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const input = createDeviceSchema.parse(req.body);
  const scope = resolveScope(req.user);

  // The customer must be visible to this user â€” otherwise a device could be
  // attached to another branch's customer by guessing an id.
  const customer = await Customer.findOne({ _id: input.customer, ...scope });
  if (!customer) throw AppError.badRequest('That customer does not exist', 'CUSTOMER_NOT_FOUND');

  const device = await Device.create({
    ...toStorageFields(input),
    branch: customer.branch,
    createdBy: user._id,
  });

  // Registering a device counts as a visit.
  customer.lastVisitAt = new Date();
  await customer.save({ validateBeforeSave: false });

  void recordActivity({
    action: 'device.created',
    messageKey: 'activity.device.created',
    messageParams: { name: `${device.brand} ${device.modelName}` },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: device.branch,
    entityType: 'Device',
    entityId: device._id,
    entityLabel: `${device.brand} ${device.modelName}`,
    metadata: { customer: customer.name },
  });

  res.status(201).json({
    success: true,
    message: 'Device registered',
    data: { device: device.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

/** PATCH /api/v1/devices/:id */
export const updateDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const updates = updateDeviceSchema.parse(req.body);
  const storageUpdates = toStorageFields(updates);
  const scope = resolveScope(req.user);

  const device = await Device.findOneAndUpdate(
    { _id: id, ...scope },
    { $set: storageUpdates },
    { new: true, runValidators: true }
  );

  if (!device) throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');

  void recordActivity({
    action: 'device.updated',
    messageKey: 'activity.device.updated',
    messageParams: { name: `${device.brand} ${device.modelName}` },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: device.branch,
    entityType: 'Device',
    entityId: device._id,
    entityLabel: `${device.brand} ${device.modelName}`,
  });

  res.status(200).json({
    success: true,
    message: 'Device updated',
    data: { device: device.toPublicJSON() },
  });
});

/* -------------------------------------------------------------------------- */
/* Delete                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/v1/devices/:id
 *
 * Soft delete, for the same reason as customers: repair tickets and warranty
 * records reference the device and must keep resolving.
 */
export const deleteDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const device = await Device.findOneAndUpdate(
    { _id: id, ...scope },
    { $set: { isActive: false } },
    { new: true }
  );

  if (!device) throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');

  void recordActivity({
    action: 'device.deleted',
    messageKey: 'activity.device.deleted',
    messageParams: { name: `${device.brand} ${device.modelName}` },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: device.branch,
    entityType: 'Device',
    entityId: device._id,
    entityLabel: `${device.brand} ${device.modelName}`,
  });

  res.status(200).json({
    success: true,
    message: 'Device archived',
    data: { id: device._id.toString() },
  });
});


