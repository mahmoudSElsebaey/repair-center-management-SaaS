import type { RepairPriority, RepairStatus, RepairStatus as Status } from '../../types/domain.js';

/**
 * Demo repair tickets.
 *
 * Written to populate every stage of the workflow so the status distribution,
 * the worklist filters and the technician workload panel all have something real
 * to show — rather than ten tickets that all sit at `received`.
 *
 * Each entry names the customer and device by a fragment that the seeder matches
 * against, so the data stays readable and survives a re-seed.
 */

export interface RepairTicketSeed {
  /** Matched against the customer name. */
  customer: string;
  /** Matched against `brand model` of that customer's devices. */
  device: string;
  status: RepairStatus;
  priority: RepairPriority;
  /** Matched against the technician name; omitted leaves the ticket unassigned. */
  technician?: string;
  issue: string;
  diagnosis?: string;
  estimatedCost?: number;
  finalCost?: number;
  customerApproved?: boolean;
  notes?: string;
  /** How many days ago the ticket was opened. */
  openedDaysAgo: number;
  /** Days ago the current status was reached; defaults to a plausible offset. */
  statusDaysAgo?: number;
  warrantyDays?: number;
  /** Extra history steps before the final status, for a believable timeline. */
  journey?: Array<{ status: Status; daysAgo: number; note?: string }>;
}

