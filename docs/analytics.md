# ProDJEE analytics (GA4 `G-FD29SH9PJF`)

Single entry point: `mock-to-marks-pwa/assets/pj-analytics.js`, loaded in `<head>` of every public page. No page contains its own gtag snippet (`npm test` fails if one appears). Vercel Analytics (`/_vercel/insights`) is separate and unchanged.

## Routes

| Route | page_name | Canonical title (`<title>` and GA `page_title`) | Canonical path |
|---|---|---|---|
| Home | `home` | Home — ProDJEE | `/` |
| Arena | `arena` | Arena Practice — ProDJEE | `/arena/` |
| ScoreGPS (folder `m2m`, formerly Mock-to-Marks) | `scoregps` | ScoreGPS Mock Analysis — ProDJEE | `/m2m/` |
| My Coach | `coach` | My Coach — ProDJEE | `/coach/` |
| News | `news` | Exam News — ProDJEE | `/news/` |
| Privacy | `legal_privacy` | Privacy Policy — ProDJEE | `/privacy.html` |
| Terms | `legal_terms` | Terms of Use — ProDJEE | `/terms.html` |
| Disclaimer | `legal_disclaimer` | Disclaimer — ProDJEE | `/disclaimer.html` |
| Admin | not tracked | Question editor — ProDJEE Admin | `/admin/` |

Legacy titles seen in old GA data (all now retired): `Mock-to-Marks — ProDJEE`, `ProDJEE — Gamified Learning & AI Score Improvement`, `ProDJEE — JEE practice that actually moves your marks`, `ProDJEE — JEE/NEET practice that actually moves your marks`, `ProDJEE — Gamified JEE/NEET Learning, AI Mock Analysis & Personalised Plans`, `ProDJEE — Play. Analyse. Improve.`, `Arena — ProDJEE`, `ProDJEE Arena — Gamified JEE & NEET Learning`, `ProDJEE Coach — Personalised JEE & NEET Improvement`, `ScoreGPS — AI Mock Analysis & Personalised Plans | ProDJEE`. The path `/` used to be the Mock-to-Marks tool, which is why old "Home" and "Mock-to-Marks" rows overlap.

## Rules the code enforces

- One `<title>` per page, set before any hit is sent. Titles never change with user state.
- `send_page_view:false`; exactly one manual `page_view` per document load (plus one on back/forward restores from the browser page cache).
- `page_location` is `https://prodjee.in<canonical path>`: lowercase, no query, no hash, no `index.html`.
- `utm_*` are removed from `page_location` and sent as `campaign_source/medium/name/term/content`; `ref` is sent as `referral_code`. `gclid` is read by the Google tag itself.
- First touch (source, medium, campaign, landing page) is stored once in `localStorage['pj.ft']` and attached to every hit as user properties `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, `first_touch_page`. The existing Firestore first-touch `source` (api/track-source) is untouched.
- Only `prodjee.in` reports. localhost, `*.vercel.app` previews and any other host send nothing.
- Internal traffic: open any page once with `?pj_internal=1` (clear with `?pj_internal=0`). Every event then carries `traffic_type=internal`. `?pj_debug=1` adds `debug_mode` so hits show in DebugView.
- `www.prodjee.in` 308-redirects to `https://prodjee.in` (vercel.json). http to https is handled by Vercel.

## Event schema

Every event carries `page_name`, `page_title`, `page_location`, `page_path`.

| Event | When | Extra parameters |
|---|---|---|
| `page_view` | Once per document load / bfcache restore | `campaign_*`, `referral_code` on a landing with UTM params |
| `app_screen` | In-app view change inside Arena or ScoreGPS (URL does not change) | `screen_name` e.g. `arena_game`, `arena_results`, `scoregps_diagnosis` |
| `sign_up` / `login` | Google sign-in succeeds | `method=google` |
| `first_arena_completed` | First committed Arena session on this browser | `questions`, `exam` |
| `first_mock_analysed` | First real (non-demo) ScoreGPS diagnosis opened on this browser | none |
| `cross_feature_click` | Next-step card click in Arena or ScoreGPS | `from_feature`, `to_feature`, `placement` |
| `share_click` | Any share action | `method`, `content` |
| `streak_day_3`, `_7`, `_14`, `_30` | Streak reaches that length | `streak` |

## How to read it in GA4

- Group by the custom dimension **page_name** (Explore, or Reports with a comparison) instead of page title.
- Funnel: `page_view (home)` then `page_view (arena)` or `page_view (scoregps)` then `sign_up`.
- Feature loop: filter `cross_feature_click`, break down by `placement`.
- Retention: `streak_day_N` counts, and returning users by `first_touch_source`.
- In-app depth: `app_screen` by `screen_name`.

## Manual GA4 settings (cannot be done from code)

1. Admin > Data streams > Web stream > Enhanced measurement > gear > turn **off** "Page changes based on browser history events" (Arena uses `history.pushState` for its back-button guard).
2. Admin > Custom definitions > create event-scoped dimensions: `page_name`, `screen_name`, `placement`, `content`; user-scoped: `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, `first_touch_page`; metrics (optional): `score`, `streak`.
3. Admin > Data streams > Configure tag settings > Define internal traffic is not needed; instead create a **Data filter** (Admin > Data collection and modification > Data filters) of type Internal Traffic with parameter `traffic_type` = `internal`, state Testing, then Active after checking.
4. Admin > Events > mark as key events: `sign_up`, `first_arena_completed`, `first_mock_analysed`, `cross_feature_click`, `share_click`. (`streak_day_*` is useful but not a conversion.)
5. Reports > Engagement > Pages and screens: switch the primary dimension to "Page path + query string and screen class" or add `page_name` as the dimension.
6. Open each page once from your own browsers with `?pj_internal=1`.

## Cut-over

Record the production deploy date of this change as the cut-over. Data before that date has split titles (about ten titles across `/` and `/arena/`) and no `page_name`; do not merge it with later data. Compare only the full weeks after the cut-over, and read pre-cut-over bounce by URL path rather than by title.

## Before / after checklist (compare about 2 weeks after cut-over)

- [ ] Pages report shows one row per route (8 rows plus `(not set)` at most); no legacy titles after the cut-over date.
- [ ] `page_view` per session did not jump unexpectedly (Arena should no longer add history-change views once setting 1 is off).
- [ ] Home bounce rate (was 48.2%); target under 35%. Use the same definition and only post-cut-over weeks.
- [ ] ScoreGPS bounce (was 43.3%), Arena (25.8%), compare by `page_name`.
- [ ] Home to feature rate (home `page_view` followed by an Arena or ScoreGPS `page_view` in the same session) and `sign_up` rate.
- [ ] Share of sessions with a second feature (`cross_feature_click` or page_view of another `page_name`).
- [ ] Returning users and `streak_day_3` counts.
- [ ] Direct vs referral vs social split looks plausible (first-touch properties populated, internal traffic excluded).
- [ ] Average engagement time (was 1m37s) and events per Arena user (was about 16).
