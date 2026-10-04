import mongoose, { Document, Schema, Types } from 'mongoose';

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  'walk_in',
  'drop_off',
  'pickup',
  'consultation',
  'other',
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

/** Statuses that still occupy a slot for conflict detection. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
];

export interface AppointmentJSON {
  id: string;
  customer: string;
  branch: string;
  technician: string | null;
  repairTicket: string | null;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  branch: Types.ObjectId;
  technician?: Types.ObjectId;
  repairTicket?: Types.ObjectId;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): AppointmentJSON;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    technician: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    repairTicket: { type: Schema.Types.ObjectId, ref: 'RepairTicket', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: {
      type: String,
      enum: { values: [...APPOINTMENT_TYPES], message: 'Unknown appointment type: {VALUE}' },
      required: true,
      default: 'consultation',
    },
    status: {
      type: String,
      enum: { values: [...APPOINTMENT_STATUSES], message: 'Unknown appointment status: {VALUE}' },
      required: true,
      default: 'scheduled',
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },
    notes: { type: String, trim: true, maxlength: 1000 },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

appointmentSchema.index({ branch: 1, startsAt: 1 });
appointmentSchema.index({ technician: 1, startsAt: 1, endsAt: 1 });
appointmentSchema.index({ status: 1, startsAt: 1 });

appointmentSchema.methods.toPublicJSON = function toPublicJSON(this: IAppointment): AppointmentJSON {
  return {
    id: this._id.toString(),
    customer: this.customer.toString(),
    branch: this.branch.toString(),
    technician: this.technician ? this.technician.toString() : null,
    repairTicket: this.repairTicket ? this.repairTicket.toString() : null,
    title: this.title,
    type: this.type,
    status: this.status,
    startsAt: this.startsAt.toISOString(),
    endsAt: this.endsAt.toISOString(),
    durationMinutes: this.durationMinutes,
    notes: this.notes ?? null,
    cancelReason: this.cancelReason ?? null,
    cancelledAt: this.cancelledAt ? this.cancelledAt.toISOString() : null,
    completedAt: this.completedAt ? this.completedAt.toISOString() : null,
    createdBy: this.createdBy ? this.createdBy.toString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
