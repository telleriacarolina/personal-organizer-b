import type { CalendarEvent } from '@/types';

export type CalendarDomainAction =
  | { type: 'upsert'; event: CalendarEvent }
  | { type: 'delete'; id: string }
  | { type: 'bulk-set'; events: CalendarEvent[] };

export function calendarDomainReducer(state: CalendarEvent[], action: CalendarDomainAction): CalendarEvent[] {
  switch (action.type) {
    case 'bulk-set':
      return [...action.events];
    case 'delete':
      return state.filter((event) => event.id !== action.id);
    case 'upsert': {
      const index = state.findIndex((event) => event.id === action.event.id);
      if (index < 0) return [...state, action.event];
      const next = [...state];
      next[index] = action.event;
      return next;
    }
    default:
      return state;
  }
}
