import mongoose from 'mongoose';
import type { Response } from 'express';
import { InventoryItem } from '../models/InventoryItem.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { Branch } from '../models/Branch.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateCode } from '../utils/codes.js';
import { buildPagination, escapeRegex, parsePagination, parseSort } from '../utils/pagination.js';
import { recordActivity, notifyRoles } from '../services/events.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  createInventoryItemSchema,
  createTransactionSchema,
  listInventoryQuerySchema,
  listTransactionsQuerySchema,
  updateInventoryItemSchema,
} from '../validators/inventoryValidators.js';
import { objectId } from '../validators/authValidators.js';
import type { InventoryTransactionType } from '../types/domain.js';

const SKU_PREFIX = 'PRT';
const SORTABLE = ['name', 'sku', 'quantityOnHand', 'createdAt'] as const;

function resolveScope(user: AuthRequest['user'], requested?: string) {
  if (!user) throw AppError.unauthorized();

  if (user.role === 'super_admin') {
    return requested ? { branch: new mongoose.Types.ObjectId(requested) } : {};
  }

  if (!user.branch) {
    throw AppError.forbidden('Your account is not linked to a branch', 'NO_BRANCH');
  }

  return { branch: new mongoose.Types.ObjectId(user.branch.toString()) };
}

async function allocateSku(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateCode(SKU_PREFIX, 6);
    const exists = await InventoryItem.exists({ sku: code });
    if (!exists) return code;
  }
  throw new AppError('Could not allocate a SKU — please retry', 503, 'CODE_ALLOCATION_FAILED');
}

/** Signed delta applied to on-hand for a given transaction type. */
function quantityDelta(
  type: InventoryTransactionType,
  quantity: number,
  direction?: 'in' | 'out'
): number {
  switch (type) {
    case 'purchase':
    case 'return':
      return quantity;
    case 'usage':
    case 'transfer':
      return -quantity;
    case 'adjustment':
      return direction === 'out' ? -quantity : quantity;
    default:
      return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

export const listInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query = listInventoryQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query, SORTABLE, 'name');
  const scope = resolveScope(req.user, query.branch);

  const filter: Record<string, unknown> = { ...scope };

  if (query.category) filter.category = query.category;
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;
  else if (!query.isActive) filter.isActive = true;

  if (query.lowStock === 'true') {
    filter.$expr = {
      $and: [{ $gt: ['$quantityOnHand', 0] }, { $lte: ['$quantityOnHand', '$minQuantity'] }],
    };
  }

  if (query.search) {
    const term = escapeRegex(query.search);
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { sku: new RegExp(term, 'i') },
      { brand: new RegExp(term, 'i') },
      { location: new RegExp(term, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort(sort).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: items.map((item) => item.toPublicJSON()),
    meta: buildPagination(page, limit, total),
  });
});

export const getInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const item = await InventoryItem.findOne({ _id: id, ...scope });
  if (!item) throw AppError.notFound('Inventory item not found', 'INVENTORY_NOT_FOUND');

  const recent = await InventoryTransaction.find({ item: item._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json({
    success: true,
    data: {
      item: item.toPublicJSON(),
      transactions: recent.map((row) => row.toPublicJSON()),
    },
  });
});

/* -------------------------------------------------------------------------- */
/* Create / Update / Archive                                                   */
/* -------------------------------------------------------------------------- */

export const createInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const input = createInventoryItemSchema.parse(req.body);

  const branchId = user.role === 'super_admin' ? input.branch : user.branch;
  if (!branchId) {
    throw AppError.badRequest('A branch is required to add inventory', 'BRANCH_REQUIRED');
  }

  const branch = await Branch.findById(branchId);
  if (!branch) throw AppError.badRequest('That branch does not exist', 'BRANCH_NOT_FOUND');

  const initialQty = input.quantityOnHand ?? 0;

  const item = await InventoryItem.create({
    name: input.name,
    category: input.category,
    brand: input.brand,
    unit: input.unit,
    quantityOnHand: initialQty,
    minQuantity: input.minQuantity,
    unitCost: input.unitCost,
    sellPrice: input.sellPrice,
    location: input.location,
    supplier: input.supplier,
    notes: input.notes,
    branch: branchId,
    sku: await allocateSku(),
    createdBy: user._id,
    isActive: true,
  });

  if (initialQty > 0) {
    await InventoryTransaction.create({
      item: item._id,
      branch: item.branch,
      type: 'purchase',
      quantity: initialQty,
      unitCost: item.unitCost,
      balanceAfter: initialQty,
      notes: 'Opening stock',
      performedBy: user._id,
      performedByName: user.name,
    });
  }

  void recordActivity({
    action: 'inventory.created',
    messageKey: 'activity.inventory.created',
    messageParams: { name: item.name, sku: item.sku },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: item.branch,
    entityType: 'InventoryItem',
    entityId: item._id,
    entityLabel: item.name,
  });

  res.status(201).json({
    success: true,
    message: 'Inventory item created',
    data: { item: item.toPublicJSON() },
  });
});

