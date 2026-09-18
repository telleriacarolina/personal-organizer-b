import type { Receipt, ShoppingReminder, ShoppingTrip } from '@/types';
import { upsertItem } from '@/lib/atomic-state';
import { createId } from '@/lib/id';

const isFiniteTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function parseRequiredDateInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isValidTimestamp(value: unknown): value is number {
  return isFiniteTimestamp(value);
}

export function sanitizeReceipts(receipts: readonly Receipt[]): Receipt[] {
  return receipts.filter((receipt) => isFiniteTimestamp(receipt.date) && isFiniteTimestamp(receipt.createdAt));
}

export function sanitizeTrips(trips: readonly ShoppingTrip[]): ShoppingTrip[] {
  return trips.filter((trip) => isFiniteTimestamp(trip.date));
}

export function sanitizeReminders(reminders: readonly ShoppingReminder[]): ShoppingReminder[] {
  return reminders.filter(
    (reminder) =>
      isFiniteTimestamp(reminder.nextReminderDate) &&
      isFiniteTimestamp(reminder.createdAt) &&
      (reminder.lastTriggered === undefined || isFiniteTimestamp(reminder.lastTriggered)),
  );
}

export function buildShoppingReminderKey(reminder: Pick<ShoppingReminder, 'storeName' | 'frequency'>): string {
  return `${reminder.storeName.trim().toLowerCase()}::${reminder.frequency}`;
}

export function withReminderIdentity(reminder: Omit<ShoppingReminder, 'id'> & { id?: string }): ShoppingReminder {
  return {
    ...reminder,
    id: reminder.id ?? createId('shopping-reminder'),
  };
}

export function upsertShoppingReminders(
  existing: readonly ShoppingReminder[],
  incoming: readonly ShoppingReminder[],
): ShoppingReminder[] {
  return incoming.reduce((current, reminder) => {
    const reminderKey = buildShoppingReminderKey(reminder);
    return upsertItem(
      {
        ...reminder,
        id:
          current.find((candidate) => buildShoppingReminderKey(candidate) === reminderKey)?.id ??
          reminder.id,
      },
      (candidate, next) => buildShoppingReminderKey(candidate) === buildShoppingReminderKey(next),
    )(current);
  }, [...existing]);
}

export interface ShoppingReminderProcessingResult {
  reminders: ShoppingReminder[];
  triggered: ShoppingReminder[];
}

export function processDueShoppingReminders(
  reminders: readonly ShoppingReminder[],
  now: number,
): ShoppingReminderProcessingResult {
  const triggered = reminders.filter(
    (reminder) =>
      reminder.enabled &&
      reminder.nextReminderDate <= now &&
      (!reminder.lastTriggered || now - reminder.lastTriggered > 24 * 60 * 60 * 1000),
  );

  if (triggered.length === 0) {
    return { reminders: reminders as ShoppingReminder[], triggered: [] };
  }

  const triggeredIds = new Set(triggered.map((reminder) => reminder.id));

  return {
    triggered,
    reminders: reminders.map((reminder) =>
      triggeredIds.has(reminder.id) ? { ...reminder, lastTriggered: now } : reminder,
    ),
  };
}
