import { useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { createLocalStorageStateRepository } from '@/lib/persistence';
import { usePersistentState } from '@/hooks/usePersistentState';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  const repository = useMemo(
    () => createLocalStorageStateRepository(key, initialValueRef.current),
    [key],
  );

  return usePersistentState(repository, initialValue);
}
