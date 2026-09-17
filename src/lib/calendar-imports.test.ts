import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/types';
import { appendImportedCalendarEvent, hasImportedSourceEvent } from './calendar-imports';

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

// ─── Regression tests for the iCal (.ics) import path ──────────────────────────
//
// These tests protect the iCal import path: ical-sourced events must be added,
// deduplicated, and stored exactly like work-sourced events.

describe('appendImportedCalendarEvent – ical source regression', () => {
  const icalDraft = {
    title: 'Team Stand-up',
    type: 'appointment' as const,
    description: 'Daily stand-up meeting',
    date: new Date('2026-09-22').getTime(),
    startTime: '09:00',
    endTime: '09:30',
    allDay: false as const,
    location: 'Conference Room A',
    reminder: undefined,
    color: 'blue',
    sourceType: 'ical' as const,
    sourceId: 'ical:event-001@test.com',
    sourceWidgetId: undefined,
  };

  it('adds an ical-sourced timed event with all fields preserved', () => {
    const result = appendImportedCalendarEvent([], icalDraft);

    expect(result.added).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      title: 'Team Stand-up',
      type: 'appointment',
      description: 'Daily stand-up meeting',
      date: new Date('2026-09-22').getTime(),
      startTime: '09:00',
      endTime: '09:30',
      allDay: false,
      location: 'Conference Room A',
      color: 'blue',
      sourceType: 'ical',
      sourceId: 'ical:event-001@test.com',
    });
    expect(typeof result.events[0].id).toBe('string');
    expect(result.events[0].id.length).toBeGreaterThan(0);
    expect(result.events[0].reminderSent).toBe(false);
    expect(result.events[0].createdAt).toBeGreaterThan(0);
  });

  it('adds an ical all-day event without time components', () => {
    const allDayDraft = {
      ...icalDraft,
      title: 'Company Holiday',
      sourceId: 'ical:event-002@test.com',
      allDay: true as const,
      startTime: undefined,
      endTime: undefined,
    };
    const result = appendImportedCalendarEvent([], allDayDraft);

    expect(result.added).toBe(true);
    expect(result.events[0].allDay).toBe(true);
    expect(result.events[0].startTime).toBeUndefined();
    expect(result.events[0].endTime).toBeUndefined();
  });

  it('deduplicates ical events by sourceType + sourceId', () => {
    const first = appendImportedCalendarEvent([], icalDraft);
    const second = appendImportedCalendarEvent(first.events, icalDraft);

    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(second.events).toHaveLength(1);
  });

  it('does not deduplicate when sourceId differs', () => {
    const first = appendImportedCalendarEvent([], icalDraft);
    const otherDraft = { ...icalDraft, sourceId: 'ical:event-999@test.com' };
    const second = appendImportedCalendarEvent(first.events, otherDraft);

    expect(second.added).toBe(true);
    expect(second.events).toHaveLength(2);
  });

  it('does not deduplicate ical and work events sharing the same sourceId string', () => {
    const workDraft = { ...icalDraft, sourceType: 'work' as const };
    const afterWork = appendImportedCalendarEvent([], workDraft);
    const afterIcal = appendImportedCalendarEvent(afterWork.events, icalDraft);

    // Different sourceType → different identity → both added
    expect(afterIcal.added).toBe(true);
    expect(afterIcal.events).toHaveLength(2);
  });

  it('defaults color to "blue" when the draft color is undefined', () => {
    const nocolorDraft = { ...icalDraft, color: undefined, sourceId: 'ical:nocolor@test.com' };
    const withColorDraft = { ...icalDraft, color: 'green', sourceId: 'ical:withcolor@test.com' };
    const withoutColor = appendImportedCalendarEvent([], nocolorDraft);
    const withColor = appendImportedCalendarEvent([], withColorDraft);

    expect(withoutColor.events[0].color).toBe('blue');
    expect(withColor.events[0].color).toBe('green');
  });

  it('accumulates multiple distinct ical events without duplication', () => {
    const d1 = { ...icalDraft, sourceId: 'ical:a@test.com' };
    const d2 = { ...icalDraft, sourceId: 'ical:b@test.com' };
    const d3 = { ...icalDraft, sourceId: 'ical:c@test.com' };

    let evts: CalendarEvent[] = [];
    evts = appendImportedCalendarEvent(evts, d1).events;
    evts = appendImportedCalendarEvent(evts, d2).events;
    evts = appendImportedCalendarEvent(evts, d3).events;
    // Re-importing all three → no additions
    evts = appendImportedCalendarEvent(evts, d1).events;
    evts = appendImportedCalendarEvent(evts, d2).events;
    evts = appendImportedCalendarEvent(evts, d3).events;

    expect(evts).toHaveLength(3);
    expect(evts.map((e) => e.sourceId)).toEqual(
      expect.arrayContaining(['ical:a@test.com', 'ical:b@test.com', 'ical:c@test.com']),
    );
  });
});

describe('hasImportedSourceEvent – ical source regression', () => {
  it('returns true when an ical event with the same sourceId is already present', () => {
    const existing: CalendarEvent[] = [
      {
        id: '1',
        title: 'Stand-up',
        type: 'appointment',
        date: Date.now(),
        allDay: false,
        reminderSent: false,
        sourceType: 'ical',
        sourceId: 'ical:uid-abc@cal.test',
        createdAt: Date.now(),
      },
    ];

    expect(
      hasImportedSourceEvent(existing, {
        title: 'Stand-up',
        type: 'appointment',
        date: Date.now(),
        allDay: false,
        reminder: undefined,
        color: 'blue',
        sourceType: 'ical',
        sourceId: 'ical:uid-abc@cal.test',
      }),
    ).toBe(true);
  });

  it('returns false when no ical event matches the sourceId', () => {
    expect(
      hasImportedSourceEvent([], {
        title: 'New Event',
        type: 'event',
        date: Date.now(),
        allDay: false,
        reminder: undefined,
        color: 'blue',
        sourceType: 'ical',
        sourceId: 'ical:uid-xyz@cal.test',
      }),
    ).toBe(false);
  });

  it('returns false when draft has no sourceType', () => {
    const existing: CalendarEvent[] = [
      {
        id: '2',
        title: 'Something',
        type: 'event',
        date: Date.now(),
        allDay: false,
        reminderSent: false,
        createdAt: Date.now(),
      },
    ];

    expect(
      hasImportedSourceEvent(existing, {
        title: 'Something',
        type: 'event',
        date: Date.now(),
        allDay: false,
        reminder: undefined,
        color: 'blue',
        sourceType: undefined,
        sourceId: undefined,
      }),
    ).toBe(false);
  });
});
