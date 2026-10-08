<div align="center">

# Cognition

### Read the story hidden in your conversations

Drop in a WhatsApp chat export. Cognition maps your emotions, relationships, personality and growth over time, and the analysis runs **in your browser**, so your chats never touch a server.

![Next.js 15](https://img.shields.io/badge/Next.js-15-black) ![Gemini](https://img.shields.io/badge/AI-Gemini-4285f4) ![Local-first](https://img.shields.io/badge/data-stays%20on%20device-2f7d4f) ![License MIT](https://img.shields.io/badge/license-MIT-black)

</div>

---

## Two tools in one codebase

### 1 · Chat insights

You export a chat from WhatsApp (*Contact → Export chat → Without media*) and drop the `.txt` files in. Cognition splits years of messages into time segments, sends each segment to Gemini for structured analysis, and draws the results:

| View | What you see |
| --- | --- |
| **Emotional Landscapes** | 16 emotions over time, the peaks and valleys, and what triggered them |
| **Relationships Network** | Who you talk to, how it changes, and when people drift away |
| **Personality Analysis** | Big Five traits, with confidence that grows as more data comes in |
| **Growth Journey** | Your life told as chapters, built from the moments that mattered |

Chats are parsed and stored in **IndexedDB** in your browser. Only the text segments sent for analysis go to the Gemini API. A "clear all data" page wipes everything stored locally.

### 2 · Ad Tracker

A marketing dashboard for small direct-to-consumer brands:

- **Creative DNA.** AI breaks every Meta ad down into hook, angle, format, avatar and proof, so you can query what actually works.
- **Competitor ad autopsy.** Drop in any winning ad and get its structure back as a brief you can reuse.
- **Stripe × Meta attribution.** Revenue, spend, ROAS, CPA and LTV forecasts on one timeline, with refunds and COGS included.
- **Workflow canvas.** A node-based builder (XYFlow) that chains creative analysis into a strategy brief.

## Quick start

```bash
git clone https://github.com/harrythentrepreneur/cognition-insights.git
cd cognition-insights
npm install
cp .env.example .env.local   # set GEMINI_API_KEY and APP_PASSWORD at minimum
npm run dev                  # http://localhost:3000
```

The app sits behind a password gate. Sign in at `/login` with `APP_PASSWORD`. If `APP_PASSWORD` is empty, nobody can sign in. The session cookie is derived from the password, so it can't be forged.

## Configuration

All variables are listed in [`.env.example`](.env.example).

| Group | Variables |
| --- | --- |
| Required | `GEMINI_API_KEY` (plus optional `_2`…`_4` for rotation), `APP_PASSWORD` |
| Database | `DATABASE_URL` (Neon / Postgres, used by Ad Tracker) |
| Payments & email | `STRIPE_*`, `RESEND_API_KEY`, `CLERK_SECRET_KEY`, `SHOPIFY_WEBHOOK_SECRET` |
| Ad Tracker | `FB_ACCESS_TOKEN`, `FB_AD_ACCOUNT_ID`, `REPORTING_TIMEZONE` |
| Conversion APIs | `FACEBOOK_PIXEL_ID`, `PINTEREST_*`, `REDDIT_*` |

No tracking pixels ship with the repo. Add your own in `src/app/layout.tsx` and `public/js/tracking-pixels.js`.

## Project layout

```
src/app/                       pages: insight views, ad-tracker, onboarding, api routes
src/lib/analyzers/             browser-side Gemini analyzers (emotions, relationships, personality…)
src/lib/parsers/               WhatsApp export parser
src/lib/storage/               IndexedDB storage
src/app/api/ad-tracker/        creative extraction, Meta/Stripe metrics, strategy briefs
public/                        marketing pages, onboarding art
```

`CLAUDE.md` maps the architecture in more depth.

## Status

Cognition ran as a paid product, then pivoted. It is shared as-is: it works, it has rough edges, and it has no test suite. The language-patterns view is disabled.

## License

[MIT](LICENSE) · Built by [Harry Edwards](https://github.com/harrythentrepreneur)
