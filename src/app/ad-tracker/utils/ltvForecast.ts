import { MergedDailyData } from '../hooks/useAdTrackerData';

export interface LTVAssumptions {
  /** Trial-to-paid conversion rate (0–1). Sourced from Stripe trialConversionRate. */
  trialConvRate: number;
  /** Monthly churn rate (0–1). Sourced from trailing churnRate in time series. */
  monthlyChurn: number;
  /** Blended average subscription price in USD. Used as fallback when per-plan prices unavailable. */
  defaultSubPrice: number;

  // ── Per-plan pricing ─────────────────────────────────────────────────────
  /** Price for monthly plan subscribers (USD). Derived from activeMonthlyTrialsValue / count. */
  monthlySubPrice?: number;
  /** Price for yearly plan subscribers (USD). Derived from activeYearlyTrialsValue / count. */
  yearlySubPrice?: number;
  /**
   * Fraction of all trials that are on the monthly plan (0–1).
   * Used as a fallback split when per-day trialSignupsMonthly/Yearly are both 0.
   * Default: 1.0 (treat all as monthly when breakdown unavailable).
   */
  monthlyTrialRatio?: number;

  // ── Churn stability guards ───────────────────────────────────────────────
  /**
   * Minimum active subscription count required before trusting the observed
   * per-day churn rate. Below this threshold the engine falls back to
   * assumptions.monthlyChurn. Default: 20.
   *
   * Rationale: 1 cancellation with 5 active subs = 20% weekly churn → 62%
   * monthly churn, which would crater every projection from that day forward.
   */
  minChurnSampleSubs?: number;
  /**
   * Hard cap on monthly churn rate applied after all other computations.
   * Prevents pathological outlier weeks from producing near-zero LTV.
   * Default: 0.40 (40% monthly churn).
   */
  maxMonthlyChurn?: number;
  /**
   * Hard floor on monthly churn rate.
   * Prevents 0-churn days from over-optimistically projecting 100% retention.
   * Default: 0.005 (0.5% monthly churn).
   */
  minMonthlyChurn?: number;
}

/**
 * Backtest-aware LTV forecast engine — monthly/yearly plan aware.
 *
 * Answers: "If I stopped ads today, how much revenue would each day's
 * trial cohort ultimately generate within the forecast window?"
 *
 * KEY DESIGN PRINCIPLES:
 *
 * 1. SETTLED DAYS (daysAgo >= horizonDays): Return actual data unmodified.
 *    All billing events have already occurred — projecting would double-count.
 *
 * 2. STAGE-GATED PROJECTION (daysAgo < horizonDays): Only project billing
 *    events that haven't happened yet, split by plan type:
 *      Monthly plan: Trial conversion (~day 7) → renewals at day 37, 67, 97…
 *      Yearly plan:  Trial conversion (~day 7) → single renewal at day 372
 *
 * 3. CHURN STABILITY GUARD: Per-day observed churn is only trusted when
 *    the subscription base is large enough to be statistically meaningful.
 *    Small bases fall back to the trailing average, bounded by floor/cap.
 *
 * 4. NON-FINANCIAL METRICS PRESERVED: Ad spend, impressions, CTR, CPC, etc.
 *    are never modified — they reflect real historical actuals.
 *
 * 5. REMAINING COHORT LTV: Each projected day stores `remainingCohortLTV` —
 *    the projected future cash not yet collected from that day's trials.
 *    Summing this across days gives total locked-in future revenue.
 *
 * Monthly billing schedule:
 *   Day 0:   Trial starts (no charge)
 *   Day 7:   Trial converts → first billing
 *   Day 37:  First renewal (minus churn)
 *   Day 67:  Second renewal (minus compounded churn)
 *   Day 97:  Third renewal
 *   1-Year:  12 monthly cycles (geometric decay via churn)
 *
 * Yearly billing schedule:
 *   Day 0:   Trial starts (no charge)
 *   Day 7:   Trial converts → first billing (annual price)
 *   Day 372: First renewal (minus annual churn — modelled as monthlyChurn × 8)
 */
