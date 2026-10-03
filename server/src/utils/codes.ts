/**
 * Human-readable, locale-aware ticket codes: RF-<year>-<5 digits>
 * Example: RF-2026-00421
 */
export const TICKET_CODE_PREFIX = 'RF';

export function formatTicketCode(sequence: number, year = new Date().getFullYear()): string {
  return `${TICKET_CODE_PREFIX}-${year}-${String(sequence).padStart(5, '0')}`;
}

export function parseTicketCode(code: string): { year: number; sequence: number } | null {
  const match = /^RF-(\d{4})-(\d{1,6})$/i.exec(code.trim());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short, unambiguous code for entities such as customers and parts. */
export function generateCode(prefix: string, length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${out}`;
}
