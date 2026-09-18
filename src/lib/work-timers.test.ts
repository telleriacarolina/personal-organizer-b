import type { TimeEntry } from '@/types';
import { resolveActiveTimerEntryId } from '@/lib/work-timers';

describe('resolveActiveTimerEntryId', () => {
  const runningEntry: TimeEntry = {
    id: 'running',
    description: 'Task',
    startTime: 100,
    createdAt: 100,
  };

  it('preserves a valid persisted running timer after reload', () => {
    expect(resolveActiveTimerEntryId([runningEntry], 'running')).toBe('running');
  });

  it('recovers a single orphaned running timer when no persisted active id exists', () => {
    expect(resolveActiveTimerEntryId([runningEntry], null)).toBe('running');
  });

  it('clears a missing persisted timer reference', () => {
    expect(resolveActiveTimerEntryId([runningEntry], 'missing')).toBeNull();
  });
});
