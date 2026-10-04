import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * A spare part or consumable held in a branch stockroom.
 *
 * Quantity on hand is never edited directly by a client. Every change goes
 * through an InventoryTransaction so the ledger is the source of truth and a
 * repair that consumed a part can always be traced back to a movement.
 */

export const INVENTORY_CATEGORIES = [
  'screen',
  'battery',
  'cable',
  'connector',
  'board',
  'tool',
  'adhesive',
  'case',
  'other',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export interface IInventoryItem extends Document {
  _id: Types.ObjectId;
  /** Human-facing SKU, e.g. PRT-A3K9X2. Generated once, never changed. */
  sku: string;
  name: string;
  category: InventoryCategory;
  brand?: string;
  /** Unit of measure shown on pick lists (pcs, set, syringe, …). */
  unit: string;
  quantityOnHand: number;
  /** When on-hand falls to or below this, the item is flagged low-stock. */
  minQuantity: number;
  unitCost: number;
  sellPrice: number;
  /** Bin / shelf label inside the branch. */
  location?: string;
  supplier?: string;
  notes?: string;
  branch: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): InventoryItemJSON;
}

export interface InventoryItemJSON {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  brand?: string;
  unit: string;
  quantityOnHand: number;
  minQuantity: number;
  unitCost: number;
  sellPrice: number;
  location?: string;
  supplier?: string;
  notes?: string;
  branch: string;
  isActive: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    category: {
      type: String,
      enum: INVENTORY_CATEGORIES,
      required: true,
      index: true,
    },
    brand: { type: String, trim: true, maxlength: 80 },
    unit: { type: String, trim: true, maxlength: 30, default: 'pcs' },
    quantityOnHand: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: [0, 'Minimum quantity cannot be negative'],
      default: 2,
    },
    unitCost: {
      type: Number,
      required: true,
      min: [0, 'Unit cost cannot be negative'],
      default: 0,
    },
    sellPrice: {
      type: Number,
      required: true,
      min: [0, 'Sell price cannot be negative'],
      default: 0,
    },
    location: { type: String, trim: true, maxlength: 60 },
    supplier: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 2000 },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ name: 'text', sku: 'text', brand: 'text' });
inventoryItemSchema.index({ branch: 1, isActive: 1, category: 1 });
inventoryItemSchema.index({ branch: 1, quantityOnHand: 1, minQuantity: 1 });

inventoryItemSchema.methods.toPublicJSON = function (): InventoryItemJSON {
  const qty = this.quantityOnHand;
  const min = this.minQuantity;
  return {
    id: this._id.toString(),
    sku: this.sku,
    name: this.name,
    category: this.category,
    brand: this.brand,
    unit: this.unit,
    quantityOnHand: qty,
    minQuantity: min,
    unitCost: this.unitCost,
    sellPrice: this.sellPrice,
    location: this.location,
    supplier: this.supplier,
    notes: this.notes,
    branch: this.branch.toString(),
    isActive: this.isActive,
    isLowStock: qty > 0 && qty <= min,
    isOutOfStock: qty <= 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
