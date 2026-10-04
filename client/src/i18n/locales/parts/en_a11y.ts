/**
 * Phase 13 — Accessibility & polish strings (English)
 * Merge into the main i18n assembler (e.g. en_g* or locales index).
 */
export const en_a11y = {
  a11y: {
    skipToContent: 'Skip to main content',
    mainLandmark: 'Main content',
    navigationLandmark: 'Primary navigation',
    breadcrumbs: 'Breadcrumb',
    loading: 'Loading',
    loadingPage: 'Loading page content',
    searchResults: 'Search results',
    noResults: 'No results found',
    pageOf: 'Page {{page}} of {{pages}}',
    itemsCount: '{{count}} items',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    closeDialog: 'Close dialog',
    requiredField: 'Required',
    optionalField: 'Optional',
    sortAscending: 'Sorted ascending',
    sortDescending: 'Sorted descending',
    expandSection: 'Expand section',
    collapseSection: 'Collapse section',
    selected: 'Selected',
    notSelected: 'Not selected',
    filterApplied: 'Filter applied',
    filtersCleared: 'Filters cleared',
    notificationUnread: '{{count}} unread notifications',
    tableCaption: 'Data table',
    chartDescription: 'Chart: {{title}}',
    reducedMotionNote: 'Animations reduced based on system preference',
  },
  polish: {
    retryHint: 'Something went wrong. You can try again.',
    emptyHint: 'Nothing here yet.',
    offline: 'You appear to be offline. Changes will sync when connection returns.',
    saved: 'Saved',
    unsavedChanges: 'You have unsaved changes',
  },
} as const;

export default en_a11y;
