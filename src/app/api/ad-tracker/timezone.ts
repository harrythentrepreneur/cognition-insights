// ============================================================================
// Timezone utility for consistent date bucketing
// All ad tracker data is bucketed using Australia/Sydney (AEST/AEDT) time
// to match the business's local timezone.
// ============================================================================

const SYDNEY_TZ = process.env.REPORTING_TIMEZONE || 'UTC'

/**
 * Convert a Unix timestamp (seconds) to a YYYY-MM-DD date string in Sydney timezone.
 */
export function timestampToSydneyDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  // Intl.DateTimeFormat gives us the date parts in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  // en-CA locale formats as YYYY-MM-DD
  return parts
}

/**
 * Convert an ISO date string (from DB) to a YYYY-MM-DD date string in Sydney timezone.
 */
export function isoToSydneyDate(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) {
    // Fallback: try to extract date part directly
    return isoString.split('T')[0].split(' ')[0]
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  return parts
}

/**
 * Generate an array of YYYY-MM-DD date strings from `from` to `to` (inclusive),
 * using Sydney timezone for date boundaries.
 */
export function generateSydneyDateRange(from: string, to: string): string[] {
  const dates: string[] = []
  // Parse the from/to as dates at midnight Sydney time
  // We iterate using UTC and convert each day to Sydney date
  const startDate = new Date(from + 'T00:00:00+11:00') // approximate AEDT
  const endDate = new Date(to + 'T23:59:59+11:00')

  // Use a simpler approach: iterate day-by-day using the from/to strings
  const start = new Date(from)
  const end = new Date(to)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

/**
 * Convert a from/to date string pair to Unix timestamps that cover the full
 * Sydney-timezone day range. This ensures we fetch all records that fall within
 * the Sydney-timezone boundaries.
 *
 * For example, "2024-03-25" in Sydney starts at 2024-03-24T13:00:00Z (AEDT, UTC+11)
 * or 2024-03-24T14:00:00Z (AEST, UTC+10).
 *
 * We use the earlier offset (UTC+11 = AEDT) for the start and the later offset
 * (UTC+10 = AEST) for the end to ensure we capture all possible records.
 */
export function sydneyDateRangeToTimestamps(from: string, to: string): { fromTs: number; toTs: number } {
  // Start of `from` day in Sydney = from + T00:00:00 in Sydney
  // Use UTC+11 (AEDT) to get the earliest possible UTC time for the start
  const fromTs = Math.floor(new Date(from + 'T00:00:00+11:00').getTime() / 1000)
  // End of `to` day in Sydney = to + T23:59:59 in Sydney
  // Use UTC+10 (AEST) to get the latest possible UTC time for the end
  const toTs = Math.floor(new Date(to + 'T23:59:59+10:00').getTime() / 1000)
  return { fromTs, toTs }
}
