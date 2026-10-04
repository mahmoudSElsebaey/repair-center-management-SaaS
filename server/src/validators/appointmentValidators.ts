import { z } from 'zod';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
} from '../models/Appointment.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createAppointmentSchema = z
  .object({
    customerId: objectId,
    technicianId: objectId.optional().nullable(),
    repairTicketId: objectId.optional().nullable(),
    title: z.string().trim().min(2).max(200),
    type: z.enum(APPOINTMENT_TYPES).optional(),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
    endsAt: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(['scheduled', 'confirmed']).optional(),
  })
  .refine(
    (data) => {
      if (data.endsAt) return data.endsAt > data.startsAt;
      return true;
    },
    { message: 'End time must be after start time', path: ['endsAt'] }
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z
  .object({
    customerId: objectId.optional(),
    technicianId: objectId.optional().nullable(),
    repairTicketId: objectId.optional().nullable(),
    title: z.string().trim().min(2).max(200).optional(),
    type: z.enum(APPOINTMENT_TYPES).optional(),
    startsAt: z.coerce.date().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
    endsAt: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  type: z.enum(APPOINTMENT_TYPES).optional(),
  customerId: objectId.optional(),
  technicianId: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.string().optional(),
});

export const calendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  technicianId: objectId.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
});

export const conflictQuerySchema = z.object({
  technicianId: objectId,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  excludeId: objectId.optional(),
});
