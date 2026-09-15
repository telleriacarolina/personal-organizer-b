import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
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

    const serializedValue = window.localStorage.getItem(key);
    if (serializedValue === null) {
      setValue(initialValueRef.current);
      return;
    }

    try {
      setValue(JSON.parse(serializedValue) as T);
    } catch {
      setValue(initialValueRef.current);
    }
  }, [key]);

  return [value, setValue];
}
