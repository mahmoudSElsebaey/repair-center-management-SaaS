import type { RepairStatus } from '@/types/domain';

/** Public tracking payload — intentionally limited fields (no costs, PII beyond name). */
export interface PublicTrackDevice {
  brand: string | null;
  modelName: string | null;
  deviceType: string | null;
  color: string | null;
}

export interface PublicTrackBranch {
  name: string | null;
  city: string | null;
  phone: string | null;
}

export interface PublicTrackCustomer {
  name: string | null;
  preferredLanguage: string | null;
}

export interface PublicTrackHistoryEntry {
  to: RepairStatus;
  at: string;
}

export interface PublicTrackData {
  code: string;
  status: RepairStatus;
  isOpen: boolean;
  issue: string;
  expectedCompletionAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  warrantyDays: number | null;
  updatedAt: string;
  createdAt: string;
  statusHistory: PublicTrackHistoryEntry[];
  device: PublicTrackDevice | null;
  branch: PublicTrackBranch | null;
  customer: PublicTrackCustomer | null;
}
