/** Extra notification type labels + repairs worklist presets missing from earlier slices. */
export default {
  notifications: {
    types: {
      all: 'All types',
      repair_assigned: 'Repair assigned',
      repair_status_changed: 'Status changed',
      approval_requested: 'Approval requested',
      approval_received: 'Approval received',
      parts_needed: 'Parts needed',
      low_stock: 'Low stock',
      invoice_issued: 'Invoice issued',
      payment_received: 'Payment received',
      appointment_reminder: 'Appointment reminder',
      system: 'System',
    },
  },
  repairs: {
    summary: {
      all: 'All tickets',
      active: 'Active',
      waiting: 'Awaiting customer',
      ready: 'Ready',
      closed: 'Closed',
    },
    filters: {
      all: 'All statuses',
      mine: 'Assigned to me',
    },
  },
} as const;
