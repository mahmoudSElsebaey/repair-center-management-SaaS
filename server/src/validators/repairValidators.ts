import { z } from 'zod';
import { objectId } from './authValidators.js';
import { REPAIR_PRIORITIES, REPAIR_STATUSES } from '../types/domain.js';

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

export const createRepairSchema = z.object({
  /**
   * A ticket may be opened either from an existing device or by supplying a
   * customer, in which case the device must already belong to them. The
   * controller verifies that relationship rather than trusting this payload.
   */
  device: objectId,
  priority: z.enum(REPAIR_PRIORITIES).default('normal'),
  /** Defaults to the device's recorded fault, which is what the counter hears. */
  issue: z
    .string()
    .trim()
    .min(5, 'Describe the issue in at least 5 characters')
    .max(2000)
    .optional(),
  technician: objectId.optional(),
  expectedCompletionAt: z.coerce.date().optional(),
  estimatedCost: z.coerce.number().min(0).max(10_000_000).optional(),
  warrantyDays: z.coerce.number().int().min(0).max(3650).default(90),
  notes: z.string().trim().max(2000).optional(),
});

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

export const updateRepairSchema = z
  .object({
    priority: z.enum(REPAIR_PRIORITIES).optional(),
    issue: z.string().trim().min(5).max(2000).optional(),
    diagnosis: z.string().trim().max(2000).optional(),
    estimatedCost: z.coerce.number().min(0).max(10_000_000).optional(),
    finalCost: z.coerce.number().min(0).max(10_000_000).optional(),
    technician: objectId.nullable().optional(),
    expectedCompletionAt: z.coerce.date().nullable().optional(),
    warrantyDays: z.coerce.number().int().min(0).max(3650).optional(),
    notes: z.string().trim().max(2000).optional(),
    attachments: z
      .array(
        z.object({
          url: z.string().trim().url('Attachment URL is invalid'),
          publicId: z.string().trim().max(200).optional(),
          caption: z.string().trim().max(200).optional(),
        })
      )
      .max(12)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

/* -------------------------------------------------------------------------- */
/* Status transition                                                           */
/* -------------------------------------------------------------------------- */

export const changeStatusSchema = z.object({
  status: z.enum(REPAIR_STATUSES, {
    required_error: 'Choose the new status',
    invalid_type_error: 'That status does not exist',
  }),
  /** Free-text note stored on the history entry. */
  note: z.string().trim().max(500).optional(),
  /** Required when recording a customer decision. */
  customerApproved: z.boolean().optional(),
  customerRejectionReason: z.string().trim().max(500).optional(),
});

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

export const listRepairsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(REPAIR_STATUSES).optional(),
  state: z.enum(['open', 'closed', 'active']).optional(),
  priority: z.enum(REPAIR_PRIORITIES).optional(),
  technician: objectId.optional(),
  customer: objectId.optional(),
  device: objectId.optional(),
  branch: objectId.optional(),
  /**
   * `mine=true` narrows the list to the signed-in user's own tickets.
   *
   * There is deliberately no `mine=false`: technicians are scoped to their own
   * bench by default, and a flag that appeared to widen that scope but did not
   * would be worse than no flag.
   */
  mine: z.enum(['true', 'false']).optional(),
  /** `unassigned=true` finds tickets nobody has picked up yet. */
  unassigned: z.enum(['true', 'false']).optional(),
  sort: z
    .enum(['createdAt', '-createdAt', 'priority', '-priority', 'code', '-code', 'status', '-status'])
    .optional(),
});

export type CreateRepairInput = z.infer<typeof createRepairSchema>;
export type UpdateRepairInput = z.infer<typeof updateRepairSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
