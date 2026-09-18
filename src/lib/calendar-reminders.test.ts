import type { CalendarEvent } from '@/types';
import { processCalendarReminders } from '@/lib/calendar-reminders';

describe('processCalendarReminders', () => {
  it('marks multiple due reminders in one atomic pass', () => {
    const now = new Date('2026-09-17T10:00:00Z').getTime();
    const dueDate = new Date('2026-09-17T10:10:00Z').getTime();
    const events: CalendarEvent[] = [
      {
        id: 'event-1',
        title: 'A',
        type: 'event',
        date: dueDate,
        reminder: 15,
        reminderSent: false,
        createdAt: now,
      },
      {
        id: 'event-2',
        title: 'B',
        type: 'event',
        date: dueDate,
        reminder: 15,
        reminderSent: false,
        createdAt: now,
      },
    ];

    const result = processCalendarReminders(events, now);

    expect(result.triggered.map((event) => event.id)).toEqual(['event-1', 'event-2']);
    expect(result.events.every((event) => event.reminderSent)).toBe(true);
  });
});
