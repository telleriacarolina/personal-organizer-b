export type CollectionMutation<T> = (items: readonly T[]) => T[];

export interface Identifiable {
  id: string;
}

export const appendItem = <T>(item: T): CollectionMutation<T> => (items) => [...items, item];

export const createItem = appendItem;

export const replaceItems = <T>(items: readonly T[]): CollectionMutation<T> => () => [...items];

export const deleteItem = <T extends Identifiable>(id: string): CollectionMutation<T> => (items) =>
  items.filter((item) => item.id !== id);

export const updateItem = <T extends Identifiable>(
  id: string,
  updater: (item: T) => T,
): CollectionMutation<T> => (items) =>
  items.map((item) => (item.id === id ? updater(item) : item));

export const patchItem = <T extends Identifiable>(
  id: string,
  patch: Partial<T>,
): CollectionMutation<T> => updateItem(id, (item) => ({ ...item, ...patch }));

export const toggleItem = <T extends Identifiable>(
  id: string,
  toggler: (item: T) => T,
): CollectionMutation<T> => updateItem(id, toggler);

export const upsertItem = <T extends Identifiable>(
  nextItem: T,
  matcher: (item: T, next: T) => boolean = (item, next) => item.id === next.id,
): CollectionMutation<T> => (items) => {
  let matched = false;
  const nextItems = items.map((item) => {
    if (!matcher(item, nextItem)) {
      return item;
    }
    matched = true;
    return nextItem;
  });

  return matched ? nextItems : [...nextItems, nextItem];
};

export const reorderItems = <T>(items: readonly T[]): CollectionMutation<T> => () => [...items];
