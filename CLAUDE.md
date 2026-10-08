# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognition is a Next.js 15 application with two products:

1. **WhatsApp Chat Analyzer** — Analyzes chat exports across 5 dimensions (Emotional Landscapes, Relationships Network, Language Patterns [disabled], Personality Analysis, Growth Journey) using Google Gemini AI. Analysis runs entirely client-side via browser-based analyzers in `src/lib/analyzers/`.

2. **Ad Tracker** (main active product) — Marketing intelligence platform for e-commerce brands. Integrates Meta Ads, Stripe, and Shopify to dissect ad creatives into structured "Creative DNA", track performance metrics, and generate AI-powered strategy briefs. Includes a visual workflow canvas built with XYFlow.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3000
npm run build        # Production build
npm run build:clean  # Clean build (removes .next and node_modules)
npm run lint         # ESLint
npm start            # Production server
```

No backend server is needed — API routes run as Next.js serverless functions under `src/app/api/`. Deployed via Coolify; env vars are injected at build time. Setting `ELECTRON_BUILD=true` switches `next.config.ts` to static export mode.

## Architecture

### App Router Structure

- `/` — Landing page (marketing, public)
- `/login` — Auth (public)
- `/ad-tracker` — Ad intelligence dashboard
  - `/ad-tracker/canvas` — Visual workflow builder (XYFlow)
  - `/ad-tracker/customers` — Customer management
  - `/ad-tracker/cost-of-goods` — COGS tracking
- `/emotional-landscapes`, `/relationships-network`, `/personality-analysis`, `/growth-journey` — WhatsApp analysis views
- `/language-patterns` — Exists but disabled

### Key Directories

- **`src/app/api/`** — Next.js API routes. Ad tracker routes under `api/ad-tracker/` (see section below). Payment/auth routes handle Stripe webhooks, Clerk, Shopify.
- **`src/lib/analyzers/`** — Browser-side analyzer modules inheriting from `base-analyzer.ts`. Orchestrated by `comprehensive-analyzer-enhanced.ts`.
- **`src/lib/`** — Database clients (`neon.ts`, `creative-db.ts`, `daily-metrics-db.ts`), API integrations (Gemini, Meta, Pinterest, Reddit), storage (IndexedDB wrappers), utilities.
- **`src/components/`** — Shared components (`PageLayout.tsx`, `HamburgerMenu.tsx`, `FileUpload.tsx`), plus `ui/` for Radix-based primitives and `shared/` for base components like `BaseTimeline.tsx`.
- **`src/styles/`** — Design tokens and global styles.

### Data & Storage

- **Neon DB** (`DATABASE_URL`) — Persistent storage for ad tracker. Two main tables:
  - `ad_creatives` — PK `(ad_id, snapshot_from, snapshot_to)`. Stores creative metadata, URLs, copy, and `metrics_json` JSONB. Upserted on every Meta creatives fetch.
  - `daily_metrics` — PK `date TEXT`. Combines Stripe revenue (revenue, refunds, ARR, trials, churn) and Meta ad fields (spend, impressions, clicks, CPM, CTR, reach). A `settled` boolean flag gates rows — days outside the 7-day attribution window are marked settled and read from DB without re-hitting Stripe.
- **IndexedDB** — Client-side storage for WhatsApp analysis sessions (`src/lib/storage/`)
- **localStorage** — Session state preservation; canvas auto-saves with 1.5s debounce

### Authentication

Password-gated middleware (`src/middleware.ts`): all routes except `/`, `/login`, `/api/auth/verify`, and static assets require a `cognition-auth=authenticated` cookie. Default password is in `src/app/api/auth/verify/route.ts`. Clerk integration exists but is secondary.

### Integrations

- **Google Gemini** — AI analysis (model configurable via `NEXT_PUBLIC_GEMINI_MODEL`, defaults to `gemini-2.5-flash-lite-preview-06-17`)
- **Stripe** — Payments, checkout sessions, webhook handling, live metrics for ad tracker
- **Meta Ads API** — Ad insights, creatives, ad sets
- **Shopify** — Order webhooks, magic link auth
- **Resend** — Transactional email
- **Neon** — Serverless Postgres (thin singleton client in `src/lib/neon.ts`)

## Ad Tracker Architecture

### Creative DNA Pipeline

A two-step Gemini extraction pipeline that avoids re-downloading media:

1. **`POST /api/ad-tracker/extract-ad-raw`** — Downloads ad media (video/image), sends to Gemini for raw scene-by-scene description (`RawAdExtraction`).
2. **`POST /api/ad-tracker/classify-ad-data`** — Text-only; takes the raw extraction and classifies into structured `AdClassification` with enums for hook type, angle, format, pacing, copy framework, awareness level, CTA type, production tier, persona archetype.

A single-step alternative **`POST /api/ad-tracker/extract-dna`** does both in one call (used by canvas `ExtractorNode`). All AI routes share `meta-cache.ts` (in-memory, 30-min TTL, keyed by URL hash or `adId`).

### Canvas (XYFlow)

Full-screen creative brief builder at `/ad-tracker/canvas`. Core files in `src/app/ad-tracker/components/canvas/`:

- **`AdLabCanvas.tsx`** — Main component. Wraps in `CanvasDataProvider` + `ReactFlowProvider`. State auto-saves to localStorage.
- **`canvasExecutor.ts`** — DAG executor. `resolveInputs()` walks edges backward from a target node to collect upstream data. `executeSynthesis()` / `executeExtraction()` fire API calls.
- **`CanvasSidebar.tsx`** — Drag palette for adding nodes.
- **`CanvasDataContext.tsx`** — Context providing vault creatives to nodes.

**Node types** registered in `nodeTypes`: source nodes (URL, vault creative, brand profile), DNA tag nodes (hook, angle, format), enriched input nodes (persona, desire, custom prompt), extractor (skeleton extractor), and output/generator nodes (synthesizer, ad copy prompt, LLM question, hook variations, script writer, compliance checker, brief output, note).

Default layout: Hook + Angle + Format + Persona + Desire + CustomPrompt → central `synthesizerNode`.

### Dashboard Components

- **`AdTrackerSection.tsx`** — Main dashboard. Uses `useAdTrackerData` hook to fetch Meta + Stripe + live events. Renders `BaseTimeline` (D3-backed, 30 selectable metrics), `CreativeVault`, `StripeLiveFeed`, `BaseCircumplex`, `ChannelBreakdown`, `IntelligenceLab`, `BlueprintStudio`.
- **`AdXRayPanel.tsx`** — Slide-out detail panel for a single creative. Runs the two-step extraction pipeline client-side, plus `extract-creative-system` for full framework view (awareness columns, desires, features/benefits matrix, persona).

### Ad Tracker API Routes

| Route | Purpose |
|---|---|
| `meta-ads` | Fetch Meta campaign/ad-set list |
| `meta-creatives` | Fetch ad creatives with metrics; upserts to `ad_creatives` |
| `meta-ad-insights` | Daily-level Meta spend data; upserts to `daily_metrics` |
| `stripe-metrics` | Stripe revenue, trials, churn; upserts to `daily_metrics` |
| `live-events` | SSE stream for real-time Stripe events |
| `books-today` | Daily bookings count |
| `customers` | Customer list with LTV |
| `funnel` | Funnel conversion data |
| `analyze-creative` | Deep single-creative X-Ray via Gemini |
| `extract-ad-raw` | Step 1: raw media description |
| `classify-ad-data` | Step 2: structured classification |
| `extract-dna` | Single-step DNA extraction (canvas) |
| `extract-creative-system` | Full creative system framework |
| `synthesize-brief` | Generate timed ad script brief from canvas node graph |
| `generate-text` | Generic Gemini text generation for canvas output nodes |
| `generate-strategy` | AI strategy recommendations from aggregated DNA performance data |
| `db-health` | Health check for NeonDB tables |

## Environment Variables

### Required (server-side)
```
DATABASE_URL          # Neon Postgres connection string
STRIPE_SECRET_KEY     # Stripe API key
STRIPE_WEBHOOK_SECRET # Stripe webhook verification
RESEND_API_KEY        # Email service
APP_PASSWORD          # Login password (required; empty = no one can sign in)
```

### Client-side
```
NEXT_PUBLIC_APP_URL           # App base URL
NEXT_PUBLIC_GEMINI_MODEL      # Gemini model name (optional, defaults to gemini-2.5-flash-lite-preview-06-17)
```

### Optional
```
SHOPIFY_WEBHOOK_SECRET
CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
PINTEREST_ACCESS_TOKEN
FACEBOOK_TEST_EVENT_CODE
STRIPE_PRICE_ID / STRIPE_PRODUCT_ID
ELECTRON_BUILD        # Set to 'true' for static export build
```

## Development Patterns

- **Styling**: TypeScript style objects for components + Tailwind CSS utilities. Design tokens in `src/styles/tokens.ts`. Custom fonts: Inter, Satoshi.
- **Component organization**: Feature-first co-location. Components live next to their feature pages (e.g., `src/app/ad-tracker/components/`). Shared components only in `src/components/`.
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig).
- **Image optimization**: WebP format, 1-year cache TTL, configured in `next.config.ts`.
- **Webpack polyfills**: Buffer polyfill configured for browser use.
- **Excluded directories**: `archive/`, `backups/`, `scripts/`, `TEMPLATE_new_feature/` are excluded from TypeScript compilation and builds via both `tsconfig.json` and webpack `ignore-loader` rules in `next.config.ts`.

## WhatsApp Analysis Pipeline

The client-side analysis pipeline in `src/lib/analyzers/`:
1. Parse WhatsApp exports via `src/lib/parsers/whatsapp-parser.ts`
2. Segment messages using `time-segmenter.ts` / `adaptive-segmenter.ts`
3. Consolidate sparse segments via `sparse-consolidator.ts`
4. Run Gemini analysis on each segment
5. Feed results to specialized analyzers (emotional, personality, relationships, behavioral, triggers, timeline events)

### Analysis Config (`src/lib/config/analysis-config.ts`)
- All messages under 1000 analyzed without sampling
- Daily segmentation for conversations up to 60 days, weekly for longer
- Consolidation: MIN_MESSAGES_FOR_STANDALONE=20, MAX_CONSOLIDATED_MESSAGES=400, MAX_WEEKS_TO_MERGE=4
