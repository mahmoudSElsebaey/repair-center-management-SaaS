import { AppError } from '../utils/AppError.js';
import type { RepairPriority, RepairStatus, UserRole } from '../types/domain.js';

/**
 * The repair workflow.
 *
 * Status is a closed set, and every move between statuses is declared here. This
 * is the single place that decides whether a transition is legal and who may
 * perform it, so no controller can invent its own rule and no client can move a
 * ticket by simply PATCHing a field.
 *
 * Terminal states (`delivered`, `cancelled`) have no outgoing transitions —
 * reopening a closed ticket would invalidate the invoice and warranty that were
 * issued against it.
 */

export interface TransitionRule {
  to: RepairStatus;
  /** Roles permitted to perform the move. */
  roles: UserRole[];
  /** i18n key for the action label shown on the button. */
  labelKey: string;
  /** Fields that must be present on the ticket before the move is allowed. */
  requires?: Array<'diagnosis' | 'estimatedCost' | 'finalCost' | 'technician' | 'customerApproval'>;
  /** Human explanation shown when `requires` is not satisfied. */
  blockedReasonKey?: string;
}

/** Statuses that end the ticket's life. */
export const TERMINAL_STATUSES: RepairStatus[] = ['delivered', 'cancelled'];

/** Statuses where the workshop is actively holding the customer's device. */
export const OPEN_STATUSES: RepairStatus[] = [
  'received',
  'diagnosing',
  'waiting_customer',
  'approved',
  'in_repair',
  'waiting_parts',
  'ready',
];

/**
 * Statuses considered "in progress" on the dashboard: the device is on the
 * premises and work is not finished.
 */
export const ACTIVE_STATUSES: RepairStatus[] = [
  'diagnosing',
  'approved',
  'in_repair',
  'waiting_parts',
];

const MANAGERS: UserRole[] = ['super_admin', 'admin', 'manager'];
const FRONT_DESK: UserRole[] = [...MANAGERS, 'receptionist'];
const BENCH: UserRole[] = [...MANAGERS, 'technician'];

