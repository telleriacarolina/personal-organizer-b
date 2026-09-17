import { createLocalStorageStateRepository } from '@/lib/persistence';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMemo } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const repository = useMemo(() => createLocalStorageStateRepository(key, initialValue), [key]);
  return usePersistentState(repository, initialValue);
}
