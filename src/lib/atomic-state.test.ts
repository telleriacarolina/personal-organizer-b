import { createItem, deleteItem, patchItem, replaceItems, toggleItem, updateItem, upsertItem } from '@/lib/atomic-state';

interface TaskRecord {
  id: string;
  title: string;
  completed: boolean;
}

describe('atomic-state helpers', () => {
  it('preserves sequential rapid mutations against the same collection', () => {
    const initial: TaskRecord[] = [
      { id: 'a', title: 'Task A', completed: false },
      { id: 'b', title: 'Task B', completed: false },
    ];

    const completedThenDeleted = deleteItem<TaskRecord>('b')(
      toggleItem<TaskRecord>('a', (task) => ({ ...task, completed: !task.completed }))(initial),
    );

    expect(completedThenDeleted).toEqual([{ id: 'a', title: 'Task A', completed: true }]);
  });

  it('supports create, update, patch, replace, and upsert operations', () => {
    const initial: TaskRecord[] = [{ id: 'a', title: 'Task A', completed: false }];

    const created = createItem({ id: 'b', title: 'Task B', completed: false })(initial);
    const updated = updateItem<TaskRecord>('a', (task) => ({ ...task, title: 'Renamed' }))(created);
    const patched = patchItem<TaskRecord>('b', { completed: true })(updated);
    const upserted = upsertItem<TaskRecord>({ id: 'c', title: 'Task C', completed: false })(patched);
    const replaced = replaceItems(upserted)([]);

    expect(replaced).toEqual([
      { id: 'a', title: 'Renamed', completed: false },
      { id: 'b', title: 'Task B', completed: true },
      { id: 'c', title: 'Task C', completed: false },
    ]);
  });
});
