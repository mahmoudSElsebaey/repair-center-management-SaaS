/** Phase 11 — Reports and analytics (English). */
const en_reports = {
  reports: {
    title: 'Reports & analytics',
    subtitle: 'Revenue, payments, repairs and technician performance from live data.',
    scopeGlobal: 'Organisation-wide',
    scopeBranch: 'This branch',
    from: 'From',
    to: 'To',
    count: 'Count',
    presets: {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      custom: 'Custom',
    },
    kpis: {
      revenue: 'Revenue collected',
      paymentCount: '{{count}} payments',
      invoiced: 'Invoiced',
      outstanding: '{{amount}} outstanding',
      repairsCreated: 'Repairs opened',
      completedHint: '{{count}} completed in range',
      activeRepairs: 'Active on bench',
      cancelledHint: '{{count}} cancelled in range',
    },
    charts: {
      revenueOverTime: 'Revenue over time',
      revenueOverTimeHint: 'Cash-in from recorded payments, day by day.',
      paymentsByMethod: 'Payments by method',
      paymentsByMethodHint: 'How customers settled invoices in this period.',
      invoicesByStatus: 'Invoices by status',
      invoicesByStatusHint: 'Issued, paid, partial and void counts in range.',
      repairsByStatus: 'Repairs by status',
      repairsByStatusHint: 'Tickets created in this period, grouped by current status.',
      repairsCreated: 'Repairs opened over time',
      repairsCreatedHint: 'New tickets created each day in the selected range.',
      technicianPerformance: 'Technician performance',
      technicianPerformanceHint: 'Completed tickets in range, plus current active load.',
    },
    tech: {
      active: '{{count}} active',
      cancelled: '{{count}} cancelled',
    },
    empty: {
      revenue: 'No payments in this range',
      revenueBody: 'Record payments on invoices to see revenue trends here.',
      payments: 'No payment methods used',
      invoices: 'No invoices in this range',
      repairs: 'No repairs in this range',
      technicians: 'No technician activity yet',
    },
  },
  nav: {
    reports: 'Reports',
  },
} as const;

export default en_reports;
