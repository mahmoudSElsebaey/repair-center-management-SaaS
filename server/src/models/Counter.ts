import mongoose, { Schema } from 'mongoose';

/**
 * A monotonic counter, used to allocate document numbers.
 *
 * Ticket codes are printed on receipts and read aloud by customers, so they must
 * be short, sequential and gap-free rather than random. `findOneAndUpdate` with
 * `$inc` is atomic in MongoDB, which means two concurrent intakes can never be
 * handed the same number — the property a random code gets for free and a
 * sequential one has to be engineered.
 *
 * The counter is keyed by a string name (`repair_ticket_2026`, later
 * `invoice_2026`) rather than an ObjectId, so this interface is declared as plain
 * data instead of extending Mongoose's `Document`, whose `_id` is an ObjectId.
 */

export interface ICounter {
  _id: string;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Reserves the next value in a named sequence.
 *
 * `upsert: true` means the first call for a new key creates it at 1 without a
 * separate existence check, and `new: true` returns the post-increment value.
 */
export async function nextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean<ICounter | null>();

  return counter?.sequence ?? 1;
}

/** Reserves the next ticket number for a given year. */
export function nextTicketSequence(year: number): Promise<number> {
  return nextSequence(`repair_ticket_${year}`);
}
