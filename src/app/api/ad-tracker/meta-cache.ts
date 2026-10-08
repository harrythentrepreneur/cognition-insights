// ============================================================================
// Server-side cache for Meta Ads API responses
// Prevents excessive API calls that could trigger rate limits
// Cache TTL: 30 minutes (Meta data doesn't change in real-time)
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

declare global {
  var __metaApiCache: Map<string, CacheEntry<any>> | undefined
  var __metaApiInFlight: Map<string, Promise<any>> | undefined
}

function getCache(): Map<string, CacheEntry<any>> {
  if (!global.__metaApiCache) {
    global.__metaApiCache = new Map()
  }
  return global.__metaApiCache
}

function getInFlight(): Map<string, Promise<any>> {
  if (!global.__metaApiInFlight) {
    global.__metaApiInFlight = new Map()
  }
  return global.__metaApiInFlight
}

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCached<T>(key: string): T | null {
  const cache = getCache()
  const entry = cache.get(key)
  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Store data in cache
 */
export function setCache<T>(key: string, data: T): void {
  const cache = getCache()
  cache.set(key, { data, timestamp: Date.now(), key })

  // Evict old entries if cache grows too large
  if (cache.size > 50) {
    const now = Date.now()
    for (const [k, v] of cache) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k)
    }
  }
}

/**
 * Deduplicates concurrent requests for the same key.
 * If a request is already in-flight, return the same promise.
 */
export async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key)
  if (cached) return cached

  // Check if same request is already in-flight
  const inFlight = getInFlight()
  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  // Make the request and cache the result
  const promise = fetcher().then(result => {
    setCache(key, result)
    inFlight.delete(key)
    return result
  }).catch(err => {
    inFlight.delete(key)
    throw err
  })

  inFlight.set(key, promise)
  return promise
}

/**
 * Fetches from Meta API with built-in rate limit handling.
 * Returns null instead of throwing on rate limit errors (graceful degradation).
 */
export async function safeFetchMeta(url: string): Promise<Response | null> {
  const res = await fetch(url)

  // Rate limited — return null for graceful fallback
  if (res.status === 403 || res.status === 429) {
    const body = await res.json().catch(() => ({}))
    const errorMsg = body?.error?.message || ''
    console.warn(`[Meta API] Rate limited: ${errorMsg}`)

    // Check for account-level issues (these are more serious)
    if (errorMsg.includes('disabled') || errorMsg.includes('banned') || errorMsg.includes('suspended')) {
      console.error('[Meta API] ⚠️ Account may have restrictions — stopping all further requests')
      // Cache a "blocked" flag to prevent any further calls for 1 hour
      setCache('__meta_blocked', { blocked: true, message: errorMsg })
    }

    return null
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Meta API error (${res.status}): ${body?.error?.message || res.statusText}`)
  }

  return res
}

/**
 * Check if Meta API is currently blocked (due to serious errors)
 */
export function isMetaBlocked(): { blocked: boolean; message?: string } {
  const flag = getCached<{ blocked: boolean; message: string }>('__meta_blocked')
  return flag || { blocked: false }
}
