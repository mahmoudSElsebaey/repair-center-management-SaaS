/** Analytics payload for Phase 11 reports. */

export interface AnalyticsScope {
  branchId: string | null;
  isGlobal: boolean;
}

export interface AnalyticsRange {
  from: string;
  to: string;
}

export interface AnalyticsSections {
  payments: boolean;
  invoices: boolean;
  repairs: boolean;
}

export interface AnalyticsKpis {
  revenueTotal: number;
  paymentCount: number;
  totalInvoiced: number | null;
  totalOutstanding: number | null;
  repairsCreated: number | null;
  repairsCompleted: number | null;
  repairsActive: number | null;
  repairsCancelled: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface PaymentMethodRow {
  method: string;
  amount: number;
  count: number;
}

export interface StatusCountRow {
  status: string;
  count: number;
  total?: number;
}

export interface TechnicianPerformanceRow {
  userId: string;
  name: string;
  completed: number;
  active: number;
  cancelled: number;
}

export interface AnalyticsCharts {
  revenueOverTime: TimeSeriesPoint[];
  paymentsByMethod: PaymentMethodRow[];
  invoicesByStatus: StatusCountRow[];
  repairsByStatus: StatusCountRow[];
  repairsCreatedOverTime: TimeSeriesPoint[];
  technicianPerformance: TechnicianPerformanceRow[];
}

export interface InvoiceMetrics {
  issued: number;
  paid: number;
  partiallyPaid: number;
  voided: number;
  draft: number;
  totalInvoiced: number;
  totalOutstanding: number;
}

export interface RepairMetrics {
  created: number;
  completed: number;
  cancelled: number;
  active: number;
}

export interface AnalyticsData {
  scope: AnalyticsScope;
  range: AnalyticsRange;
  sections: AnalyticsSections;
  kpis: AnalyticsKpis;
  charts: AnalyticsCharts;
  invoiceMetrics: InvoiceMetrics | null;
  repairMetrics: RepairMetrics | null;
}

export type DatePreset = '7d' | '30d' | '90d' | 'custom';
