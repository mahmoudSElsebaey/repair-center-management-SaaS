import mongoose, { Document, Schema, Types } from 'mongoose';
import { DEVICE_TYPES, type DeviceType } from '../types/domain.js';

/**
 * A physical device brought in for repair.
 *
 * A device belongs to a customer and may accumulate many repair tickets over its
 * lifetime — that history is the reason to model the device separately from the
 * ticket rather than embedding its details in each one.
 */

export const DEVICE_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;
export type DeviceCondition = (typeof DEVICE_CONDITIONS)[number];

export interface IDeviceImage {
  url: string;
  publicId?: string;
  caption?: string;
}

export interface IDevice extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  branch: Types.ObjectId;
  deviceType: DeviceType;
  brand: string;
  /**
   * The device model, e.g. "Galaxy S24 Ultra".
   *
   * Stored under `modelName` rather than `model` because Mongoose reserves
   * `Document.model` for the registered-model accessor, and declaring it here
   * would shadow that method with an incompatible type. The API still exposes
   * `model`, so the wire contract reads naturally.
   */
  modelName: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition: DeviceCondition;
  accessories: string[];
  reportedIssue: string;
  /** Pattern or PIN needed to test the device. Sensitive — excluded from lists. */
  unlockCode?: string;
  images: IDeviceImage[];
  notes?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(options?: { includeUnlockCode?: boolean }): DeviceJSON;
}

export interface DeviceJSON {
  id: string;
  customer: string;
  branch: string;
  deviceType: DeviceType;
  brand: string;
  /** The device model. Exposed under its natural name; see `IDevice.modelName`. */
  model: string;
  /** Human label used in lists and ticket headers. */
  displayName: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition: DeviceCondition;
  accessories: string[];
  reportedIssue: string;
  unlockCode?: string;
  images: IDeviceImage[];
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    deviceType: {
      type: String,
      enum: { values: [...DEVICE_TYPES], message: 'Unknown device type: {VALUE}' },
      required: true,
      index: true,
    },
    brand: { type: String, required: [true, 'Brand is required'], trim: true, maxlength: 60 },
    modelName: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
      maxlength: 120,
    },
    serialNumber: { type: String, trim: true, maxlength: 80 },
    imei: { type: String, trim: true, maxlength: 40 },
    color: { type: String, trim: true, maxlength: 40 },
    condition: {
      type: String,
      enum: [...DEVICE_CONDITIONS],
      default: 'good',
    },
    accessories: { type: [String], default: [] },
    reportedIssue: {
      type: String,
      required: [true, 'Reported issue is required'],
      trim: true,
      maxlength: 2000,
    },
    // `select: false` keeps unlock codes out of every list response by default;
    // the detail endpoint opts in explicitly.
    unlockCode: { type: String, trim: true, maxlength: 60, select: false },
    images: {
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
    notes: { type: String, trim: true, maxlength: 2000 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// A device is looked up by its owner, and by serial/IMEI when a customer brings
// the same unit back without the original paperwork.
deviceSchema.index({ customer: 1, createdAt: -1 });
deviceSchema.index({ branch: 1, deviceType: 1 });
deviceSchema.index({ serialNumber: 1 }, { sparse: true });
deviceSchema.index({ imei: 1 }, { sparse: true });

/** `Samsung Galaxy S24 Ultra` — computed rather than stored, so it never drifts. */
deviceSchema.virtual('displayName').get(function (this: IDevice) {
  return `${this.brand} ${this.modelName}`.trim();
});

deviceSchema.methods.toPublicJSON = function (options?: {
  includeUnlockCode?: boolean;
}): DeviceJSON {
  return {
    id: this._id.toString(),
    customer: this.customer.toString(),
    branch: this.branch.toString(),
    deviceType: this.deviceType,
    brand: this.brand,
    // Exposed as `model` on the wire; stored as `modelName` (see IDevice).
    model: this.modelName,
    displayName: `${this.brand} ${this.modelName}`.trim(),
    serialNumber: this.serialNumber,
    imei: this.imei,
    color: this.color,
    condition: this.condition,
    accessories: this.accessories ?? [],
    reportedIssue: this.reportedIssue,
    // Only present when explicitly requested, and only the detail endpoint does.
    ...(options?.includeUnlockCode && this.unlockCode ? { unlockCode: this.unlockCode } : {}),
    images: this.images ?? [],
    notes: this.notes,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
