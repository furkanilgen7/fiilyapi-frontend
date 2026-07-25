"use client";

import { useEffect, useState } from "react";

/**
 * Değeri `delay` ms boyunca sakinleştikten sonra yayınlar — her tuş vuruşunda ağ isteği
 * atılmasını engeller. Değer değişince önceki zamanlayıcı iptal edilir (son yazım kazanır).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
