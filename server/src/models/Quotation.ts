import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  QUOTATION_LINE_TYPES,
  QUOTATION_STATUSES,
  type QuotationLineType,
  type QuotationStatus,
} from '../types/domain.js';

/**
 * A quotation is 1:1 with a repair ticket.
 *
 * Line items describe labour, parts and any other chargeable work. The ticket
 * cannot advance past `waiting_customer` into repair without an **approved**
 * quotation — the workflow reads `ticket.customerApproved`, which is set only
 * when a quotation is decided here.
 *
 * Stock is not reserved at quotation time; consumption still happens through
 * InventoryTransaction when parts are used on the bench (Phase 06).
 */

export interface IQuotationLine {
  type: QuotationLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  inventoryItem?: Types.ObjectId;
  lineTotal: number;
}

export interface IQuotation extends Document {
  _id: Types.ObjectId;
  code: string;
  repairTicket: Types.ObjectId;
  branch: Types.ObjectId;
  customer: Types.ObjectId;
  lines: IQuotationLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  notes?: string;
  validUntil?: Date;
  sentAt?: Date;
  decidedAt?: Date;
  decidedBy?: Types.ObjectId;
  rejectionReason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): QuotationJSON;
}

export interface QuotationJSON {
  id: string;
  code: string;
  repairTicket: string;
  branch: string;
  customer: string;
  lines: Array<{
    type: QuotationLineType;
    description: string;
    quantity: number;
    unitPrice: number;
    inventoryItem: string | null;
    lineTotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  notes?: string;
  validUntil?: Date;
  sentAt?: Date;
  decidedAt?: Date;
  decidedBy: string | null;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quotationLineSchema = new Schema<IQuotationLine>(
  {
    type: { type: String, enum: QUOTATION_LINE_TYPES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const quotationSchema = new Schema<IQuotation>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    repairTicket: {
      type: Schema.Types.ObjectId,
      ref: 'RepairTicket',
      required: true,
      unique: true,
      index: true,
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    lines: {
      type: [quotationLineSchema],
      validate: {
        validator: (v: IQuotationLine[]) => Array.isArray(v) && v.length >= 1 && v.length <= 40,
        message: 'A quotation needs between 1 and 40 lines',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    validUntil: { type: Date },
    sentAt: { type: Date },
    decidedAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

quotationSchema.methods.toPublicJSON = function toPublicJSON(this: IQuotation): QuotationJSON {
  return {
    id: this._id.toString(),
    code: this.code,
    repairTicket: this.repairTicket.toString(),
    branch: this.branch.toString(),
    customer: this.customer.toString(),
    lines: this.lines.map((line) => ({
      type: line.type,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      inventoryItem: line.inventoryItem ? line.inventoryItem.toString() : null,
      lineTotal: line.lineTotal,
    })),
    subtotal: this.subtotal,
    tax: this.tax,
    total: this.total,
    status: this.status,
    notes: this.notes,
    validUntil: this.validUntil,
    sentAt: this.sentAt,
    decidedAt: this.decidedAt,
    decidedBy: this.decidedBy ? this.decidedBy.toString() : null,
    rejectionReason: this.rejectionReason,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Quotation = mongoose.model<IQuotation>('Quotation', quotationSchema);
