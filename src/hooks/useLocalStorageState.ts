import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { readLocalStorageJson, writeLocalStorageJson } from '@/lib/persistence';
import { createLocalStorageStateRepository } from '@/lib/persistence';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useMemo, useRef } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    return readLocalStorageJson(key, initialValue);
  });
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const setPersistedValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    const resolvedValue = typeof nextValue === 'function'
      ? (nextValue as (value: T) => T)(valueRef.current)
      : nextValue;

    if (typeof window !== 'undefined') {
      const result = writeLocalStorageJson(key, resolvedValue);
      if (!result.ok) {
        return;
      }
    }

    valueRef.current = resolvedValue;
    setValue(resolvedValue);
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const nextValue = readLocalStorageJson(key, initialValueRef.current);
    valueRef.current = nextValue;
    setValue(nextValue);
  }, [key]);

  return [value, setPersistedValue];
  const repository = useMemo(() => createLocalStorageStateRepository(key, initialValueRef.current), [key]);
  return usePersistentState(repository, initialValue);
}
