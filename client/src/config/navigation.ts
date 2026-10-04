import {
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  HardHat,
  History,
  LayoutDashboard,
  Package,
  Settings,
  Smartphone,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/domain';
import { USER_ROLES } from '@/types/domain';

export type NavPhase = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface NavItem {
  key: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  roles?: UserRole[];
  phase: NavPhase;
  available: boolean;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'operations',
    labelKey: 'navGroups.operations',
    items: [
      {
        key: 'dashboard',
        labelKey: 'nav.dashboard',
        path: '/app',
        icon: LayoutDashboard,
        phase: 2,
        available: true,
      },
      {
        key: 'repairs',
        labelKey: 'nav.repairs',
        path: '/app/repairs',
        icon: Wrench,
        phase: 4,
        available: true,
      },
      {
        key: 'customers',
        labelKey: 'nav.customers',
        path: '/app/customers',
        icon: Users,
        phase: 3,
        available: true,
      },
      {
        key: 'devices',
        labelKey: 'nav.devices',
        path: '/app/devices',
        icon: Smartphone,
        phase: 3,
        available: true,
      },
      {
        key: 'appointments',
        labelKey: 'nav.appointments',
        path: '/app/appointments',
        icon: CalendarDays,
        roles: ['super_admin', 'admin', 'manager', 'receptionist'],
        phase: 10,
        available: true,
      },
    ],
  },
  {
    key: 'catalogue',
    labelKey: 'navGroups.catalogue',
    items: [
      {
        key: 'inventory',
        labelKey: 'nav.inventory',
        path: '/app/inventory',
        icon: Package,
        roles: ['super_admin', 'admin', 'manager', 'inventory_manager', 'technician'],
        phase: 6,
        available: true,
      },
      {
        key: 'technicians',
        labelKey: 'nav.technicians',
        path: '/app/technicians',
        icon: HardHat,
        roles: ['super_admin', 'admin', 'manager'],
        phase: 5,
        available: true,
      },
    ],
  },
  {
    key: 'finance',
    labelKey: 'navGroups.finance',
    items: [
      {
        key: 'invoices',
        labelKey: 'nav.invoices',
        path: '/app/invoices',
        icon: FileText,
        roles: ['super_admin', 'admin', 'manager', 'receptionist'],
        phase: 8,
        available: true,
      },
      {
        key: 'payments',
        labelKey: 'nav.payments',
        path: '/app/payments',
        icon: CreditCard,
        roles: ['super_admin', 'admin', 'manager', 'receptionist'],
        phase: 8,
        available: true,
      },
      {
        key: 'reports',
        labelKey: 'nav.reports',
        path: '/app/reports',
        icon: BarChart3,
        roles: ['super_admin', 'admin', 'manager'],
        phase: 11,
        available: true,
      },
    ],
  },
  {
    key: 'administration',
    labelKey: 'navGroups.administration',
    items: [
      {
        key: 'notifications',
        labelKey: 'nav.notifications',
        path: '/app/notifications',
        icon: Bell,
        phase: 2,
        available: true,
      },
      {
        key: 'activity',
        labelKey: 'nav.activity',
        path: '/app/activity',
        icon: History,
        roles: ['super_admin', 'admin', 'manager'],
        phase: 2,
        available: true,
      },
      {
        key: 'staff',
        labelKey: 'nav.staff',
        path: '/app/staff',
        icon: Users,
        roles: ['super_admin', 'admin'],
        phase: 5,
        available: true,
      },
      {
        key: 'settings',
        labelKey: 'nav.settings',
        path: '/app/settings',
        icon: Settings,
        roles: ['super_admin', 'admin', 'manager'],
        phase: 13,
        available: false,
      },
    ],
  },
];

export function hasRole(userRole: UserRole | undefined, allowed?: UserRole[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export function visibleNavGroups(userRole: UserRole | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasRole(userRole, item.roles)),
  })).filter((group) => group.items.length > 0);
}

export function findNavItem(pathname: string): NavItem | undefined {
  const items = NAV_GROUPS.flatMap((group) => group.items);
  return items
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export function rolesForPath(pathname: string): UserRole[] | undefined {
  return findNavItem(pathname)?.roles;
}

export { USER_ROLES };
