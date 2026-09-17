import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import type { StateRepository } from '@/lib/persistence';

export function usePersistentState<T>(
  repository: StateRepository<T>,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  const isInitialMountRef = useRef(true);
  initialValueRef.current = initialValue;

  const [value, setValue] = useState<T>(() => repository.load());

  useEffect(() => {
    try {
      repository.save(value);
    } catch (error) {
      console.warn('[usePersistentState] Could not persist value:', error);
    }
  }, [repository, value]);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    try {
      setValue(repository.load());
    } catch {
      setValue(initialValueRef.current);
    }
  }, [repository]);

  return [value, setValue];
}
