// ============================================================================
// Client-side Sydney timezone utility
// Ensures the frontend uses the same timezone as the backend for date bucketing
// ============================================================================

const SYDNEY_TZ = process.env.NEXT_PUBLIC_REPORTING_TIMEZONE || 'UTC'

/**
 * Get today's date string (YYYY-MM-DD) in Sydney timezone.
 * This matches the backend's `timestampToSydneyDate()` function,
 * ensuring the frontend and backend agree on what "today" is.
 */
export function getSydneyToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Convert any Date object to a YYYY-MM-DD string in Sydney timezone.
 */
export function dateToSydneyString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
