import type { RepairPriority, RepairStatus } from '@/types/domain';
import type { DeviceCondition } from '@/features/customers/types';

export type { RepairPriority, RepairStatus };

/**
 * Repair-ticket vocabulary, mirrored from the server.
 *
 * `availableActions` is computed by the server from the same workflow table that
 * validates the request, so the buttons this client renders and the moves the
 * server accepts are guaranteed to be the same set.
 */

export interface StatusHistoryEntry {
  from: RepairStatus | null;
  to: RepairStatus;
  at: string;
  byName?: string;
  byRole?: string;
  note?: string;
}

export interface RepairTicket {
  id: string;
  code: string;
  customer: string;
  device: string;
  branch: string;
  technician: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  issue: string;
  diagnosis?: string;
  estimatedCost?: number;
  finalCost?: number;
  customerApproved?: boolean;
  customerApprovedAt?: string;
  customerRejectionReason?: string;
  notes?: string;
  attachments: Array<{ url: string; publicId?: string; caption?: string }>;
  expectedCompletionAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  warrantyDays: number;
  isOpen: boolean;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;

  /** Present on list responses: denormalised summaries for the table. */
  customerSummary?: TicketCustomerSummary | null;
  deviceSummary?: TicketDeviceSummary | null;
  technicianSummary?: TicketTechnicianSummary | null;
}

export interface TicketCustomerSummary {
  id: string;
  name: string;
  customerCode: string;
  phone: string;
  email?: string;
}

export interface TicketDeviceSummary {
  id: string;
  brand: string;
  model: string;
  displayName: string;
  deviceType: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition: DeviceCondition;
}

export interface TicketTechnicianSummary {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface TicketAction {
  to: RepairStatus;
  labelKey: string;
}

export interface RepairDetail {
  ticket: RepairTicket;
  customer: TicketCustomerSummary | null;
  device: TicketDeviceSummary | null;
  technician: TicketTechnicianSummary | null;
  branch: { id: string; name: string; code: string } | null;
  availableActions: TicketAction[];
  isTerminal: boolean;
}

export interface AssignableTechnician {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  activeTickets: number;
}

export interface RepairSummary {
  byStatus: Partial<Record<RepairStatus, number>>;
  total: number;
  open: number;
  active: number;
  ready: number;
  awaitingApproval: number;
  waitingParts: number;
}

export interface RepairQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: RepairStatus;
  state?: 'open' | 'closed' | 'active';
  priority?: RepairPriority;
  technician?: string;
  customer?: string;
  device?: string;
  mine?: 'true' | 'false';
  unassigned?: 'true' | 'false';
  sort?: string;
}

export interface CreateRepairPayload {
  device: string;
  priority: RepairPriority;
  issue?: string;
  technician?: string;
  expectedCompletionAt?: string;
  estimatedCost?: number;
  warrantyDays?: number;
  notes?: string;
}

export interface UpdateRepairPayload {
  priority?: RepairPriority;
  issue?: string;
  diagnosis?: string;
  estimatedCost?: number;
  finalCost?: number;
  technician?: string | null;
  expectedCompletionAt?: string | null;
  warrantyDays?: number;
  notes?: string;
}

export interface ChangeStatusPayload {
  status: RepairStatus;
  note?: string;
  customerApproved?: boolean;
  customerRejectionReason?: string;
}