export const TRANSITIONS: Record<RepairStatus, TransitionRule[]> = {
  received: [
    {
      to: 'diagnosing',
      roles: BENCH,
      labelKey: 'repairs.actions.startDiagnosis',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  diagnosing: [
    {
      to: 'waiting_customer',
      roles: BENCH,
      labelKey: 'repairs.actions.sendForApproval',
      requires: ['diagnosis', 'estimatedCost'],
      blockedReasonKey: 'repairs.blocked.needsDiagnosisAndQuote',
    },
    {
      to: 'in_repair',
      roles: BENCH,
      labelKey: 'repairs.actions.startRepair',
      requires: ['diagnosis'],
      blockedReasonKey: 'repairs.blocked.needsDiagnosis',
    },
    {
      to: 'waiting_parts',
      roles: BENCH,
      labelKey: 'repairs.actions.waitForParts',
      requires: ['diagnosis'],
      blockedReasonKey: 'repairs.blocked.needsDiagnosis',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  waiting_customer: [
    {
      to: 'approved',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.recordApproval',
      requires: ['estimatedCost'],
      blockedReasonKey: 'repairs.blocked.needsQuote',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  approved: [
    {
      to: 'in_repair',
      roles: BENCH,
      labelKey: 'repairs.actions.startRepair',
      requires: ['technician'],
      blockedReasonKey: 'repairs.blocked.needsTechnician',
    },
    {
      to: 'waiting_parts',
      roles: BENCH,
      labelKey: 'repairs.actions.waitForParts',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  in_repair: [
    {
      to: 'waiting_parts',
      roles: BENCH,
      labelKey: 'repairs.actions.waitForParts',
    },
    {
      to: 'ready',
      roles: BENCH,
      labelKey: 'repairs.actions.markReady',
      requires: ['finalCost'],
      blockedReasonKey: 'repairs.blocked.needsFinalCost',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  waiting_parts: [
    {
      to: 'in_repair',
      roles: BENCH,
      labelKey: 'repairs.actions.resumeRepair',
    },
    {
      to: 'ready',
      roles: BENCH,
      labelKey: 'repairs.actions.markReady',
      requires: ['finalCost'],
      blockedReasonKey: 'repairs.blocked.needsFinalCost',
    },
    {
      to: 'cancelled',
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.cancel',
    },
  ],

  ready: [
    {
      to: 'delivered',
      // Money changes hands at the counter, so this is a front-desk action.
      roles: FRONT_DESK,
      labelKey: 'repairs.actions.deliver',
      requires: ['finalCost'],
      blockedReasonKey: 'repairs.blocked.needsFinalCost',
    },
    {
      to: 'in_repair',
      roles: BENCH,
      labelKey: 'repairs.actions.reopenRepair',
    },
  ],

  delivered: [],
  cancelled: [],
};

/** Human-readable stage order for the customer-facing timeline. */
export const WORKFLOW_ORDER: RepairStatus[] = [
  'received',
  'diagnosing',
  'waiting_customer',
  'approved',
  'in_repair',
  'waiting_parts',
  'ready',
  'delivered',
];

export interface TransitionContext {
  status: RepairStatus;
  diagnosis?: string;
  estimatedCost?: number;
  finalCost?: number;
  technician?: string | null;
  customerApproved?: boolean;
}

/** Finds the rule for a move, or `undefined` when the move is not defined. */
export function findTransition(from: RepairStatus, to: RepairStatus): TransitionRule | undefined {
  return TRANSITIONS[from]?.find((rule) => rule.to === to);
}

/**
 * Every move a given user could make right now.
 *
 * The client renders its action buttons from this, so the buttons it shows and
 * the moves the server accepts are guaranteed to be the same set.
 */
export function availableTransitions(
  context: TransitionContext,
  role: UserRole
): TransitionRule[] {
  return (TRANSITIONS[context.status] ?? []).filter(
    (rule) => rule.roles.includes(role) && missingRequirements(context, rule).length === 0
  );
}

/** Requirement keys that are still unsatisfied for a rule. */
export function missingRequirements(
  context: TransitionContext,
  rule: TransitionRule
): Array<'diagnosis' | 'estimatedCost' | 'finalCost' | 'technician' | 'customerApproval'> {
  if (!rule.requires) return [];

  return rule.requires.filter((requirement) => {
    switch (requirement) {
      case 'diagnosis':
        return !context.diagnosis || context.diagnosis.trim().length === 0;
      case 'estimatedCost':
        return typeof context.estimatedCost !== 'number' || context.estimatedCost <= 0;
      case 'finalCost':
        return typeof context.finalCost !== 'number' || context.finalCost <= 0;
      case 'technician':
        return !context.technician;
      case 'customerApproval':
        return context.customerApproved !== true;
      default:
        return false;
    }
  });
}

/**
 * Asserts that a move is legal for this user, throwing a specific error
 * otherwise. The three failure modes are distinct on purpose: "that status does
 * not exist", "your role cannot do this" and "the ticket is not ready" call for
 * different messages in the interface.
 */
export function assertTransitionAllowed(
  context: TransitionContext,
  to: RepairStatus,
  role: UserRole
): TransitionRule {
  const rule = findTransition(context.status, to);

  if (!rule) {
    throw AppError.badRequest(
      `A ticket cannot move from "${context.status}" to "${to}"`,
      'INVALID_TRANSITION'
    );
  }

  if (!rule.roles.includes(role)) {
    throw AppError.forbidden(
      `Your role cannot move a ticket from "${context.status}" to "${to}"`,
      'TRANSITION_FORBIDDEN'
    );
  }

  const missing = missingRequirements(context, rule);
  if (missing.length > 0) {
    throw AppError.badRequest(
      'The ticket is missing information required for this step',
      'TRANSITION_REQUIREMENTS_MISSING',
      missing.map((field) => ({ path: field, message: rule.blockedReasonKey ?? field }))
    );
  }

  return rule;
}

/** Whether a status counts as finished. */
export function isTerminal(status: RepairStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Whether the workshop currently holds the customer's device. */
export function holdsDevice(status: RepairStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/**
 * Whether a delivered ticket could ever be reopened.
 *
 * Exposed so the API can state the rule rather than leaving the client to guess
 * why `delivered` has no buttons.
 */
export function isReopenable(): boolean {
  return false;
}

/** Priority ordering used whenever tickets are listed or ranked. */
export const PRIORITY_WEIGHT: Record<RepairPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};
