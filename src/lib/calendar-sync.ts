import { toast } from 'sonner';
import type { CalendarEvent, FamilyCalendarPlannerEvent } from '@/types';
import { stateRepositories, type CalendarSyncPort, type StateRepository } from '@/lib/persistence';

function buildDateTimeIso(dateMs: number, time?: string, fallbackTime = '09:00') {
  const date = new Date(dateMs);
  const [hours, minutes] = (time || fallbackTime).split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}

export function mapToFamilyCalendarPlannerEvent(event: CalendarEvent): FamilyCalendarPlannerEvent {
  const start = buildDateTimeIso(event.date, event.startTime, '09:00');
  const end = buildDateTimeIso(event.date, event.endTime || event.startTime, '10:00');

  return {
    id: event.id,
    calendarId: 'family-calendar-default',
    title: event.title,
    description: event.description || undefined,
    startTime: start,
    endTime: end,
    allDay: Boolean(event.allDay),
    visibility: 'private',
    requiresApproval: false,
    createdBy: 'personal-organizer-user',
    attendees: ['personal-organizer-user'],
    location: event.location || undefined,
    reminders: event.reminder ? [event.reminder] : [],
    color: event.color,
    createdAt: new Date(event.createdAt).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export class FamilyCalendarSyncService implements CalendarSyncPort {
  constructor(
    private readonly plannerEventsRepository: StateRepository<FamilyCalendarPlannerEvent[]> = stateRepositories.plannerEvents,
  ) {}

  async syncEvents(events: FamilyCalendarPlannerEvent[]): Promise<void> {
    this.plannerEventsRepository.save(events);

    const apiBaseUrl = import.meta.env.VITE_FAMILY_CALENDAR_API_URL;
    if (!apiBaseUrl) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/events/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }
    } catch {
      toast.error('Unable to sync with Family Calendar Planner API');
    }
  }
}

export const familyCalendarSync = new FamilyCalendarSyncService();

export async function syncCalendarEventsToFamilyPlanner(events: CalendarEvent[]) {
  await familyCalendarSync.syncEvents(events.map(mapToFamilyCalendarPlannerEvent));
}
