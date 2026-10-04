/** Phase 10 — Appointments (English). */
const en_appointments = {
  appointments: {
    title: 'Appointments',
    subtitle: 'Schedule customer visits and keep the technician calendar conflict-free.',
    add: 'New appointment',
    edit: 'Edit appointment',
    empty: 'No appointments in this range',
    emptyBody: 'Schedule a visit or widen the calendar week.',
    conflict: 'Technician is already booked in this window',
    confirmedToast: 'Appointment confirmed',
    completedToast: 'Appointment completed',
    cancelledToast: 'Appointment cancelled',
    noShowToast: 'Marked as no-show',
    createdToast: 'Appointment scheduled',
    updatedToast: 'Appointment updated',
    fields: {
      title: 'Title',
      customer: 'Customer',
      technician: 'Technician',
      type: 'Type',
      status: 'Status',
      startsAt: 'Starts',
      endsAt: 'Ends',
      duration: 'Duration',
      notes: 'Notes',
      repair: 'Linked repair',
      unassigned: 'Unassigned',
    },
    actions: {
      confirm: 'Confirm',
      complete: 'Complete',
      cancel: 'Cancel',
      noShow: 'No-show',
      previousWeek: 'Previous week',
      nextWeek: 'Next week',
      today: 'Today',
    },
    duration: {
      m15: '15 min',
      m30: '30 min',
      m45: '45 min',
      m60: '1 hour',
      m90: '1.5 hours',
      m120: '2 hours',
    },
    status: {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No-show',
    },
    types: {
      walk_in: 'Walk-in',
      drop_off: 'Drop-off',
      pickup: 'Pickup',
      consultation: 'Consultation',
      other: 'Other',
    },
    validation: {
      required: 'Title and customer are required',
      invalidTime: 'Enter a valid start time',
    },
  },
  appointmentNotifications: {
    created: {
      title: 'Appointment scheduled',
      body: '{{title}} was added to the calendar',
    },
    confirmed: {
      title: 'Appointment confirmed',
      body: '{{title}} is confirmed',
    },
    completed: {
      title: 'Appointment completed',
      body: '{{title}} was marked complete',
    },
    cancelled: {
      title: 'Appointment cancelled',
      body: '{{title}} was cancelled',
    },
    noShow: {
      title: 'Customer no-show',
      body: '{{title}} was marked as no-show',
    },
  },
  activity: {
    appointment: {
      created: 'Scheduled appointment «{{title}}»',
      updated: 'Updated appointment «{{title}}»',
      confirmed: 'Confirmed appointment «{{title}}»',
      completed: 'Completed appointment «{{title}}»',
      cancelled: 'Cancelled appointment «{{title}}»',
      noShow: 'Marked appointment «{{title}}» as no-show',
    },
  },
} as const;

export default en_appointments;
