import type { Widget } from '@/types';
import { applyGlobalLockState, toggleGlobalLockValue } from '@/lib/dashboard-state';

describe('dashboard-state global lock helpers', () => {
  it('double toggling returns to the original lock state', () => {
    const first = toggleGlobalLockValue(false);
    const second = toggleGlobalLockValue(first);

    expect(second).toBe(false);
  });

  it('applies the lock state to every widget consistently', () => {
    const widgets: Widget[] = [
      { id: 'tasks-1', type: 'tasks', position: 0, tasks: [] },
      { id: 'notes-1', type: 'notes', position: 1, notes: [] },
    ];

    const locked = applyGlobalLockState(widgets, true);
    const unlocked = applyGlobalLockState(locked, false);

    expect(locked.every((widget) => widget.size?.locked === true)).toBe(true);
    expect(unlocked.every((widget) => widget.size?.locked === false)).toBe(true);
  });
});
