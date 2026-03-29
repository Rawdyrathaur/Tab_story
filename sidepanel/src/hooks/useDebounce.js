import { useState, useEffect } from 'react';

/**
 * useDebounce hook - debounces value updates
 * @param {any} value - Value to debounce
 * @param {number} [delay=300] - Delay in milliseconds
 * @returns {any} Debounced value
 */

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
