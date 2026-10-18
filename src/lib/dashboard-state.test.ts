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

  it('does not rewrite widgets when the requested lock state is already applied', () => {
    const widgets: Widget[] = [
      {
        id: 'tasks-1',
        type: 'tasks',
        position: 0,
        size: { width: 350, height: 400, locked: true },
        tasks: [],
      },
    ];

    expect(applyGlobalLockState(widgets, true)).toBe(widgets);
  });

  it('stabilizes references across repeated applications of the same lock state', () => {
    const widgets: Widget[] = [
      { id: 'tasks-1', type: 'tasks', position: 0, tasks: [] },
      {
        id: 'notes-1',
        type: 'notes',
        position: 1,
        size: { width: 350, height: 400, locked: false },
        notes: [],
      },
    ];

    const firstUnlocked = applyGlobalLockState(widgets, false);
    const secondUnlocked = applyGlobalLockState(firstUnlocked, false);
    const firstLocked = applyGlobalLockState(firstUnlocked, true);
    const secondLocked = applyGlobalLockState(firstLocked, true);

    expect(secondUnlocked).toBe(firstUnlocked);
    expect(secondUnlocked[0]).toBe(firstUnlocked[0]);
    expect(secondUnlocked[1]).toBe(firstUnlocked[1]);

    expect(secondLocked).toBe(firstLocked);
    expect(secondLocked[0]).toBe(firstLocked[0]);
    expect(secondLocked[1]).toBe(firstLocked[1]);
  });
});