export function applyLTVForecast(
  data: MergedDailyData[],
  horizonDays: number,
  assumptions: LTVAssumptions = {
    trialConvRate: 0.40,
    monthlyChurn: 0.15,
    defaultSubPrice: 99,
  }
): MergedDailyData[] {
  if (horizonDays <= 0) return data;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr + 'T00:00:00').getTime();

  // Resolved assumption values with defaults applied once
  const minSample = assumptions.minChurnSampleSubs ?? 20;
  const maxChurn  = assumptions.maxMonthlyChurn    ?? 0.40;
  const minChurn  = assumptions.minMonthlyChurn    ?? 0.005;
  const mRatio    = assumptions.monthlyTrialRatio  ?? 1.0;

  return data.map((day) => {
    const dayMs   = new Date(day.date + 'T00:00:00').getTime();
    const daysAgo = Math.round((todayMs - dayMs) / (24 * 60 * 60 * 1000));

    // ── BACKTEST GUARD ──────────────────────────────────────────────────────
    // Days older than the forecast horizon are fully settled — all billing
    // events have materialized in actuals. Return real data, no projection.
    if (daysAgo >= horizonDays) return day;

    // Future days shouldn't exist but guard anyway
    if (daysAgo < 0) return day;

    const projected = { ...day };

    // ── CHURN STABILITY GUARD ───────────────────────────────────────────────
    // Only trust per-day observed churn when the subscription base is large
    // enough (≥ minSample). Below that, use the trailing average passed in.
    let monthlyChurn = assumptions.monthlyChurn;
    if (day.activeSubsCount >= minSample && day.churnRate > 0) {
      const weeklyChurn = day.churnRate / 100;
      monthlyChurn = 1 - Math.pow(1 - weeklyChurn, 4.3);
    }
    // Apply hard floor and cap to prevent outlier days from poisoning projections
    monthlyChurn = Math.max(minChurn, Math.min(maxChurn, monthlyChurn));

    // ── PER-PLAN SUBSCRIPTION PRICES ───────────────────────────────────────
    const mPrice = assumptions.monthlySubPrice ?? assumptions.defaultSubPrice;
    // Yearly price falls back to defaultSubPrice; the caller should supply
    // the real yearly price via yearlySubPrice for accurate projection.
    const yPrice = assumptions.yearlySubPrice ?? assumptions.defaultSubPrice;

    // ── PER-PLAN COHORT SIZES ───────────────────────────────────────────────
    // Use real per-day signup breakdown when available. Fall back to the
    // observed monthly/yearly ratio from summary data when not.
    const hasBreakdown = (day.trialSignupsMonthly + day.trialSignupsYearly) > 0;
    let mTrials: number;
    let yTrials: number;
    if (hasBreakdown) {
      mTrials = day.trialSignupsMonthly;
      yTrials = day.trialSignupsYearly;
    } else {
      mTrials = day.trialSignups * mRatio;
      yTrials = day.trialSignups * (1 - mRatio);
    }

    const mConv = mTrials * assumptions.trialConvRate;
    const yConv = yTrials * assumptions.trialConvRate;

    // ── AOV-BASED PRICE FALLBACK ────────────────────────────────────────────
    // If the day has a real average order value, prefer that over assumptions.
    const effectiveMPrice = day.aov > 0 ? day.aov : mPrice;
    const effectiveYPrice = day.aov > 0 ? day.aov : yPrice;

    // ── STAGE-GATED PROJECTION ──────────────────────────────────────────────
    // Project only billing events that have NOT yet occurred (daysAgo < eventDay).
    let additionalCash = 0;

    // ── MONTHLY COHORT BILLING ──────────────────────────────────────────────
    {
      // Stage 1: Initial trial conversion (day 7)
      if (daysAgo < 7) {
        additionalCash += mConv * effectiveMPrice;
      }

      if (horizonDays >= 37) {
        // Stage 2+: Monthly renewal cycles
        const totalCycles = horizonDays >= 365
          ? 12
          : Math.floor((horizonDays - 7) / 30);

        let subs = mConv;
        for (let cycle = 1; cycle <= totalCycles; cycle++) {
          const renewalDay = 7 + cycle * 30; // day 37, 67, 97 …
          subs *= (1 - monthlyChurn);
          if (daysAgo < renewalDay) {
            additionalCash += subs * effectiveMPrice;
          }
        }
      }
    }

    // ── YEARLY COHORT BILLING ───────────────────────────────────────────────
    // Yearly subscribers have a completely different billing rhythm:
    //   Day 7:   First billing at annual price
    //   Day 372: Renewal (within 1-year horizon only)
    //
    // Annual churn is modelled conservatively as 8× monthly churn,
    // capped at 0.60 (at least 40% of yearly subscribers renew).
    // Rationale: yearly subscribers are more committed than monthly ones.
    if (yConv > 0) {
      const annualChurn = Math.min(monthlyChurn * 8, 0.60);

      // Stage 1: Initial yearly trial conversion (day 7)
      if (daysAgo < 7) {
        additionalCash += yConv * effectiveYPrice;
      }

      // Stage 2: Yearly renewal (day 372 — only reachable in 1-year horizon)
      if (horizonDays >= 365) {
        const renewedYearly = yConv * (1 - annualChurn);
        if (daysAgo < 372) {
          additionalCash += renewedYearly * effectiveYPrice;
        }
      }
    }

    // ── REMAINING COHORT LTV ────────────────────────────────────────────────
    // The total projected future cash not yet collected from this cohort.
    // Useful for "if I stopped ads today, what is this cohort worth?"
    projected.remainingCohortLTV = additionalCash;

    const projectedCash = day.revenue + additionalCash;

    // ── OVERWRITE FINANCIAL METRICS ─────────────────────────────────────────
    projected.revenue    = projectedCash;
    projected.netRevenue = projectedCash - day.refunds;
    projected.cogs       = day.cogs; // future renewals have near-zero marginal COGS
    projected.profit     = projectedCash - day.adSpend - projected.cogs;
    projected.roas       = day.adSpend > 0 ? (projectedCash / day.adSpend) : 0;
    projected.aov        = day.successfulCharges > 0 ? (projectedCash / day.successfulCharges) : 0;

    // ── ARR PROJECTION ──────────────────────────────────────────────────────
    // Project what ARR would be after the remaining forecast time.
    // Existing ARR decays by churn; new monthly subs from unconverted trials add in.
    if (horizonDays >= 7) {
      const remainingDays   = Math.max(0, horizonDays - daysAgo);
      const remainingMonths = remainingDays / 30;
      const existingArrDecayed = day.arr * Math.pow(1 - monthlyChurn, remainingMonths);

      // Only count new MRR from monthly trials that haven't converted yet
      const newMonthlySubsFromTrials = daysAgo < 7 ? mConv * (1 - monthlyChurn) : 0;
      const newProjectedMRR = newMonthlySubsFromTrials * effectiveMPrice;
      projected.arr = existingArrDecayed + (newProjectedMRR * 12);
    }

    projected.mrr              = Math.round(((projected.arr || 0) / 12) * 100) / 100;
    projected.businessValuation = (projected.arr || 0) * 3;

    // ── ZERO OUT CASH PENDING ───────────────────────────────────────────────
    // The forecast already materializes trial conversions into revenue.
    // Showing cashPending alongside would double-count the same money.
    projected.cashPending = 0;

    return projected;
  });
}
