import mongoose, { Document, Schema, Types } from 'mongoose';

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_LINE_TYPES = ['labor', 'part', 'other'] as const;
export type InvoiceLineType = (typeof INVOICE_LINE_TYPES)[number];

export interface InvoiceLine {
  type: InvoiceLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceJSON {
  id: string;
  number: string;
  repairTicket: string | null;
  repairCode: string | null;
  customer: string;
  branch: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  notes: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  number: string;
  repairTicket?: Types.ObjectId;
  repairCode?: string;
  customer: Types.ObjectId;
  branch: Types.ObjectId;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  issuedAt?: Date;
  voidedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): InvoiceJSON;
}

const lineSchema = new Schema<InvoiceLine>(
  {
    type: { type: String, enum: [...INVOICE_LINE_TYPES], required: true },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0.01, max: 100_000 },
    unitPrice: { type: Number, required: true, min: 0, max: 10_000_000 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    number: { type: String, required: true, unique: true, trim: true, index: true },
    repairTicket: {
      type: Schema.Types.ObjectId,
      ref: 'RepairTicket',
      index: true,
      sparse: true,
    },
    repairCode: { type: String, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    lines: { type: [lineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    balance: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: { values: [...INVOICE_STATUSES], message: 'Unknown invoice status: {VALUE}' },
      required: true,
      default: 'draft',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    issuedAt: { type: Date },
    voidedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceSchema.index(
  { repairTicket: 1 },
  {
    unique: true,
    partialFilterExpression: {
      repairTicket: { $type: 'objectId' },
      status: { $in: ['draft', 'issued', 'partially_paid', 'paid'] },
    },
  }
);
invoiceSchema.index({ branch: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

invoiceSchema.methods.toPublicJSON = function toPublicJSON(this: IInvoice): InvoiceJSON {
  return {
    id: this._id.toString(),
    number: this.number,
    repairTicket: this.repairTicket ? this.repairTicket.toString() : null,
    repairCode: this.repairCode ?? null,
    customer: this.customer.toString(),
    branch: this.branch.toString(),
    lines: this.lines.map((line) => ({
      type: line.type,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    subtotal: this.subtotal,
    tax: this.tax,
    discount: this.discount,
    total: this.total,
    amountPaid: this.amountPaid,
    balance: this.balance,
    status: this.status,
    notes: this.notes ?? null,
    issuedAt: this.issuedAt ? this.issuedAt.toISOString() : null,
    voidedAt: this.voidedAt ? this.voidedAt.toISOString() : null,
    createdBy: this.createdBy ? this.createdBy.toString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
