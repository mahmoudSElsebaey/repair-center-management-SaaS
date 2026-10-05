/** تسميات أنواع الإشعارات + فلاتر قائمة التذاكر. */
export default {
  notifications: {
    types: {
      all: 'كل الأنواع',
      repair_assigned: 'تعيين إصلاح',
      repair_status_changed: 'تغيير الحالة',
      approval_requested: 'طلب موافقة',
      approval_received: 'استلام موافقة',
      parts_needed: 'حاجة لقطع',
      low_stock: 'مخزون منخفض',
      invoice_issued: 'إصدار فاتورة',
      payment_received: 'استلام دفعة',
      appointment_reminder: 'تذكير موعد',
      system: 'النظام',
    },
  },
  repairs: {
    summary: {
      all: 'كل التذاكر',
      active: 'نشطة',
      waiting: 'بانتظار العميل',
      ready: 'جاهزة',
      closed: 'مغلقة',
    },
    filters: {
      all: 'كل الحالات',
      mine: 'المُسنَدة إليّ',
    },
  },
} as const;
