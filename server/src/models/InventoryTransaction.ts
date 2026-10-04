import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  INVENTORY_TRANSACTION_TYPES,
  type InventoryTransactionType,
} from '../types/domain.js';

/**
 * Ledger row for every stock movement.
 *
 * Quantity is always positive. Direction is determined by `type`:
 *   purchase / return  → increase on-hand
 *   usage              → decrease on-hand
 *   adjustment         → signed via `direction` ('in' | 'out')
 *   transfer           → decrease at source (Phase 06 records outbound only)
 *
 * Writing a transaction and updating InventoryItem.quantityOnHand must happen
 * in the same request so the shelf count never drifts from the ledger.
 */

export interface IInventoryTransaction extends Document {
  _id: Types.ObjectId;
  item: Types.ObjectId;
  branch: Types.ObjectId;
  type: InventoryTransactionType;
  /** Always positive. Sign is implied by type / direction. */
  quantity: number;
  /** For adjustments: which way the quantity moves. */
  direction?: 'in' | 'out';
  unitCost?: number;
  /** On-hand after this movement was applied. */
  balanceAfter: number;
  /** Optional link to a repair ticket that consumed the part. */
  repairTicket?: Types.ObjectId;
  notes?: string;
  performedBy?: Types.ObjectId;
  performedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): InventoryTransactionJSON;
}

export interface InventoryTransactionJSON {
  id: string;
  item: string;
  branch: string;
  type: InventoryTransactionType;
  quantity: number;
  direction?: 'in' | 'out';
  unitCost?: number;
  balanceAfter: number;
  repairTicket?: string;
  notes?: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: {
      type: String,
      enum: INVENTORY_TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.001, 'Quantity must be positive'],
    },
    direction: { type: String, enum: ['in', 'out'] },
    unitCost: { type: Number, min: 0 },
    balanceAfter: { type: Number, required: true },
    repairTicket: { type: Schema.Types.ObjectId, ref: 'RepairTicket' },
    notes: { type: String, trim: true, maxlength: 1000 },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, trim: true },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ item: 1, createdAt: -1 });
inventoryTransactionSchema.index({ branch: 1, createdAt: -1 });

inventoryTransactionSchema.methods.toPublicJSON = function (): InventoryTransactionJSON {
  return {
    id: this._id.toString(),
    item: this.item.toString(),
    branch: this.branch.toString(),
    type: this.type,
    quantity: this.quantity,
    direction: this.direction,
    unitCost: this.unitCost,
    balanceAfter: this.balanceAfter,
    repairTicket: this.repairTicket?.toString(),
    notes: this.notes,
    performedBy: this.performedBy?.toString(),
    performedByName: this.performedByName,
    createdAt: this.createdAt,
  };
};

export const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema
);
