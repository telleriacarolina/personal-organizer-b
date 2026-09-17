import type { CalendarEvent } from '@/types';

export type CalendarImportDraft = Pick<
  CalendarEvent,
  'title' | 'type' | 'description' | 'date' | 'startTime' | 'endTime' | 'allDay' | 'location' | 'reminder' | 'color' | 'sourceType' | 'sourceId' | 'sourceWidgetId'
>;

export function hasImportedSourceEvent(events: CalendarEvent[], draft: CalendarImportDraft): boolean {
  if (!draft.sourceType || !draft.sourceId) return false;
  return events.some((event) => event.sourceType === draft.sourceType && event.sourceId === draft.sourceId);
}

export function appendImportedCalendarEvent(events: CalendarEvent[], draft: CalendarImportDraft) {
  if (hasImportedSourceEvent(events, draft)) {
    return { added: false, events };
  }

  const createdAt = Date.now();
  const eventId = crypto.randomUUID();
  const nextEvent: CalendarEvent = {
    id: eventId,
    title: draft.title,
    type: draft.type,
    description: draft.description,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    allDay: draft.allDay ?? false,
    location: draft.location,
    reminder: draft.reminder,
    reminderSent: false,
    color: draft.color ?? 'blue',
    sourceType: draft.sourceType,
    sourceId: draft.sourceId,
    sourceWidgetId: draft.sourceWidgetId,
    createdAt,
  };

  return {
    added: true,
    events: [...events, nextEvent],
  };
}
