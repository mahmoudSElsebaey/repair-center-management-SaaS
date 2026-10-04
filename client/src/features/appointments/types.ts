import type { AppointmentStatus, AppointmentType } from '@/types/domain';

export interface Appointment {
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
  /** Denormalised list fields */
  customerName?: string | null;
  customerPhone?: string | null;
  customerCode?: string | null;
  technicianName?: string | null;
}

export interface AppointmentCustomer {
  id: string;
  name: string;
  phone?: string;
  customerCode?: string;
}

export interface AppointmentTechnician {
  id: string;
  name: string;
  role: string;
}

export interface AppointmentDetail {
  appointment: Appointment;
  customer: AppointmentCustomer | null;
  technician: AppointmentTechnician | null;
}

export interface AppointmentQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: AppointmentStatus | '';
  type?: AppointmentType | '';
  customerId?: string;
  technicianId?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export interface CalendarQuery {
  from: string;
  to: string;
  technicianId?: string;
  status?: AppointmentStatus | '';
}

export interface CreateAppointmentPayload {
  customerId: string;
  technicianId?: string | null;
  repairTicketId?: string | null;
  title: string;
  type?: AppointmentType;
  startsAt: string;
  durationMinutes?: number;
  endsAt?: string;
  notes?: string | null;
  status?: 'scheduled' | 'confirmed';
}

export interface UpdateAppointmentPayload {
  customerId?: string;
  technicianId?: string | null;
  repairTicketId?: string | null;
  title?: string;
  type?: AppointmentType;
  startsAt?: string;
  durationMinutes?: number;
  endsAt?: string;
  notes?: string | null;
  status?: AppointmentStatus;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Appointment[];
}
