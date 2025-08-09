/**
 * @fileoverview Performance utility implementations
 * Concrete implementations of performance utilities like lazy loading, memoization, etc.
 */

import type {
  Lazy,
  Memoized,
  Debounced,
  Throttled,
  PerformanceUtils
} from './performance-types.js';

/**
 * Create a lazy-loaded value
 */
export function createLazy<T>(factory: () => T): Lazy<T> {
  let value: T;
  let loaded = false;

  const lazy = () => {
    if (!loaded) {
      value = factory();
      loaded = true;
    }
    return value;
  };

  lazy.isLoaded = () => loaded;
  lazy.clear = () => {
    loaded = false;
    value = undefined as any;
  };
  lazy.peek = () => loaded ? value : undefined;

  return lazy as Lazy<T>;
}

/**
 * Memoize a function
 */
export function memoize<T extends (..._args: any[]) => any>(
  fn: T,
  keyGenerator?: (..._args: Parameters<T>) => string
): Memoized<T> {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.has = (key: string) => cache.has(key);
  memoized.delete = (key: string) => cache.delete(key);

  return memoized as Memoized<T>;
}

/**
 * Debounce a function
 */
export function debounce<T extends (..._args: any[]) => any>(
  fn: T,
  delay: number
): Debounced<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T> | undefined = undefined;

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs !== null) {
        lastResult = fn(...lastArgs);
        timeoutId = null;
        lastArgs = null;
      }
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = (): ReturnType<T> | undefined => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (lastArgs !== null) {
        lastResult = fn(...lastArgs);
        lastArgs = null;
      }
    }
    return lastResult;
  };

  debounced.pending = (): boolean => timeoutId !== null;

  return debounced as Debounced<T>;
}

/**
 * Throttle a function
 */
export function throttle<T extends (..._args: any[]) => any>(
  fn: T,
  limit: number
): Throttled<T> {
  let inThrottle = false;
  let lastResult: ReturnType<T> | undefined = undefined;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttled = (...args: Parameters<T>): ReturnType<T> | undefined => {
    lastArgs = args;

    if (!inThrottle) {
      lastResult = fn(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs !== null) {
          lastResult = fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }

    return lastResult;
  };

  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  throttled.flush = (): ReturnType<T> | undefined => {
    if (lastArgs !== null) {
      lastResult = fn(...lastArgs);
      lastArgs = null;
    }
    return lastResult;
  };

  return throttled as Throttled<T>;
}

/**
 * Deep clone an object with prototype pollution protection
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;

  const cloned = {} as T;

  // Blacklist dangerous keys that could lead to prototype pollution
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key in obj) {
    // Skip dangerous keys to prevent prototype pollution
    if (dangerousKeys.includes(key)) {
      continue;
    }

    // Object property access needed for generic deep cloning utility
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    }
  }

  return cloned;
}

/**
 * Deep freeze an object
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    // Generic object property access needed for deep freeze utility
    const value = (obj as any)[prop];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  });

  return Object.freeze(obj);
}

/**
 * Deep merge two objects with prototype pollution protection
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  // Blacklist dangerous keys that could lead to prototype pollution
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key in source) {
    // Skip dangerous keys to prevent prototype pollution
    if (dangerousKeys.includes(key)) {
      continue;
    }

    // Object property access needed for generic deep merge utility
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = (source as any)[key];
      const targetValue = (result as any)[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        sourceValue.constructor === Object && // Ensure it's a plain object
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        targetValue.constructor === Object // Ensure it's a plain object
      ) {
        // Generic object assignment needed for deep merge utility
        (result as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Generic object assignment needed for deep merge utility
        (result as any)[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Measure execution time of a function
 */
export function measureExecutionTime<T>(fn: () => T): { result: T; executionTime: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  return {
    result,
    executionTime: end - start
  };
}

/**
 * Measure execution time of an async function
 */
export async function measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    result,
    executionTime: end - start
  };
}

/**
 * Complete performance utilities object
 */
export const PerformanceUtilsInstance: PerformanceUtils = {
  createLazy,
  memoize,
  debounce,
  throttle,
  deepClone,
  deepFreeze,
  deepMerge,
  measureExecutionTime,
  measureAsyncExecutionTime
};
