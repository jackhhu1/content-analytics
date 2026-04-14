# TODOS

## Before v1 launch

### Scraping failure monitoring
**What:** When the weekly scrape-trigger Edge Function fails (Apify API down, rate limit, 
network error), insert a row into `scrape_errors(id, account_id, user_id, error_message, 
failed_at)`. Display a banner in the feed UI if the last successful scrape for any 
niche account was > 8 days ago.

**Why:** Without this, a scraping outage looks like "the app is broken" to early users. 
Silent failures erode trust faster than visible ones.

**How to apply:** Add a try/catch in scrape-trigger Edge Function. On failure: INSERT into 
scrape_errors. In /api/feed response, include `last_scraped_at` per account. Feed component 
shows banner if any account is stale.

**Depends on:** Core scraping pipeline working first.

---

### Webhook replay protection
**What:** Store Apify `run.id` when processing a webhook. On replay (Apify retries on non-2xx or manually re-triggered), skip re-scoring posts already processed for that run ID.

**Why:** Apify retries webhooks on failure. On replay, `is_outlier` is re-scored against a larger baseline (the first run's posts now exist), so flags can silently flip. Storing the run ID lets us detect and skip replays.

**How to apply:** Add `apify_run_id TEXT` column to a new `scrape_runs` table (or to `posts`). At webhook start, check if this run_id was already processed. If yes, return 200 immediately. Only process fresh runs.

**Depends on:** Core scraping pipeline working first (same as failure monitoring).

---

## Before broader beta rollout

### Google OAuth
**What:** Add Google OAuth as an alternative to magic link email auth. Supabase supports 
this natively — add Google provider in Supabase dashboard + one button in the auth UI.

**Why:** Target users are content creators checking the app on mobile between filming. 
Magic link requires leaving the app → email → tap link → return. With a 7-day session 
TTL this happens weekly. Google OAuth is one tap.

**How to apply:** Enable Google OAuth in Supabase Auth settings. Add `Sign in with Google` 
button alongside the magic link form. No backend changes required.

**Depends on:** Nothing. Can be added any time after initial launch.

### Queue throughput for multi-user scale
**What:** Current queue processes 1 post per 30s interval. At 5 users × 5 accounts × 
50 posts = 1,250 jobs = 10+ hours to process a weekly batch. Need to either:
- Process N posts per invocation (e.g., 5 per 30s = 5x throughput)
- Or reduce batch size by only scraping posts from the last 2 weeks per account

**Why:** Single-user (founder) use is fine at 1/30s. Multi-user breaks down before 
you've even recruited 5 beta users.

**How to apply:** Change queue processor to `SELECT ... LIMIT 5` and process in parallel 
within the Edge Function. Or add `posted_at >= now() - 14 days` filter to Apify actor 
input to reduce batch size. Both can be combined.

**Depends on:** Having > 1 active user.

---

## v2 architectural improvements

### Shared posts table (post deduplication)
**What:** Currently `posts` has a `user_id` column, so each user tracking the same Instagram account gets their own copy of every post. 100 users tracking @garyvee = 100 identical rows.

**Why:** Storage and compute scale as `users × accounts × posts` rather than `accounts × posts`. Acceptable at 5 beta users, becomes a problem at 500.

**How to apply:** Redesign `posts` as a shared table with no `user_id` (keyed on `account_id, post_url`). Add a `user_post_associations(user_id, post_id)` join table for per-user state (saved, notes, seen). Migrate existing data. Update all queries and RLS policies.

**Depends on:** Multi-user beta showing the dedup is actually needed (validate first).

---

## Design (from /design-review 2026-04-13)

### FINDING-008: ViralIntel favicon (replace default Next.js logo)
**Impact:** Medium
**What:** The favicon is still the default Next.js triangle. Every browser tab shows the Next.js logo. Export the app icon (emerald-to-indigo gradient bolt) as a 32×32 PNG and add it to `/public/` as `favicon.ico`, plus add `<link rel="icon">` in layout metadata.
**How to apply:** Design the icon at 32×32, save as `/public/favicon.ico` and `/public/icon.png`. Update `layout.tsx` metadata with `icons: { icon: '/icon.png' }`.

### FINDING-009: Skeleton loading state for Signal Feed
**Impact:** Medium
**What:** The feed loading state is a single centered "Tuning into the signal..." text. The actual content is a 3-column portrait card grid. Users see empty space then cards snap in. Add skeleton cards that match the `rounded-2xl border border-white/10` shape with 9/16 aspect ratio and shimmer animation.
**How to apply:** Create a `SignalCardSkeleton` component. Render 6 of them in FeedPanel when `loading && posts.length === 0`.

### FINDING-010: Investigate 4.1s TTFB on login page
**Impact:** High
**What:** Live perf audit measured 4126ms TTFB on the login page. LCP target is <2.0s. Login has no auth check — this is either dev-mode Next.js overhead or middleware doing unnecessary work on `/login`.
**How to apply:** Profile in production deploy. Check if middleware is running Supabase session checks on the `/login` path unnecessarily.
