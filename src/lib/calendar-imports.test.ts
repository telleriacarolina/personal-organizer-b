import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/types';
import { appendImportedCalendarEvent } from './calendar-imports';

describe('appendImportedCalendarEvent', () => {
  it('adds a client slot import as a timed appointment with preserved fields', () => {
    const baseEvents: CalendarEvent[] = [];
    const result = appendImportedCalendarEvent(baseEvents, {
      title: 'Acme - Consultation',
      type: 'appointment',
      description: 'Review sprint plan',
      date: new Date('2026-09-20').getTime(),
      startTime: '09:30',
      endTime: '10:15',
      allDay: false,
      location: 'Office',
      reminder: undefined,
      color: 'purple',
      sourceType: 'work',
      sourceId: 'client-slot:slot-1',
      sourceWidgetId: 'work-widget-1',
    });

    expect(result.added).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      title: 'Acme - Consultation',
      type: 'appointment',
      description: 'Review sprint plan',
      date: new Date('2026-09-20').getTime(),
      startTime: '09:30',
      endTime: '10:15',
      allDay: false,
      location: 'Office',
      color: 'purple',
      sourceType: 'work',
      sourceId: 'client-slot:slot-1',
      sourceWidgetId: 'work-widget-1',
    });
    expect(typeof result.events[0].id).toBe('string');
    expect(result.events[0].id.length).toBeGreaterThan(0);
  });

  it('adds all-day deadline imports without time components', () => {
    const result = appendImportedCalendarEvent([], {
      title: 'Job deadline: Site launch',
      type: 'event',
      description: 'Client: Bright Co',
      date: new Date('2026-09-30').getTime(),
      startTime: undefined,
      endTime: undefined,
      allDay: true,
      location: undefined,
      reminder: undefined,
      color: 'orange',
      sourceType: 'work',
      sourceId: 'job-deadline:job-1',
      sourceWidgetId: 'work-widget-1',
    });

    expect(result.added).toBe(true);
    expect(result.events[0].allDay).toBe(true);
    expect(result.events[0].startTime).toBeUndefined();
    expect(result.events[0].endTime).toBeUndefined();
  });

  it('prevents duplicate imports for the same source reference', () => {
    const first = appendImportedCalendarEvent([], {
      title: 'Errand: Supplies',
      type: 'appointment',
      description: 'Buy printer paper',
      date: new Date('2026-10-01').getTime(),
      allDay: true,
      startTime: undefined,
      endTime: undefined,
      location: 'Store',
      reminder: undefined,
      color: 'red',
      sourceType: 'work',
      sourceId: 'errand:err-7',
      sourceWidgetId: 'work-widget-1',
    });

    const second = appendImportedCalendarEvent(first.events, {
      title: 'Errand: Supplies',
      type: 'appointment',
      description: 'Buy printer paper',
      date: new Date('2026-10-01').getTime(),
      allDay: true,
      startTime: undefined,
      endTime: undefined,
      location: 'Store',
      reminder: undefined,
      color: 'red',
      sourceType: 'work',
      sourceId: 'errand:err-7',
      sourceWidgetId: 'work-widget-1',
    });

    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].sourceId).toBe('errand:err-7');
  });
});
