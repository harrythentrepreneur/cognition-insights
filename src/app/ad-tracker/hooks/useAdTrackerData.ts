'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSydneyToday } from '../utils/timezone';

// ============================================================================
// localStorage stale-while-revalidate cache helpers
// Show cached data immediately, then silently refresh from API
// ============================================================================

const CACHE_PREFIX = 'adtracker-cache:';

function getCachedData<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (_e) {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (_e) {
    // Quota exceeded or other localStorage error — silently ignore
  }
}

// ============================================================================
// Types matching API response shapes (aligned with one-time payment model)
// ============================================================================

interface StripeDailyBucket {
  date: string;
  revenue: number;
  refunds: number;
  refundCount: number;
  newCustomers: number;
  trialSignups: number;
  successfulCharges: number;
  cashPending: number;
  arr: number;
  churnCount: number;
  activeSubsCount: number;
  trialPipelineMonthly: number;
  trialPipelineYearly: number;
  trialCountMonthly: number;
  trialCountYearly: number;
  trialSignupsMonthly: number;
  trialSignupsYearly: number;
  // Server-side attribution correction fields
  isAttributionEstimate?: boolean;
  netRevenueWithAttribution?: number | null;
  conversionRateSnapshot?: number | null;
}

interface StripeMetricsResponse {
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    totalCharges: number;
    totalNewCustomers: number;
    totalTrialSignups: number;
    activeTrialsCount: number;
    activeTrialsValue: number;
    trialConversionRate: number;
    estimatedPendingCash: number;
    totalRefundCount: number;
    uniquePayingCustomers: number;
    ltv: number;
    refundRate: number;
    avgTransactionValue: number;
    // Trial breakdown by interval
    activeMonthlyTrialsCount: number;
    activeMonthlyTrialsValue: number;
    activeYearlyTrialsCount: number;
    activeYearlyTrialsValue: number;
    // Historical trial stats
    historicalTrialsTotal: number;
    historicalTrialsConverted: number;
    historicalTrialsFailed: number;
    trialConversionRateByCount: number;
  };
  timeSeries: StripeDailyBucket[];
}

interface MetaDailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  conversionValue: number;
  reach: number;
}

export interface MetaAdSet {
  adsetId: string;
  adsetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

interface MetaAdsResponse {
  summary: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    avgCpc: number;
    avgCpm: number;
    avgCtr: number;
    totalConversions: number;
    totalConversionValue: number;
    roas: number;
  };
  timeSeries: MetaDailyMetrics[];
  adsets: MetaAdSet[];
}

export interface MetaAdCreative {
  adId: string;
  adName: string;
  status: 'active' | 'paused' | 'archived' | string;
  creativeType: 'video' | 'image' | 'carousel' | string;
  thumbnailUrl: string | null;
  videoSourceUrl: string | null;
  imageUrl: string | null;
  fullPictureUrl: string | null;
  postUrl: string | null;
  headline: string | null;
  body: string | null;
  description: string | null;
  linkUrl: string | null;
  platform: string;
  platformColor: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    spend: number;
    revenue: number;
    roas: number;
    cpa: number;
    cpc: number;
    cpm: number;
  };
}

interface MetaCreativesResponse {
  creatives: MetaAdCreative[];
  total: number;
}

export interface LiveEvent {
  id: string;
  type: 'payment' | 'signup' | 'trial_start' | 'subscription' | 'churn' | 'refund' | 'upgrade';
  description: string;
  amount?: string;
  email: string;
  timestamp: string;
}

interface LiveEventsResponse {
  events: LiveEvent[];
  total: number;
}

interface FunnelResponse {
  stages: {
    leads: number;
    checkoutsStarted: number;
    checkoutsCompleted: number;
    purchases: number;
  };
  conversionRates: {
    leadsToCheckout: number;
    checkoutToComplete: number;
    completeToPurchase: number;
    overallConversion: number;
  };
  dropOffs: {
    leadToCheckout: number;
    checkoutAbandonment: number;
    completionToCharge: number;
  };
  timeSeries: {
    leads: Array<{ date: string; count: number }>;
    checkoutsStarted: Array<{ date: string; count: number }>;
    checkoutsCompleted: Array<{ date: string; count: number }>;
    purchases: Array<{ date: string; count: number }>;
  };
}

