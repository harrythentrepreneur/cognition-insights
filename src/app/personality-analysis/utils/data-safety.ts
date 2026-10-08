/**
 * Utility functions for safe data access in personality analysis components
 */

/**
 * Safely access an array with a default empty array fallback
 */
export function safeArray<T>(arr: T[] | null | undefined): T[] {
  return arr || [];
}

/**
 * Safely access an object with a default empty object fallback
 */
export function safeObject<T extends Record<string, any>>(obj: T | null | undefined): T {
  return obj || {} as T;
}

/**
 * Safely get array length
 */
export function safeLength(arr: any[] | null | undefined): number {
  return arr?.length || 0;
}

/**
 * Safely access array element by index
 */
export function safeArrayAccess<T>(arr: T[] | null | undefined, index: number, defaultValue: T | null = null): T | null {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
}

/**
 * Safely get object entries
 */
export function safeEntries<T extends Record<string, any>>(obj: T | null | undefined): [string, any][] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.entries(obj);
}

/**
 * Safely get object keys
 */
export function safeKeys<T extends Record<string, any>>(obj: T | null | undefined): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.keys(obj);
}

/**
 * Safely get object values
 */
export function safeValues<T extends Record<string, any>>(obj: T | null | undefined): any[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  return Object.values(obj);
}

/**
 * Safe number with default
 */
export function safeNumber(value: number | null | undefined, defaultValue: number = 0): number {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}

/**
 * Safe string with default
 */
export function safeString(value: string | null | undefined, defaultValue: string = ''): string {
  return value || defaultValue;
}

/**
 * Type guard to check if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if array is non-empty
 */
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Type guard to check if object has keys
 */
export function hasKeys<T extends Record<string, any>>(obj: T | null | undefined): obj is T {
  return obj !== null && obj !== undefined && typeof obj === 'object' && Object.keys(obj).length > 0;
}