import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

type PersistMode = 'immediate' | 'debounced' | 'idle';

interface UseLocalStorageStateOptions {
  persistMode?: PersistMode;
  debounceMs?: number;
}

type IdleCallbackHandle = number;
type IdleCallbackFn = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
) => IdleCallbackHandle;
type CancelIdleCallbackFn = (handle: IdleCallbackHandle) => void;

const getIdleCallback = (): IdleCallbackFn | undefined => {
  if (typeof window === 'undefined') return undefined;
  return 'requestIdleCallback' in window
    ? (window.requestIdleCallback.bind(window) as IdleCallbackFn)
    : undefined;
};

const getCancelIdleCallback = (): CancelIdleCallbackFn | undefined => {
  if (typeof window === 'undefined') return undefined;
  return 'cancelIdleCallback' in window
    ? (window.cancelIdleCallback.bind(window) as CancelIdleCallbackFn)
    : undefined;
};

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageStateOptions
): [T, Dispatch<SetStateAction<T>>] {
  const persistMode = options?.persistMode ?? 'immediate';
  const debounceMs = options?.debounceMs ?? 250;
  const initialValueRef = useRef(initialValue);
  const isInitialMountRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleHandleRef = useRef<IdleCallbackHandle | null>(null);
  const latestSerializedRef = useRef<string | null>(null);

  const clearPendingPersistence = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (idleHandleRef.current !== null) {
      const cancelIdle = getCancelIdleCallback();
      cancelIdle?.(idleHandleRef.current);
      idleHandleRef.current = null;
    }
  };

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
      const persist = (serialized: string) => {
        try {
          window.localStorage.setItem(key, serialized);
          latestSerializedRef.current = serialized;
        } catch (e) {
          // QuotaExceededError: storage is full (common when storing large Base64 media)
          console.warn(`[useLocalStorageState] Could not persist key "${key}":`, e);
        }
      };

      clearPendingPersistence();
      const serialized = JSON.stringify(value);
      if (latestSerializedRef.current === serialized) {
        return;
      }

      if (persistMode === 'immediate' || debounceMs <= 0) {
        persist(serialized);
        return;
      }

      const schedulePersist = () => {
        if (persistMode === 'idle') {
          const requestIdle = getIdleCallback();
          if (requestIdle) {
            idleHandleRef.current = requestIdle(() => {
              persist(serialized);
              idleHandleRef.current = null;
            }, { timeout: Math.max(250, debounceMs) });
            return;
          }
        }

        timeoutRef.current = setTimeout(() => {
          persist(serialized);
          timeoutRef.current = null;
        }, debounceMs);
      };

      schedulePersist();
      return () => {
        clearPendingPersistence();
      };
    }
  }, [debounceMs, key, persistMode, value]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const flushOnUnload = () => {
      if (timeoutRef.current || idleHandleRef.current !== null) {
        clearPendingPersistence();
      try {
        const serialized = JSON.stringify(value);
        window.localStorage.setItem(key, serialized);
        latestSerializedRef.current = serialized;
      } catch (e) {
        console.warn(`[useLocalStorageState] Could not persist key "${key}":`, e);
      }
      }
    };

    window.addEventListener('beforeunload', flushOnUnload);
    return () => {
      window.removeEventListener('beforeunload', flushOnUnload);
      flushOnUnload();
    };
  }, [key, value]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const serializedValue = window.localStorage.getItem(key);
    if (serializedValue === null) {
      latestSerializedRef.current = null;
      return;
    }

    latestSerializedRef.current = serializedValue;
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
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
