import type { ActivityCategory } from '@/features/activity/types';
import type { NotificationSeverity, AppNotification } from '@/features/notifications/types';
import type { RepairStatus, UserRole } from '@/types/domain';

/**
 * Dashboard payload.
 *
 * The shape is deliberately explicit about what may be absent. Repair, customer
 * and inventory figures are `null` until the phase that creates their
 * collections ships — the API reports `sections` so the client can render what
 * is real instead of inventing placeholders.
 */

export interface DashboardScope {
  branchId: string | null;
  isGlobal: boolean;
}

export interface DashboardSections {
  customers: boolean;
  devices: boolean;
  repairs: boolean;
  inventory: boolean;
  invoices: boolean;
}

export interface DashboardMetrics {
  staff: number;
  staffAllBranches: number;
  branches: number;
  activeBranches: number;
  unreadNotifications: number;
  /** null until Phase 03 creates the customers collection. */
  customers: number | null;
  /** null until Phase 03 creates the devices collection. */
  devices: number | null;
  /** Per-status counts, or null until Phase 04. */
  repairs: Record<RepairStatus, number> | null;
}

export interface RoleCount {
  role: UserRole;
  count: number;
}

export interface BranchCount {
  branchId: string | null;
  name: string | null;
  code: string | null;
  count: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface TopAction {
  action: string;
  category: ActivityCategory;
  count: number;
}

export interface DashboardCharts {
  staffByRole: RoleCount[];
  staffByBranch: BranchCount[];
  activityOverTime: ActivityPoint[];
  topActions: TopAction[];
}

export interface DashboardActivityEntry {
  id: string;
  action: string;
  category: ActivityCategory;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  actorName?: string;
  actorRole?: string;
  entityType?: string;
  entityLabel?: string;
  createdAt: string;
}

export interface DashboardData {
  scope: DashboardScope;
  sections: DashboardSections;
  metrics: DashboardMetrics;
  charts: DashboardCharts;
  recentActivity: DashboardActivityEntry[];
}

export interface NotificationSummary {
  unread: number;
  total: number;
}

export type { AppNotification, NotificationSeverity };