export const REPAIR_TICKETS: RepairTicketSeed[] = [
  {
    customer: 'Hesham Adel Barakat',
    device: 'Galaxy S24 Ultra',
    status: 'in_repair',
    priority: 'high',
    technician: 'Youssef Hany Ragab',
    issue:
      'Cracked display assembly after a drop. Touch does not respond on the top third of the screen.',
    diagnosis:
      'Digitizer damaged across the upper third; the OLED panel itself tests healthy. Replacing the display assembly restores full touch. Frame has a minor dent at the top-right corner that does not affect fitment.',
    estimatedCost: 4850,
    customerApproved: true,
    notes: 'Customer approved by phone. Original assembly to be returned with the device.',
    openedDaysAgo: 3,
    statusDaysAgo: 1,
    journey: [
      { status: 'diagnosing', daysAgo: 2, note: 'Bench intake' },
      { status: 'waiting_customer', daysAgo: 2, note: 'Quotation sent' },
      { status: 'approved', daysAgo: 1, note: 'Customer approved by phone' },
    ],
  },
  {
    customer: 'Hesham Adel Barakat',
    device: 'ThinkPad T14',
    status: 'diagnosing',
    priority: 'normal',
    technician: 'Salma Ibrahim Zaki',
    issue: 'Overheating and fan noise under load; battery drains in about two hours.',
    diagnosis: 'Thermal paste dried out; fan bearing noisy at high RPM.',
    openedDaysAgo: 1,
    journey: [{ status: 'diagnosing', daysAgo: 1, note: 'On the bench' }],
  },
  {
    customer: 'Mariam Tarek El-Gohary',
    device: 'iPhone 14 Pro',
    status: 'waiting_parts',
    priority: 'normal',
    technician: 'Mostafa Adel Shaker',
    issue: 'Battery health at 76%. Phone shuts down unexpectedly below 20%.',
    diagnosis:
      'Battery cycles at 812 with a swollen cell. Replacement required; original capacity cell is on order from the supplier.',
    estimatedCost: 2100,
    customerApproved: true,
    openedDaysAgo: 5,
    statusDaysAgo: 2,
    journey: [
      { status: 'diagnosing', daysAgo: 4 },
      { status: 'waiting_customer', daysAgo: 4, note: 'Quotation sent by WhatsApp' },
      { status: 'approved', daysAgo: 3 },
      { status: 'in_repair', daysAgo: 3 },
      { status: 'waiting_parts', daysAgo: 2, note: 'Cell on order — ETA two days' },
    ],
  },
  {
    customer: 'Omar Sherif Nabil',
    device: 'OptiPlex 7090',
    status: 'waiting_customer',
    priority: 'high',
    technician: 'Hana Walid Farouk',
    issue: 'Will not POST. Diagnostic LEDs show a memory fault on slot 2.',
    diagnosis:
      'Slot 2 memory channel is dead on the mainboard. Board replacement is uneconomical against a new unit; a single-channel 16GB configuration would work but halves memory bandwidth.',
    estimatedCost: 3200,
    openedDaysAgo: 4,
    statusDaysAgo: 2,
    journey: [
      { status: 'diagnosing', daysAgo: 3 },
      { status: 'waiting_customer', daysAgo: 2, note: 'Awaiting the customer’s decision' },
    ],
  },
  {
    customer: 'Omar Sherif Nabil',
    device: 'iPad Air 5',
    status: 'ready',
    priority: 'normal',
    technician: 'Hana Walid Farouk',
    issue: 'Charging port intermittent — requires the cable to be held at an angle.',
    diagnosis:
      'Lint compacted in the port plus a bent centre pin. Port replaced and the connector cleaned; charging verified at full rate with three different cables.',
    estimatedCost: 950,
    finalCost: 950,
    customerApproved: true,
    openedDaysAgo: 7,
    statusDaysAgo: 1,
    journey: [
      { status: 'diagnosing', daysAgo: 6 },
      { status: 'waiting_customer', daysAgo: 6 },
      { status: 'approved', daysAgo: 5 },
      { status: 'in_repair', daysAgo: 4 },
      { status: 'ready', daysAgo: 1, note: 'Ready for collection' },
    ],
  },
  {
    customer: 'Rania Fouad Selim',
    device: 'Washing Machine',
    status: 'in_repair',
    priority: 'urgent',
    technician: 'Tarek Samir Abdallah',
    issue: 'Drum does not spin during the spin cycle; water drains normally.',
    diagnosis:
      'Drive belt stretched and the motor brushes are near their limit. Belt and brush set replaced; spin cycle verified under a full load.',
    estimatedCost: 1650,
    customerApproved: true,
    openedDaysAgo: 2,
    statusDaysAgo: 1,
    journey: [
      { status: 'diagnosing', daysAgo: 2 },
      { status: 'approved', daysAgo: 1, note: 'Approved at the counter' },
      { status: 'in_repair', daysAgo: 1 },
    ],
  },
  {
    customer: 'Ziad Khaled Hosny',
    device: 'Optimax 1.5HP',
    status: 'delivered',
    priority: 'normal',
    technician: 'Tarek Samir Abdallah',
    issue: 'Cooling is weak and the outdoor unit makes a rhythmic knocking sound.',
    diagnosis:
      'Gas charge low due to a leaking flare joint; compressor mounts perished. Joint re-flared, system evacuated and recharged, mounts replaced.',
    estimatedCost: 1400,
    finalCost: 1520,
    customerApproved: true,
    notes: 'Final cost exceeded the estimate by 120 for the compressor mounts — agreed with the customer before fitting.',
    openedDaysAgo: 12,
    statusDaysAgo: 6,
    warrantyDays: 90,
    journey: [
      { status: 'diagnosing', daysAgo: 11 },
      { status: 'waiting_customer', daysAgo: 10 },
      { status: 'approved', daysAgo: 9 },
      { status: 'in_repair', daysAgo: 8 },
      { status: 'ready', daysAgo: 7 },
      { status: 'delivered', daysAgo: 6, note: 'Collected by the customer' },
    ],
  },
  {
    customer: 'Ziad Khaled Hosny',
    device: 'OLED55C2',
    status: 'waiting_customer',
    priority: 'low',
    technician: 'Mostafa Adel Shaker',
    issue: 'Screen shows vertical banding across the middle after a power surge. Panel suspected.',
    diagnosis:
      'Panel driver board damaged. Replacement panel is no longer supplied for this model; the customer has been offered a trade-in valuation instead of a repair.',
    estimatedCost: 9800,
    openedDaysAgo: 6,
    statusDaysAgo: 3,
    journey: [
      { status: 'diagnosing', daysAgo: 5 },
      { status: 'waiting_customer', daysAgo: 3, note: 'Repair versus trade-in decision pending' },
    ],
  },
  {
    customer: 'Aya Mahmoud Roshdy',
    device: 'MacBook Air M2',
    status: 'received',
    priority: 'normal',
    issue: 'Left hinge is loose and the lid does not open smoothly. Keyboard is fine.',
    openedDaysAgo: 0,
    journey: [],
  },
  {
    customer: 'Nada Sameh Fahmy',
    device: 'Pavilion 15',
    status: 'cancelled',
    priority: 'low',
    technician: 'Youssef Hany Ragab',
    issue: 'Keyboard keys not responding on the left side.',
    diagnosis: 'Liquid ingress under the keyboard membrane; replacement required.',
    estimatedCost: 1250,
    customerApproved: false,
    notes: 'Customer declined the repair and collected the unit unrepaired.',
    openedDaysAgo: 9,
    statusDaysAgo: 8,
    journey: [
      { status: 'diagnosing', daysAgo: 9 },
      { status: 'waiting_customer', daysAgo: 9 },
      { status: 'cancelled', daysAgo: 8, note: 'Customer declined the quotation' },
    ],
  },
];
