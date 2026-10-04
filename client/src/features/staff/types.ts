import type { UserRole, Locale } from '@/types/domain';

export interface StaffBranch {
  id: string;
  name: string;
  code: string;
  city?: string;
}

export interface StaffWorkload {
  openTickets: number;
  activeTickets: number;
  completedLast30Days: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  locale: Locale;
  branch: StaffBranch | null;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  workload?: StaffWorkload | null;
}

export interface StaffQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  branch?: string;
  isActive?: 'true' | 'false';
  sort?: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  branch?: string | null;
  locale?: Locale;
}

export interface UpdateStaffPayload {
  name?: string;
  phone?: string | null;
  role?: UserRole;
  branch?: string | null;
  locale?: Locale;
  password?: string;
  isActive?: boolean;
}
