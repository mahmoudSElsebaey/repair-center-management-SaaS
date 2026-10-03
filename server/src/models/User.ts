import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, type Locale, type UserRole } from '../types/domain.js';

const BCRYPT_ROUNDS = 12;

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  avatar?: string;
  /** Branch the employee belongs to. Absent for super admins who see every branch. */
  branch?: Types.ObjectId;
  locale: Locale;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  locale: Locale;
  branch: string | null;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is invalid'],
    },
    phone: { type: String, trim: true, maxlength: 30 },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: { values: [...USER_ROLES], message: 'Unknown role: {VALUE}' },
      default: 'technician',
      index: true,
    },
    avatar: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    locale: { type: String, enum: ['ar', 'en'], default: 'ar' },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ branch: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

/** The shape safe to send to the client — never leaks tokens or hashes. */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar,
    locale: this.locale,
    branch: this.branch ? this.branch.toString() : null,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model<IUser>('User', userSchema);
