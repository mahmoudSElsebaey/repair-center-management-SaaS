import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBranch extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  city?: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, 'Branch code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 12,
    },
    city: { type: String, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 240 },
    phone: { type: String, trim: true, maxlength: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ isActive: 1, name: 1 });

export const Branch = mongoose.model<IBranch>('Branch', branchSchema);
