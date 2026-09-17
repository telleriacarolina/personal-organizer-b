import type { ShoppingReminder } from '@/types';
import { parseRequiredDateInput, processDueShoppingReminders, upsertShoppingReminders } from '@/lib/shopping-state';

describe('shopping-state helpers', () => {
  it('rejects empty and malformed receipt dates', () => {
    expect(parseRequiredDateInput('')).toBeNull();
    expect(parseRequiredDateInput('not-a-date')).toBeNull();
    expect(parseRequiredDateInput('2026-09-17')).not.toBeNull();
  });

  it('upserts generated reminders instead of duplicating them', () => {
    const existing: ShoppingReminder[] = [
      {
        id: 'reminder-1',
        storeName: 'Store A',
        category: 'food',
        frequency: 'weekly',
        nextReminderDate: 100,
        averageSpend: 10,
        commonItems: ['Milk'],
        enabled: true,
        createdAt: 1,
      },
    ];

    const incoming: ShoppingReminder[] = [
      {
        id: 'new-id',
        storeName: 'Store A',
        category: 'food',
        frequency: 'weekly',
        nextReminderDate: 200,
        averageSpend: 20,
        commonItems: ['Milk', 'Bread'],
        enabled: true,
        createdAt: 2,
      },
    ];

    const updated = upsertShoppingReminders(existing, incoming);

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      id: 'reminder-1',
      nextReminderDate: 200,
      averageSpend: 20,
      commonItems: ['Milk', 'Bread'],
    });
  });

  it('marks due reminders exactly once per processing window', () => {
    const reminders: ShoppingReminder[] = [
      {
        id: 'reminder-1',
        storeName: 'Store A',
        category: 'food',
        frequency: 'weekly',
        nextReminderDate: 100,
        averageSpend: 10,
        commonItems: ['Milk'],
        enabled: true,
        createdAt: 1,
      },
    ];

    const firstPass = processDueShoppingReminders(reminders, 200);
    const secondPass = processDueShoppingReminders(firstPass.reminders, 300);

    expect(firstPass.triggered).toHaveLength(1);
    expect(firstPass.reminders[0].lastTriggered).toBe(200);
    expect(secondPass.triggered).toHaveLength(0);
  });
});
