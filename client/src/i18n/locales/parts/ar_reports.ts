/** Phase 11 — Reports and analytics (Arabic). */
const ar_reports = {
  reports: {
    title: 'التقارير والتحليلات',
    subtitle: 'الإيرادات والمدفوعات والإصلاحات وأداء الفنيين من بيانات حية.',
    scopeGlobal: 'على مستوى المؤسسة',
    scopeBranch: 'هذا الفرع',
    from: 'من',
    to: 'إلى',
    count: 'العدد',
    presets: {
      '7d': 'آخر 7 أيام',
      '30d': 'آخر 30 يوماً',
      '90d': 'آخر 90 يوماً',
      custom: 'مخصص',
    },
    kpis: {
      revenue: 'الإيرادات المحصّلة',
      paymentCount: '{{count}} دفعة',
      invoiced: 'المفوتر',
      outstanding: '{{amount}} مستحق',
      repairsCreated: 'إصلاحات مفتوحة',
      completedHint: '{{count}} مكتمل في الفترة',
      activeRepairs: 'نشط على الطاولة',
      cancelledHint: '{{count}} ملغى في الفترة',
    },
    charts: {
      revenueOverTime: 'الإيرادات عبر الزمن',
      revenueOverTimeHint: 'التدفق النقدي من المدفوعات المسجّلة يوماً بيوم.',
      paymentsByMethod: 'المدفوعات حسب الطريقة',
      paymentsByMethodHint: 'كيف سدّد العملاء الفواتير في هذه الفترة.',
      invoicesByStatus: 'الفواتير حسب الحالة',
      invoicesByStatusHint: 'أعداد الصادرة والمدفوعة والجزئية والملغاة في الفترة.',
      repairsByStatus: 'الإصلاحات حسب الحالة',
      repairsByStatusHint: 'التذاكر المُنشأة في هذه الفترة مجمّعة حسب الحالة الحالية.',
      repairsCreated: 'الإصلاحات المفتوحة عبر الزمن',
      repairsCreatedHint: 'تذاكر جديدة كل يوم في النطاق المحدد.',
      technicianPerformance: 'أداء الفنيين',
      technicianPerformanceHint: 'التذاكر المكتملة في الفترة مع الحمل النشط الحالي.',
    },
    tech: {
      active: '{{count}} نشط',
      cancelled: '{{count}} ملغى',
    },
    empty: {
      revenue: 'لا مدفوعات في هذا النطاق',
      revenueBody: 'سجّل مدفوعات على الفواتير لترى اتجاهات الإيرادات هنا.',
      payments: 'لم تُستخدم طرق دفع',
      invoices: 'لا فواتير في هذا النطاق',
      repairs: 'لا إصلاحات في هذا النطاق',
      technicians: 'لا نشاط للفنيين بعد',
    },
  },
  nav: {
    reports: 'التقارير',
  },
} as const;

export default ar_reports;
