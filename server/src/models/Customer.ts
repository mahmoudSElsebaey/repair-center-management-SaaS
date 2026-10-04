import mongoose, { Document, Schema, Types } from 'mongoose';
import type { Locale } from '../types/domain.js';

/**
 * A customer of the repair centre.
 *
 * `customerCode` is the human-facing identifier printed on receipts and used at
 * the counter, so a walk-in can be found without spelling a name. It is
 * generated on first save and never changes.
 */

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  /**
   * Human-facing identifier used at the counter and printed on receipts, in the
   * form `CUS-XXXXXX`. Generated once on creation and never changed.
   */
  customerCode: string;
  name: string;
  phone: string;
  /** Optional second number — common in Egypt, and often the one that answers. */
  phoneAlt?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  preferredLanguage: Locale;
  branch: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): CustomerJSON;
}

export interface CustomerJSON {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  preferredLanguage: Locale;
  branch: string;
  isActive: boolean;
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    // Stored as entered so staff can dial it back verbatim; searching strips
    // formatting so "+20 100 552 3311" and "01005523311" both match.
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 30,
    },
    phoneAlt: { type: String, trim: true, maxlength: 30 },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      maxlength: 160,
    },
    city: { type: String, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 2000 },
    preferredLanguage: { type: String, enum: ['ar', 'en'], default: 'ar' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastVisitAt: Date,
  },
  { timestamps: true }
);

// The counter searches by name and phone; both are hit constantly.
customerSchema.index({ name: 'text', phone: 'text' });
customerSchema.index({ branch: 1, isActive: 1, createdAt: -1 });
customerSchema.index({ phone: 1 });

customerSchema.methods.toPublicJSON = function (): CustomerJSON {
  return {
    id: this._id.toString(),
    customerCode: this.customerCode,
    name: this.name,
    phone: this.phone,
    phoneAlt: this.phoneAlt,
    email: this.email,
    city: this.city,
    address: this.address,
    notes: this.notes,
    preferredLanguage: this.preferredLanguage,
    branch: this.branch.toString(),
    isActive: this.isActive,
    lastVisitAt: this.lastVisitAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
