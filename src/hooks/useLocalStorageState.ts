import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const previousKeyRef = useRef(key);
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    const serializedValue = window.localStorage.getItem(key);
    if (serializedValue === null) {
      return initialValue;
    }

    try {
      return JSON.parse(serializedValue) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (previousKeyRef.current !== key) {
      window.localStorage.removeItem(previousKeyRef.current);
      previousKeyRef.current = key;
    }

    const serializedValue = window.localStorage.getItem(key);
    if (serializedValue === null) {
      setValue(initialValue);
      return;
    }

    try {
      setValue(JSON.parse(serializedValue) as T);
    } catch {
      setValue(initialValue);
    }
  }, [key, initialValue]);

  return [value, setValue];
}
