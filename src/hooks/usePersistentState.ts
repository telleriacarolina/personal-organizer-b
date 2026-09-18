import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import type { StateRepository } from '@/lib/persistence';

export function usePersistentState<T>(
  repository: StateRepository<T>,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  const skipNextSaveRef = useRef(true);
  const repositoryRef = useRef(repository);
  initialValueRef.current = initialValue;

  const [value, setValue] = useState<T>(() => {
    try {
      return repository.load();
    } catch {
      return initialValueRef.current;
    }
  });

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    try {
      repository.save(value);
    } catch (error) {
      console.warn('[usePersistentState] Could not persist value:', error);
    }
  }, [repository, value]);

  useEffect(() => {
    if (repositoryRef.current === repository) {
      return;
    }

    repositoryRef.current = repository;
    skipNextSaveRef.current = true;

    try {
      setValue(repository.load());
    } catch {
      setValue(initialValueRef.current);
    }
  }, [repository]);

  return [value, setValue];
}
