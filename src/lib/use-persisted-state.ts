"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for useState that persists the value to localStorage
 * under `key`. Starts from `initial` on the server and first client render
 * (avoiding hydration mismatch), then loads any saved value after mount so
 * filters survive navigation and reloads.
 */
export function usePersistedState<T>(
  key: string,
  initial: T
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // Hydrate from storage after mount (intentional — avoids SSR mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* corrupt/unavailable storage → keep initial */
    }
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full/blocked → ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
