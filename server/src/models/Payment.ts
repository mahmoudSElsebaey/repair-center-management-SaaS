import mongoose, { Document, Schema, Types } from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentJSON {
  id: string;
  invoice: string;
  invoiceNumber: string | null;
  branch: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  recordedBy: string | null;
  recordedByName: string | null;
  createdAt: string;
}

export interface IPayment extends Document {
  _id: Types.ObjectId;
  invoice: Types.ObjectId;
  invoiceNumber?: string;
  branch: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: Date;
  recordedBy?: Types.ObjectId;
  recordedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): PaymentJSON;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    invoiceNumber: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01, max: 10_000_000 },
    method: {
      type: String,
      enum: { values: [...PAYMENT_METHODS], message: 'Unknown payment method: {VALUE}' },
      required: true,
    },
    reference: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 500 },
    paidAt: { type: Date, required: true, default: () => new Date() },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ branch: 1, paidAt: -1 });
paymentSchema.index({ invoice: 1, paidAt: -1 });

paymentSchema.methods.toPublicJSON = function toPublicJSON(this: IPayment): PaymentJSON {
  return {
    id: this._id.toString(),
    invoice: this.invoice.toString(),
    invoiceNumber: this.invoiceNumber ?? null,
    branch: this.branch.toString(),
    amount: this.amount,
    method: this.method,
    reference: this.reference ?? null,
    notes: this.notes ?? null,
    paidAt: this.paidAt.toISOString(),
    recordedBy: this.recordedBy ? this.recordedBy.toString() : null,
    recordedByName: this.recordedByName ?? null,
    createdAt: this.createdAt.toISOString(),
  };
};

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
