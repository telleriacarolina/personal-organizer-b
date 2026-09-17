import { createLocalStorageStateRepository } from '@/lib/persistence';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMemo, useRef } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const repository = useMemo(() => createLocalStorageStateRepository(key, initialValueRef.current), [key]);
  return usePersistentState(repository, initialValue);
}