// ============================================================================
// Merged timeline data (what AdTrackerSection expects)
// ============================================================================

export interface MergedDailyData {
  date: string;
  // Core financials
  revenue: number;           // gross revenue from Stripe charges
  refunds: number;           // refund amount from Stripe
  netRevenue: number;        // revenue - refunds
  adSpend: number;           // Meta ad spend
  cogs: number;              // cost of goods sold (configurable %)
  profit: number;            // revenue - adSpend - cogs
  // Funnel counts
  newCustomers: number;      // new Stripe customer objects created
  trialSignups: number;      // new trial subscriptions started
  checkouts: number;         // checkout sessions started (funnel)
  purchases: number;         // completed purchases (funnel checkoutsCompleted)
  successfulCharges: number; // successful Stripe charges
  // Ad metrics from Meta
  ctr: number;               // click-through rate from Meta
  cpc: number;               // cost per click from Meta
  cpm: number;               // cost per mille from Meta
  impressions: number;       // total impressions from Meta
  reach: number;             // unique accounts reached from Meta
  frequency: number;         // impressions / reach
  // Derived metrics
  cpa: number;               // ad spend / successful charges
  roas: number;              // revenue / ad spend
  aov: number;               // average order value = revenue / charges
  ltv: number;               // cumulative revenue / cumulative customers
  refundRate: number;        // trailing 7-day refund rate by dollar
  conversionRate: number;    // purchases / new customers %
  cashPending: number;       // estimated pending cash from active trials
  arr: number;               // annual recurring revenue from active subscriptions
  mrr: number;               // monthly recurring revenue (ARR / 12)
  businessValuation: number; // 3x ARR estimate
  churn: number;             // number of canceled subscriptions that day
  churnRate: number;         // trailing 7-day churn rate percentage
  activeSubsCount: number;   // active subscriptions that day (used for calculation)
  isAttributionEstimate: boolean; // true if revenue metrics are estimated (within attribution window)
  /**
   * Projected future cash not yet collected from this day's trial cohort.
   * Populated by applyLTVForecast when a forecast horizon is active.
   * Represents "what will this cohort still earn?" — useful for the
   * "if I stopped ads today" total remaining revenue view.
   */
  remainingCohortLTV: number;
  // Per-day trial pipeline breakdown
  trialPipelineMonthly: number;
  trialPipelineYearly: number;
  trialCountMonthly: number;
  trialCountYearly: number;
  // Per-day NEW trial signups by plan interval (not cumulative)
  trialSignupsMonthly: number;
  trialSignupsYearly: number;
}

// ============================================================================
// Hook
// ============================================================================

interface UseAdTrackerDataOptions {
  from: string;
  to: string;
  interval?: 'day' | 'week';
  cogsPercent?: number;
  pollInterval?: number;
  trialAttribution?: boolean;
}

interface BooksTodayResponse {
  timeSeries: Array<{ date: string; count: number }>;
}

interface UseAdTrackerDataReturn {
  mergedTimeSeries: MergedDailyData[];
  stripeMetrics: StripeMetricsResponse | null;
  stripeLoading: boolean;
  stripeError: string | null;
  metaAds: MetaAdsResponse | null;
  metaAdsLoading: boolean;
  metaAdsError: string | null;
  creatives: MetaAdCreative[];
  creativesLoading: boolean;
  creativesError: string | null;
  liveEvents: LiveEvent[];
  liveEventsLoading: boolean;
  funnel: FunnelResponse | null;
  funnelLoading: boolean;
  funnelError: string | null;
  booksTimeSeries: Array<{ date: string; count: number }>;
  booksLoading: boolean;
  isLoading: boolean;
  refresh: () => void;
}

