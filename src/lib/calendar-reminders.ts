import type { CalendarEvent } from '@/types';

export interface CalendarReminderPassResult {
  triggered: CalendarEvent[];
  events: CalendarEvent[];
}

export function processCalendarReminders(events: readonly CalendarEvent[], now: number): CalendarReminderPassResult {
  const triggered = events.filter((event) => {
    if (!event.reminder || event.reminderSent) {
      return false;
    }

    const reminderTime = event.date - event.reminder * 60 * 1000;
    return now >= reminderTime && now < event.date;
  });

  if (triggered.length === 0) {
    return { triggered: [], events: events as CalendarEvent[] };
  }

  const triggeredIds = new Set(triggered.map((event) => event.id));

  return {
    triggered,
    events: events.map((event) =>
      triggeredIds.has(event.id) ? { ...event, reminderSent: true } : event,
    ),
  };
}
