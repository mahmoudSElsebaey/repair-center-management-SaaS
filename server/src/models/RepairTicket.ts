import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  REPAIR_PRIORITIES,
  REPAIR_STATUSES,
  type RepairPriority,
  type RepairStatus,
} from '../types/domain.js';
import { TERMINAL_STATUSES } from '../domain/repairWorkflow.js';

/**
 * A repair ticket.
 *
 * This is the core record of the product: it links a customer's device to the
 * work performed on it, the money agreed and charged, and the history of who
 * moved it and when. Everything else — inventory consumption, quotations,
 * invoices, warranty — hangs off this document in later phases.
 */

export interface IStatusHistoryEntry {
  from: RepairStatus | null;
  to: RepairStatus;
  at: Date;
  by?: Types.ObjectId;
  byName?: string;
  byRole?: string;
  note?: string;
}

export interface IRepairTicket extends Document {
  _id: Types.ObjectId;
  /** Human-facing code, e.g. `RF-2026-00421`. Unique and printed on the receipt. */
  code: string;
  customer: Types.ObjectId;
  device: Types.ObjectId;
  branch: Types.ObjectId;
  technician?: Types.ObjectId;

  status: RepairStatus;
  priority: RepairPriority;

  /** The fault as the customer described it at intake. */
  issue: string;
  /** The technician's findings. Required before a quotation can be sent. */
  diagnosis?: string;

  estimatedCost?: number;
  finalCost?: number;

  /** Recorded when the customer accepts or rejects the quotation. */
  customerApproved?: boolean;
  customerApprovedAt?: Date;
  customerRejectionReason?: string;

  notes?: string;
  /** Cloudinary URLs for intake photos and repair documentation. */
  attachments: Array<{ url: string; publicId?: string; caption?: string }>;

  expectedCompletionAt?: Date;
  completedAt?: Date;
  /** Set when the ticket is delivered. Drives the warranty clock in Phase 08. */
  deliveredAt?: Date;
  warrantyDays: number;

  statusHistory: IStatusHistoryEntry[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): RepairTicketJSON;
}

export interface RepairTicketJSON {
  id: string;
  code: string;
  customer: string;
  device: string;
  branch: string;
  technician: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  issue: string;
  diagnosis?: string;
  estimatedCost?: number;
  finalCost?: number;
  customerApproved?: boolean;
  customerApprovedAt?: Date;
  customerRejectionReason?: string;
  notes?: string;
  attachments: Array<{ url: string; publicId?: string; caption?: string }>;
  expectedCompletionAt?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  warrantyDays: number;
  isOpen: boolean;
  statusHistory: Array<{
    from: RepairStatus | null;
    to: RepairStatus;
    at: Date;
    byName?: string;
    byRole?: string;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    byRole: String,
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const repairTicketSchema = new Schema<IRepairTicket>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    technician: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    status: {
      type: String,
      enum: { values: [...REPAIR_STATUSES], message: 'Unknown status: {VALUE}' },
      default: 'received',
      index: true,
    },
    priority: {
      type: String,
      enum: { values: [...REPAIR_PRIORITIES], message: 'Unknown priority: {VALUE}' },
      default: 'normal',
      index: true,
    },

    issue: {
      type: String,
      required: [true, 'The reported issue is required'],
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    diagnosis: { type: String, trim: true, maxlength: 2000 },

    estimatedCost: { type: Number, min: 0, max: 10_000_000 },
    finalCost: { type: Number, min: 0, max: 10_000_000 },

    customerApproved: { type: Boolean, default: undefined },
    customerApprovedAt: Date,
    customerRejectionReason: { type: String, trim: true, maxlength: 500 },

    notes: { type: String, trim: true, maxlength: 2000 },
    attachments: {
      type: [
        {
          _id: false,
          url: { type: String, required: true, trim: true },
          publicId: { type: String, trim: true },
          caption: { type: String, trim: true, maxlength: 200 },
        },
      ],
      default: [],
    },

    expectedCompletionAt: Date,
    completedAt: Date,
    deliveredAt: Date,
    warrantyDays: { type: Number, default: 90, min: 0, max: 3650 },

    statusHistory: { type: [statusHistorySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// The worklist is "open tickets at my branch, most urgent first"; the second
// index serves "what is on this technician's bench".
repairTicketSchema.index({ branch: 1, status: 1, priority: -1, createdAt: -1 });
repairTicketSchema.index({ technician: 1, status: 1 });
repairTicketSchema.index({ customer: 1, createdAt: -1 });
repairTicketSchema.index({ device: 1, createdAt: -1 });

repairTicketSchema.methods.toPublicJSON = function (): RepairTicketJSON {
  return {
    id: this._id.toString(),
    code: this.code,
    customer: this.customer.toString(),
    device: this.device.toString(),
    branch: this.branch.toString(),
    technician: this.technician ? this.technician.toString() : null,
    status: this.status,
    priority: this.priority,
    issue: this.issue,
    diagnosis: this.diagnosis,
    estimatedCost: this.estimatedCost,
    finalCost: this.finalCost,
    customerApproved: this.customerApproved,
    customerApprovedAt: this.customerApprovedAt,
    customerRejectionReason: this.customerRejectionReason,
    notes: this.notes,
    attachments: this.attachments ?? [],
    expectedCompletionAt: this.expectedCompletionAt,
    completedAt: this.completedAt,
    deliveredAt: this.deliveredAt,
    warrantyDays: this.warrantyDays,
    isOpen: !TERMINAL_STATUSES.includes(this.status),
    statusHistory: (this.statusHistory ?? []).map((entry: IStatusHistoryEntry) => ({
      from: entry.from,
      to: entry.to,
      at: entry.at,
      byName: entry.byName,
      byRole: entry.byRole,
      note: entry.note,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const RepairTicket = mongoose.model<IRepairTicket>('RepairTicket', repairTicketSchema);