export const updateInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const updates = updateInventoryItemSchema.parse(req.body);
  const scope = resolveScope(req.user);

  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, ...scope },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!item) throw AppError.notFound('Inventory item not found', 'INVENTORY_NOT_FOUND');

  void recordActivity({
    action: 'inventory.updated',
    messageKey: 'activity.inventory.updated',
    messageParams: { name: item.name, sku: item.sku },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: item.branch,
    entityType: 'InventoryItem',
    entityId: item._id,
    entityLabel: item.name,
  });

  res.status(200).json({
    success: true,
    message: 'Inventory item updated',
    data: { item: item.toPublicJSON() },
  });
});

export const archiveInventoryItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const scope = resolveScope(req.user);

  const item = await InventoryItem.findOne({ _id: id, ...scope });
  if (!item) throw AppError.notFound('Inventory item not found', 'INVENTORY_NOT_FOUND');

  item.isActive = false;
  await item.save();

  void recordActivity({
    action: 'inventory.updated',
    messageKey: 'activity.inventory.updated',
    messageParams: { name: item.name, sku: item.sku },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: item.branch,
    entityType: 'InventoryItem',
    entityId: item._id,
    entityLabel: item.name,
    metadata: { archived: true },
  });

  res.status(200).json({
    success: true,
    message: 'Inventory item archived',
    data: { id: item._id.toString() },
  });
});

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export const recordTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const id = objectId.parse(req.params.id);
  const input = createTransactionSchema.parse(req.body);
  const scope = resolveScope(req.user);

  const item = await InventoryItem.findOne({ _id: id, ...scope });
  if (!item) throw AppError.notFound('Inventory item not found', 'INVENTORY_NOT_FOUND');
  if (!item.isActive) {
    throw AppError.badRequest('Cannot move stock on an archived item', 'ITEM_ARCHIVED');
  }

  const delta = quantityDelta(input.type, input.quantity, input.direction);
  const nextQty = item.quantityOnHand + delta;

  if (nextQty < 0) {
    throw AppError.badRequest(
      `Insufficient stock: on hand ${item.quantityOnHand}, requested ${input.quantity}`,
      'INSUFFICIENT_STOCK'
    );
  }

  item.quantityOnHand = nextQty;
  if (input.unitCost !== undefined && (input.type === 'purchase' || input.type === 'return')) {
    item.unitCost = input.unitCost;
  }
  await item.save();

  const txn = await InventoryTransaction.create({
    item: item._id,
    branch: item.branch,
    type: input.type,
    quantity: input.quantity,
    direction: input.type === 'adjustment' ? input.direction : undefined,
    unitCost: input.unitCost ?? item.unitCost,
    balanceAfter: nextQty,
    repairTicket: input.repairTicket,
    notes: input.notes,
    performedBy: user._id,
    performedByName: user.name,
  });

  const action = input.type === 'usage' ? 'inventory.consumed' : 'inventory.updated';

  void recordActivity({
    action,
    messageKey:
      input.type === 'usage' ? 'activity.inventory.consumed' : 'activity.inventory.updated',
    messageParams: {
      name: item.name,
      sku: item.sku,
      quantity: input.quantity,
      type: input.type,
    },
    actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
    branch: item.branch,
    entityType: 'InventoryItem',
    entityId: item._id,
    entityLabel: item.name,
  });

  if (nextQty > 0 && nextQty <= item.minQuantity) {
    void notifyRoles(['inventory_manager', 'manager', 'admin'], {
      type: 'low_stock',
      severity: 'warning',
      titleKey: 'notifications.lowStock.title',
      bodyKey: 'notifications.lowStock.body',
      params: { name: item.name, sku: item.sku, quantity: nextQty, min: item.minQuantity },
      link: '/app/inventory',
      entityType: 'InventoryItem',
      entityId: item._id,
    });

    void recordActivity({
      action: 'inventory.low_stock',
      messageKey: 'activity.inventory.lowStock',
      messageParams: { name: item.name, sku: item.sku, quantity: nextQty },
      actor: { id: user._id, name: user.name, role: user.role, branch: user.branch },
      branch: item.branch,
      entityType: 'InventoryItem',
      entityId: item._id,
      entityLabel: item.name,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Stock movement recorded',
    data: {
      item: item.toPublicJSON(),
      transaction: txn.toPublicJSON(),
    },
  });
});

export const listTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = objectId.parse(req.params.id);
  const query = listTransactionsQuerySchema.parse(req.query);
  const { page, limit, skip } = parsePagination(req.query);
  const scope = resolveScope(req.user);

  const item = await InventoryItem.findOne({ _id: id, ...scope }).select('_id');
  if (!item) throw AppError.notFound('Inventory item not found', 'INVENTORY_NOT_FOUND');

  const filter: Record<string, unknown> = { item: item._id };
  if (query.type) filter.type = query.type;

  const [rows, total] = await Promise.all([
    InventoryTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: rows.map((row) => row.toPublicJSON()),
    meta: buildPagination(page, limit, total),
  });
});

export const lowStockSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const scope = resolveScope(req.user);

  const filter: Record<string, unknown> = {
    ...scope,
    isActive: true,
    $expr: { $lte: ['$quantityOnHand', '$minQuantity'] },
  };

  const items = await InventoryItem.find(filter).sort({ quantityOnHand: 1 }).limit(50);

  res.status(200).json({
    success: true,
    data: items.map((item) => item.toPublicJSON()),
  });
});