export function useAdTrackerData({
  from,
  to,
  interval = 'day',
  cogsPercent = 20,
  pollInterval = 10000,
  trialAttribution = true,
}: UseAdTrackerDataOptions): UseAdTrackerDataReturn {
  // Cache keys based on endpoint + date range + attribution model
  const stripeCacheKey = `stripe:${from}:${to}:${interval}:attr=${trialAttribution}`;
  const metaAdsCacheKey = `meta-ads:${from}:${to}`;
  const creativesCacheKey = `meta-creatives:${from}:${to}`;
  const liveEventsCacheKey = `live-events`;
  const funnelCacheKey = `funnel:${from}:${to}`;

  // Hydrate from cache immediately (lazy initialiser = no flicker)
  const [stripeMetrics, setStripeMetrics] = useState<StripeMetricsResponse | null>(
    () => getCachedData<StripeMetricsResponse>(stripeCacheKey)
  );
  const [stripeLoading, setStripeLoading] = useState(
    () => getCachedData<StripeMetricsResponse>(stripeCacheKey) === null
  );
  const [stripeError, setStripeError] = useState<string | null>(null);

  const [metaAds, setMetaAds] = useState<MetaAdsResponse | null>(
    () => getCachedData<MetaAdsResponse>(metaAdsCacheKey)
  );
  const [metaAdsLoading, setMetaAdsLoading] = useState(
    () => getCachedData<MetaAdsResponse>(metaAdsCacheKey) === null
  );
  const [metaAdsError, setMetaAdsError] = useState<string | null>(null);

  const [creatives, setCreatives] = useState<MetaAdCreative[]>(
    () => getCachedData<MetaAdCreative[]>(creativesCacheKey) || []
  );
  const [creativesLoading, setCreativesLoading] = useState(
    () => getCachedData<MetaAdCreative[]>(creativesCacheKey) === null
  );
  const [creativesError, setCreativesError] = useState<string | null>(null);

  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(
    () => getCachedData<LiveEvent[]>(liveEventsCacheKey) || []
  );
  const [liveEventsLoading, setLiveEventsLoading] = useState(
    () => getCachedData<LiveEvent[]>(liveEventsCacheKey) === null
  );

  const [funnel, setFunnel] = useState<FunnelResponse | null>(
    () => getCachedData<FunnelResponse>(funnelCacheKey)
  );
  const [funnelLoading, setFunnelLoading] = useState(
    () => getCachedData<FunnelResponse>(funnelCacheKey) === null
  );
  const [funnelError, setFunnelError] = useState<string | null>(null);

  const booksCacheKey = `books-ts:${from}:${to}`;
  const [booksTimeSeries, setBooksTimeSeries] = useState<Array<{ date: string; count: number }>>(
    () => getCachedData<BooksTodayResponse>(booksCacheKey)?.timeSeries ?? []
  );
  const [booksLoading, setBooksLoading] = useState(
    () => getCachedData<BooksTodayResponse>(booksCacheKey) === null
  );

  const lastEventIdRef = useRef<string | null>(null);
  const refreshCounterRef = useRef(0);

  const fetchStripe = useCallback(async () => {
    try {
      setStripeError(null);
      setStripeLoading(prev => getCachedData(stripeCacheKey) === null ? true : prev);
      const res = await fetch(`/api/ad-tracker/stripe-metrics?from=${from}&to=${to}&interval=${interval}&attribution=${trialAttribution ? 'trial' : 'charge'}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Stripe API error ${res.status}`);
      }
      const data: StripeMetricsResponse = await res.json();
      setStripeMetrics(data);
      setCachedData(stripeCacheKey, data);
    } catch (e: any) {
      if (getCachedData(stripeCacheKey) === null) setStripeError(e.message);
      console.error('Failed to fetch Stripe metrics:', e);
    } finally {
      setStripeLoading(false);
    }
  }, [from, to, interval, trialAttribution, stripeCacheKey]);

  const fetchMetaAds = useCallback(async () => {
    try {
      setMetaAdsError(null);
      setMetaAdsLoading(prev => getCachedData(metaAdsCacheKey) === null ? true : prev);
      const res = await fetch(`/api/ad-tracker/meta-ads?from=${from}&to=${to}`);
      if (!res.ok) {
        if (res.status === 501 || res.status === 503) {
          setMetaAds(null);
          setMetaAdsError(null);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Meta Ads API error ${res.status}`);
      }
      const data: MetaAdsResponse = await res.json();
      setMetaAds(data);
      setCachedData(metaAdsCacheKey, data);
    } catch (e: any) {
      if (getCachedData(metaAdsCacheKey) === null) setMetaAdsError(e.message);
      console.error('Failed to fetch Meta Ads:', e);
    } finally {
      setMetaAdsLoading(false);
    }
  }, [from, to, metaAdsCacheKey]);

  const fetchCreatives = useCallback(async () => {
    try {
      setCreativesError(null);
      setCreativesLoading(prev => getCachedData(creativesCacheKey) === null ? true : prev);
      const res = await fetch(`/api/ad-tracker/meta-creatives?from=${from}&to=${to}`);
      if (!res.ok) {
        if (res.status === 501 || res.status === 503) {
          setCreatives([]);
          setCreativesError(null);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Creatives API error ${res.status}`);
      }
      const data: MetaCreativesResponse = await res.json();
      setCreatives(data.creatives);
      setCachedData(creativesCacheKey, data.creatives);
    } catch (e: any) {
      if (getCachedData(creativesCacheKey) === null) setCreativesError(e.message);
      console.error('Failed to fetch creatives:', e);
    } finally {
      setCreativesLoading(false);
    }
  }, [from, to, creativesCacheKey]);

  const fetchLiveEvents = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLiveEventsLoading(prev => getCachedData(liveEventsCacheKey) === null ? true : prev);
      const afterParam = lastEventIdRef.current ? `&after=${lastEventIdRef.current}` : '';
      const res = await fetch(`/api/ad-tracker/live-events?limit=50${afterParam}`);
      if (!res.ok) return;
      const data: LiveEventsResponse = await res.json();

      if (isPolling && data.events.length > 0) {
        setLiveEvents(prev => {
          const combined = [...data.events, ...prev];
          const updated = combined.slice(0, 100);
          setCachedData(liveEventsCacheKey, updated);
          return updated;
        });
      } else if (!isPolling) {
        setLiveEvents(data.events);
        setCachedData(liveEventsCacheKey, data.events);
      }

      if (data.events.length > 0) {
        lastEventIdRef.current = data.events[0].id;
      }
    } catch (_e) {
      // Silent fail for polling
    } finally {
      if (!isPolling) setLiveEventsLoading(false);
    }
  }, [liveEventsCacheKey]);

  const fetchFunnel = useCallback(async () => {
    try {
      setFunnelError(null);
      setFunnelLoading(prev => getCachedData(funnelCacheKey) === null ? true : prev);
      const res = await fetch(`/api/ad-tracker/funnel?from=${from}&to=${to}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Funnel API error ${res.status}`);
      }
      const data: FunnelResponse = await res.json();
      setFunnel(data);
      setCachedData(funnelCacheKey, data);
    } catch (e: any) {
      if (getCachedData(funnelCacheKey) === null) setFunnelError(e.message);
      console.error('Failed to fetch funnel:', e);
    } finally {
      setFunnelLoading(false);
    }
  }, [from, to, funnelCacheKey]);

  const fetchBooksToday = useCallback(async () => {
    try {
      setBooksLoading(prev => getCachedData(booksCacheKey) === null ? true : prev);
      const res = await fetch(`/api/ad-tracker/books-today?from=${from}&to=${to}`);
      if (!res.ok) return;
      const data: BooksTodayResponse = await res.json();
      setBooksTimeSeries(data.timeSeries);
      setCachedData(booksCacheKey, data);
    } catch (_e) {
      console.error('Failed to fetch books today:', _e);
    } finally {
      setBooksLoading(false);
    }
  }, [from, to, booksCacheKey]);

  const refresh = useCallback(() => {
    refreshCounterRef.current++;
    fetchStripe();
    fetchMetaAds();
    fetchCreatives();
    fetchLiveEvents(false);
    fetchFunnel();
    fetchBooksToday();
  }, [fetchStripe, fetchMetaAds, fetchCreatives, fetchLiveEvents, fetchFunnel, fetchBooksToday]);

  // Trigger refresh whenever key params change (including attribution model)
  // Safe: refresh() only updates state vars (stripeMetrics, metaAds, etc.)
  // which are NOT dependencies of any fetch callback → no infinite loop.
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => fetchLiveEvents(true), pollInterval);
    return () => clearInterval(timer);
  }, [fetchLiveEvents, pollInterval]);

  // Merge Stripe + Meta + Funnel into unified time series
  const mergedTimeSeries: MergedDailyData[] = (() => {
    const dateMap = new Map<string, MergedDailyData>();

    const emptyEntry = (date: string): MergedDailyData => ({
      date,
      revenue: 0, refunds: 0, netRevenue: 0,
      adSpend: 0, cogs: 0, profit: 0,
      newCustomers: 0, trialSignups: 0, checkouts: 0, purchases: 0, successfulCharges: 0,
      ctr: 0, cpc: 0, cpm: 0, impressions: 0, reach: 0, frequency: 0,
      cpa: 0, roas: 0, aov: 0, ltv: 0,
      refundRate: 0, conversionRate: 0, cashPending: 0, arr: 0, mrr: 0, businessValuation: 0,
      churn: 0, churnRate: 0, activeSubsCount: 0,
      isAttributionEstimate: false, remainingCohortLTV: 0,
      trialPipelineMonthly: 0, trialPipelineYearly: 0, trialCountMonthly: 0, trialCountYearly: 0,
      trialSignupsMonthly: 0, trialSignupsYearly: 0,
    });

    // Populate from Stripe
    if (stripeMetrics?.timeSeries) {
      for (const bucket of stripeMetrics.timeSeries) {
        const entry = emptyEntry(bucket.date);
        entry.revenue = bucket.revenue;
        entry.refunds = bucket.refunds;
        entry.cogs = bucket.revenue * (cogsPercent / 100);
        entry.newCustomers = bucket.newCustomers;
        entry.trialSignups = bucket.trialSignups || 0;
        entry.cashPending = bucket.cashPending || 0;
        entry.arr = bucket.arr || 0;
        entry.churn = bucket.churnCount || 0;
        entry.activeSubsCount = bucket.activeSubsCount || 0;
        entry.successfulCharges = bucket.successfulCharges;
        entry.trialPipelineMonthly = bucket.trialPipelineMonthly || 0;
        entry.trialPipelineYearly = bucket.trialPipelineYearly || 0;
        entry.trialCountMonthly = bucket.trialCountMonthly || 0;
        entry.trialCountYearly = bucket.trialCountYearly || 0;
        entry.trialSignupsMonthly = bucket.trialSignupsMonthly || 0;
        entry.trialSignupsYearly = bucket.trialSignupsYearly || 0;
        // Server-side attribution correction — use pre-computed values
        entry.isAttributionEstimate = bucket.isAttributionEstimate || false;
        if (bucket.netRevenueWithAttribution != null && bucket.netRevenueWithAttribution > entry.netRevenue) {
          // Apply the server-computed attribution estimate
          const pendingCash = bucket.netRevenueWithAttribution - (bucket.revenue - bucket.refunds);
          entry.revenue = bucket.revenue + pendingCash;
          entry.cogs = entry.revenue * (cogsPercent / 100);
        }
        dateMap.set(bucket.date, entry);
      }
    }

    // Overlay Meta Ads data
    if (metaAds?.timeSeries) {
      for (const metaDay of metaAds.timeSeries) {
        const existing = dateMap.get(metaDay.date) || emptyEntry(metaDay.date);
        existing.adSpend = metaDay.spend;
        existing.ctr = metaDay.ctr;
        existing.cpc = metaDay.cpc;
        existing.cpm = metaDay.cpm;
        existing.impressions = metaDay.impressions;
        existing.reach = metaDay.reach;
        existing.frequency = metaDay.reach > 0 ? metaDay.impressions / metaDay.reach : 0;
        if (!dateMap.has(metaDay.date)) dateMap.set(metaDay.date, existing);
      }
    }

    // Overlay funnel data — each stage maps to its own distinct field
    if (funnel?.timeSeries) {
      for (const item of funnel.timeSeries.leads) {
        const existing = dateMap.get(item.date);
        if (existing) existing.newCustomers = item.count;
      }
      for (const item of funnel.timeSeries.checkoutsStarted) {
        const existing = dateMap.get(item.date);
        if (existing) existing.checkouts = item.count;
      }
      for (const item of funnel.timeSeries.checkoutsCompleted) {
        const existing = dateMap.get(item.date);
        if (existing) existing.purchases = item.count;
      }
      // Use funnel purchases to fill successfulCharges if Stripe didn't set it
      for (const item of funnel.timeSeries.purchases) {
        const existing = dateMap.get(item.date);
        if (existing && existing.successfulCharges === 0) {
          existing.successfulCharges = item.count;
        }
      }
    }

    // Ensure today always has an entry — even if APIs haven't returned
    // data for the current (incomplete) day yet.
    // Use Sydney timezone to match the backend's date bucketing.
    const todayStr = getSydneyToday();
    if (!dateMap.has(todayStr)) {
      dateMap.set(todayStr, emptyEntry(todayStr));
    }

    // Sort by date before computing running values
    const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Compute derived fields + running cumulative LTV + trailing refund rate
    let cumulativeRevenue = 0;
    let cumulativeCustomers = 0;

    const REFUND_WINDOW = 7;

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];

      // Net revenue
      entry.netRevenue = entry.revenue - entry.refunds;

      // Profit = revenue - ad spend - COGS
      entry.profit = entry.netRevenue - entry.adSpend - entry.cogs;

      // ROAS = revenue / ad spend (0 if no spend)
      entry.roas = entry.adSpend > 0 ? entry.netRevenue / entry.adSpend : 0;

      // CPA = ad spend / successful charges (0 if no charges — NOT dividing by 1)
      entry.cpa = entry.successfulCharges > 0 ? entry.adSpend / entry.successfulCharges : 0;

      // AOV = revenue / successful charges
      entry.aov = entry.successfulCharges > 0 ? entry.netRevenue / entry.successfulCharges : 0;

      // Conversion rate = purchases / new customers %
      entry.conversionRate = entry.newCustomers > 0
        ? (entry.purchases / entry.newCustomers) * 100 : 0;

      // Running cumulative LTV (Avg Revenue Per Customer)
      cumulativeRevenue += entry.netRevenue;
      cumulativeCustomers += entry.successfulCharges;
      entry.ltv = cumulativeCustomers > 0
        ? Math.round((cumulativeRevenue / cumulativeCustomers) * 100) / 100
        : 0;

      // Trailing 7-day refund rate = sum(refunds) / sum(revenue) * 100
      const windowStart = Math.max(0, i - REFUND_WINDOW + 1);
      let windowRevenue = 0;
      let windowRefunds = 0;
      for (let j = windowStart; j <= i; j++) {
        windowRevenue += sorted[j].revenue;
        windowRefunds += sorted[j].refunds;
      }
      entry.refundRate = windowRevenue > 0
        ? Math.round((windowRefunds / windowRevenue) * 10000) / 100
        : 0;

      // Trailing 7-day churn rate = sum(churn) / avg(activeSubsCount) * 100
      let windowChurn = 0;
      let windowActiveSubs = 0;
      let windowDays = 0;
      for (let j = windowStart; j <= i; j++) {
        windowChurn += sorted[j].churn;
        windowActiveSubs += sorted[j].activeSubsCount;
        windowDays++;
      }
      const avgActiveSubs = windowActiveSubs / windowDays;
      entry.churnRate = avgActiveSubs > 0
        ? Math.round((windowChurn / avgActiveSubs) * 10000) / 100
        : 0;
      entry.mrr = Math.round((entry.arr / 12) * 100) / 100;
      entry.businessValuation = entry.arr * 3;
    }

    // ================================================================
    // ATTRIBUTION WINDOW CORRECTION
    // Now computed server-side in stripe-metrics/route.ts for stability.
    // The isAttributionEstimate flag and netRevenueWithAttribution values
    // are already applied when populating from Stripe data above.
    // This eliminates the #1 source of metric instability — the frontend
    // no longer uses live rolling rates to re-estimate revenue.
    // ================================================================

    return sorted;
  })();

  const isLoading = stripeLoading || metaAdsLoading || funnelLoading;

  return {
    mergedTimeSeries,
    stripeMetrics,
    stripeLoading,
    stripeError,
    metaAds,
    metaAdsLoading,
    metaAdsError,
    creatives,
    creativesLoading,
    creativesError,
    liveEvents,
    liveEventsLoading,
    funnel,
    funnelLoading,
    funnelError,
    booksTimeSeries,
    booksLoading,
    isLoading,
    refresh,
  };
}
