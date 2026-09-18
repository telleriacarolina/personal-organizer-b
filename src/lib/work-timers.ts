import type { TimeEntry } from '@/types';

export function resolveActiveTimerEntryId(
  timeEntries: readonly TimeEntry[],
  activeTimerEntryId?: string | null,
): string | null {
  const runningEntries = timeEntries.filter((entry) => !entry.endTime);

  if (activeTimerEntryId) {
    return runningEntries.some((entry) => entry.id === activeTimerEntryId) ? activeTimerEntryId : null;
  }

  return runningEntries.length === 1 ? runningEntries[0].id : null;
}
