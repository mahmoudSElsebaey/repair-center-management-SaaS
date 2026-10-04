/**
 * Phase 13 — Accessibility & polish strings (Arabic)
 * Merge into the main i18n assembler (e.g. ar_g* or locales index).
 */
export const ar_a11y = {
  a11y: {
    skipToContent: 'تخطى إلى المحتوى الرئيسي',
    mainLandmark: 'المحتوى الرئيسي',
    navigationLandmark: 'التنقل الرئيسي',
    breadcrumbs: 'مسار التنقل',
    loading: 'جاري التحميل',
    loadingPage: 'جاري تحميل محتوى الصفحة',
    searchResults: 'نتائج البحث',
    noResults: 'لا توجد نتائج',
    pageOf: 'صفحة {{page}} من {{pages}}',
    itemsCount: '{{count}} عنصر',
    openMenu: 'فتح قائمة التنقل',
    closeMenu: 'إغلاق قائمة التنقل',
    closeDialog: 'إغلاق النافذة',
    requiredField: 'مطلوب',
    optionalField: 'اختياري',
    sortAscending: 'مرتّب تصاعدياً',
    sortDescending: 'مرتّب تنازلياً',
    expandSection: 'توسيع القسم',
    collapseSection: 'طي القسم',
    selected: 'محدد',
    notSelected: 'غير محدد',
    filterApplied: 'تم تطبيق الفلتر',
    filtersCleared: 'تم مسح الفلاتر',
    notificationUnread: '{{count}} إشعار غير مقروء',
    tableCaption: 'جدول بيانات',
    chartDescription: 'رسم بياني: {{title}}',
    reducedMotionNote: 'تم تقليل الحركة وفق تفضيل النظام',
  },
  polish: {
    retryHint: 'حدث خطأ. يمكنك المحاولة مرة أخرى.',
    emptyHint: 'لا يوجد شيء هنا بعد.',
    offline: 'يبدو أنك غير متصل. ستُزامن التغييرات عند عودة الاتصال.',
    saved: 'تم الحفظ',
    unsavedChanges: 'لديك تغييرات غير محفوظة',
  },
} as const;

export default ar_a11y;
