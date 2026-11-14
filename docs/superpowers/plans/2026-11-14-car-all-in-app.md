# Car All-in App (working name: Counter Check) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile + desktop web app where a US car owner adds their car, checks a shop quote, and sees which lines are overpriced, unnecessary (upsell vs the maker's schedule), covered by warranty or tied to a recall, then keeps a maintenance plan and service record that brings them back.

**Architecture:** Next.js App Router app on Vercel. All data goes through server route handlers that use the Supabase service key and filter by a guest id cookie (no login for the jury). Claude only reads messy input (quote photo/text, voice, car photo) into typed JSON and explains results; every price, schedule, warranty and upsell verdict is computed by our own code from sourced tables in `db/seed/`, so the core value is real and testable (FAQ Q96).

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + Storage), Anthropic SDK (`claude-sonnet-5-5` for vision/parsing, `claude-haiku-5-5` for chat/explanations), Stripe (test mode), Vitest, zod, `qrcode`, `@react-pdf/renderer`, NHTSA vPIC + Recalls APIs (free, no key), Web Speech API (browser voice input).

**Spec:** The product brief in the 2026-11-14 lead message (car all-in app, pains 1–5, free/paid lists), `HACKATHON.md`, `docs/faq-rules.md`, and the MyAutoLog gap analysis summarized under "Product decisions" below.

## Global Constraints

- Web only, runs in the browser on phone and desktop; mobile-first responsive layout, installable PWA manifest; no native app (FAQ Q60, Q87).
- B2C only: the car owner pays. Shop referrals/ads may appear only as secondary revenue, never as the core model, and never called "B2B" in product or deck (Q38, Q83).
- No sign-up or login anywhere on the core flow; guest id cookie + server-side storage (Q54, Q135).
- UI copy in English, US units (miles, USD, gallons) (Q75).
- Every number shown to a user is computed from input + `db/seed/` tables; no pre-written results. Sample quotes run through the same pipeline and are labeled "Sample data" (Q66, Q84, Q94).
- Paywall: real price on screen, Stripe test-mode checkout, test card `4242 4242 4242 4242` shown on the paywall (Q55, Q95).
- Hide or remove every button that does not work (Q85).
- No secrets in the repo; `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` live only in Vercel env (Q26, Q46).
- Disclaimers: "Estimates, not a guarantee. Not legal or mechanical advice." on every verdict; photo diagnosis says "Possible causes, have a mechanic confirm."
- Collect no data beyond the car, quotes, records and optional documents; no names, no addresses (Q26).
- Production link must stay live until the end of the final, Nov 15. Code freeze 11:00 Nov 15, submission by 12:00.
- Guides: link out to CarCareKiosk (`https://www.carcarekiosk.com/videos/<Make>`, make segment uses `+` for spaces, e.g. `Land+Rover`); never copy or re-host their videos.

## Product decisions (from the brief + MyAutoLog gaps)

**The one complete workflow (must work end-to-end, judged at 40%):**
1. Add car: VIN (decoded via NHTSA) or year/make/model, plus mileage, state, original owner yes/no.
2. Car home: open recalls for this model, warranty status, maintenance plan (what is due next).
3. Check a quote: photo, pasted text, or one of 3 labeled sample quotes.
4. Verdict: per line, fair price range, upsell flag vs maker schedule, warranty coverage, recall match; total likely overpay in dollars; what to say to the shop.
5. Save: the checked quote becomes a dated service record (proof file) and updates the plan and reminders.
6. Paywall on the full report (line-by-line detail, shop script); Stripe test checkout unlocks Plus.

**Free vs Plus (suggested split):**

| Free (hook + retention) | Plus, $5.99/mo or $39.99/yr (7-day trial) |
|---|---|
| Unlimited service and fuel logs, timeline | Full line-by-line quote report + shop script |
| Voice logging (speak a service, we fill the form) | Unlimited quote checks (free: 1 per month, headline only) |
| VIN decode, recall check, warranty status | Personal AI car assistant (free: 3 messages/day) |
| Maintenance plan from the maker schedule + reminders, calendar (.ics) export | Photo diagnosis ("what is this noise/leak/light") for this exact car |
| Quote check headline: "likely overpay $X, N lines flagged" | Cost benchmark: your spend vs expected cost for this car |
| Fix-or-sell estimate per car | Documents: photo scan, expiry reminders |
| DIY guides: links to car-specific videos | Second-quote pack (exact job names and parts to read to another shop) |
| Export/import JSON, resale record as PDF + QR link | Multi-car household |

Reason for the split: the free tier already gives the retention mechanic the jury must see working (plan + reminders, Q100), and the paid moment is the dollar figure at the shop counter, which is what users pay for (Q7). Renewal logic for the deck: each service visit (2–3/year) is a fresh reason to keep Plus (Q30).

**Fixed from MyAutoLog gaps:** VIN field and decode; schedule uses drivetrain/hybrid inputs; warranty is a first-class card, not a custom document; paywall shown only after the user sees a result; quote check against the plan is the core feature.

**Shallow (works, not deep):** voice log, export/import, resale QR, fix-or-sell, guides, assistant, photo diagnosis, documents, benchmark, shop finder (Google Maps search link, no Places API).

**Not in scope:** real payments, accounts/login, push notifications, OBD hardware, home assets, shop marketplace.

## Ownership (from AGENTS.md)

| Owner | Tasks |
|---|---|
| @gowtheeer (data, payments, deploy) | 1, 2, 2A, 2B, 7, 13 |
| @megategus (backend, lead) | 2C, 3, 4, 5, 6, 8, 10 (+ check 2B content) |
| @igor123456hhh-tech (frontend) | 9, 11, 12 |
| @peacefulww (pitch) | 14 |

Parallel lanes after Task 1 lands: Tasks 2, 2A, 2B ‖ Tasks 3–5 ‖ Task 9. Task 6 needs 2+5; Task 2C needs 2A+2B+6; Task 11 needs 6+9; Task 7 any time after 1.

## File Structure

```
app/                         (igor) pages and layout
  layout.tsx, page.tsx       landing + "Try with a sample car" CTA
  car/new/page.tsx           add car
  car/[id]/page.tsx          car home: recalls, warranty, plan, log
  car/[id]/check/page.tsx    quote input
  check/[checkId]/page.tsx   verdict + paywall
  car/[id]/log/page.tsx      service/fuel log, voice log
  car/[id]/assistant/page.tsx
  r/[token]/page.tsx         public resale record
  manifest.ts                PWA manifest
app/api/                     (megategus) route handlers
  vin/route.ts, cars/route.ts, cars/[id]/route.ts, recalls/route.ts
  quotes/check/route.ts, records/route.ts, records/voice/route.ts
  plan/[carId]/route.ts, plan/[carId]/ics/route.ts
  assistant/route.ts, export/route.ts, import/route.ts, resale/route.ts
  checkout/route.ts, checkout/confirm/route.ts        (gowtheeer)
components/                  (igor) UI parts
lib/                         (megategus) logic, no React
  types.ts                   shared types (Task 3)
  guest.ts, db.ts            guest cookie, Supabase server client
  vehicle/vin.ts, vehicle/recalls.ts
  pricing/fairRange.ts, schedule/plan.ts, schedule/upsell.ts
  warranty/coverage.ts, quote/parse.ts, quote/check.ts
  ai/client.ts, ai/assistant.ts, records/voice.ts
  fixOrSell.ts, benchmark.ts, guides.ts, entitlements.ts
db/                          (gowtheeer)
  migrations/0001_init.sql
  seed/labor_hours.json, state_rates.json, schedules.json, warranty.json, parts.json, sample_quotes.json
tests/                       mirrors lib/ (Vitest)
```

## Review Focus

1. **Quote line the parser cannot map to a known job** (e.g. "shop supplies", "misc"): expect verdict `unknown` with "no benchmark for this line" and it is excluded from the overpay total, never a made-up range. Test in Task 6.
2. **Car not in seed tables** (make with no schedule or warranty row): expect generic schedule and "warranty unknown, check your manual", no crash. Tests in Tasks 5 and 8.
3. **Bad or partial VIN / NHTSA down**: invalid VIN shows "VIN not recognized, enter year/make/model"; NHTSA timeout (5 s) falls back to manual entry and recalls show "Couldn't reach NHTSA, try again". Tests in Task 4.
4. **Unreadable photo or empty quote text**: Claude returns zero lines, user sees "We couldn't read any prices, paste the text or try another photo", no empty verdict saved. Test in Task 6.
6. **Shop with no published price / ZIP outside the demo district**: shop listed without price, or "No published prices nearby"; never an estimated shop price. Test in Task 10 Step 0.
5. **Mileage lower than last record or blank**: reject on save with "Mileage can't go down"; plan uses last known mileage. Test in Task 8.

---

### Task 1: Scaffold, env and deploy pipeline (@gowtheeer)

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `app/layout.tsx`, `app/page.tsx` (placeholder), `app/manifest.ts`, `tests/smoke.test.ts`
- Modify: `README.md` (what it is, how to run, env vars, key dependencies list per Q48)

**Interfaces:**
- Produces: `npm run dev`, `npm test` (Vitest), `npm run build`; env names `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`.

- [ ] **Step 1:** `npx create-next-app@15 . --ts --tailwind --app --eslint --no-src-dir`, add `vitest`, `zod`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `stripe`, `qrcode`, `@react-pdf/renderer`.
- [ ] **Step 2:** Write `tests/smoke.test.ts`: `expect(1+1).toBe(2)`; run `npm test`, expect PASS.
- [ ] **Step 3:** `app/manifest.ts` returns name "Counter Check", `display: "standalone"`, theme color placeholder (design task replaces).
- [ ] **Step 4:** Link Vercel project to the repo, set env vars in Vercel (Production + Preview), push; expect the placeholder page live on `*.vercel.app`. Post the URL on the board.
- [ ] **Step 5:** Commit `chore: scaffold Next.js app, env and Vercel deploy`.

### Task 2: Database and sourced seed tables (@gowtheeer)

**Files:**
- Create: `db/migrations/0001_init.sql`, `db/seed/*.json` (6 files), `tests/seed.test.ts`

**Interfaces:**
- Produces tables (all with `guest_id text not null`, `created_at timestamptz default now()`):
  - `cars(id uuid pk, vin text, year int, make text, model text, trim text, drivetrain text, fuel text, state char(2), mileage int, original_owner bool, purchase_date date)`
  - `service_records(id uuid pk, asset_type text default 'car', asset_id uuid, service_date date, mileage int, source text check in ('manual','voice','quote','import'), shop text, lines jsonb, total_cents int)`
  - `quote_checks(id uuid pk, car_id uuid, input_kind text, raw_text text, image_path text, parsed jsonb, verdict jsonb, overpay_cents int)`
  - `reminders(id uuid pk, car_id uuid, service_key text, due_mileage int, due_date date, status text default 'open')`
  - `documents(id uuid pk, car_id uuid, kind text, file_path text, expires_on date)`
  - `entitlements(guest_id text pk, plan text default 'free', stripe_session_id text, assistant_day date, assistant_count int default 0, checks_month text, checks_count int default 0, updated_at timestamptz)` (free-tier counters)
  - Storage bucket `uploads` (private).
- Produces seed JSON, every row has `source` (URL or "assumption") and `as_of` date:
  - `labor_hours.json`: `{ job_key, label, aliases[], hours_low, hours_high }`, at least 15 jobs: oil_change, tire_rotation, brake_pads_front, brake_pads_rear, rotors_front, battery, engine_air_filter, cabin_air_filter, coolant_flush, transmission_fluid, spark_plugs, brake_fluid, wiper_blades, alignment, serpentine_belt, fuel_injector_cleaning, throttle_body_cleaning.
  - `state_rates.json`: `{ state, shop_rate_low, shop_rate_high }` for all 50 states + DC = BLS auto-tech wage × markup (label "assumption").
  - `parts.json`: `{ job_key, parts_low_cents, parts_high_cents }`.
  - `schedules.json`: `{ make | "generic", job_key, interval_miles, interval_months, severe_interval_miles, applies_to: { drivetrain?: ["4wd","awd"], fuel?: ["hybrid"] } }` for generic + Toyota, Honda, Ford, Chevrolet, Hyundai, Kia, Nissan, Subaru.
  - `warranty.json`: `{ make, basic_years, basic_miles, powertrain_years, powertrain_miles, powertrain_original_owner_only?: { years, miles }, hybrid_years?, hybrid_miles?, covered_jobs: { powertrain: [...] } }` for 15 brands, plus federal emissions row (8 yr / 80k: catalytic converter, ECU).
  - `sample_quotes.json`: 3 labeled quotes as raw text: (a) Civic 2019 with padded coolant flush + fuel injector cleaning, (b) Hyundai Elantra 2018 water pump inside powertrain warranty, (c) fair Camry brake job.

- [ ] **Step 1:** Write `tests/seed.test.ts`: every seed row has non-empty `source` and `as_of`; every `job_key` in schedules/parts exists in labor_hours; 51 state rows; `hours_low <= hours_high`.
- [ ] **Step 2:** Run, expect FAIL (files missing).
- [ ] **Step 3:** Draft tables (agent may draft; a person checks the rows the 3 sample quotes use). Write migration; apply via Supabase MCP `apply_migration`.
- [ ] **Step 4:** Run `npm test tests/seed.test.ts`, expect PASS.
- [ ] **Step 5:** Commit `feat(db): schema and sourced seed tables`. Post on board: table names are live.

### Task 2A: Demo district, local shops and their prices (@gowtheeer)

Demo location: **Austin, TX, ZIP codes 78704 and 78745 (South Austin)**. Lead may swap the district; the code takes any ZIP list.

**Free sources (no paid keys):**
- Shop list: OpenStreetMap Overpass API, `shop=car_repair` / `shop=tyres` / `craft=car_repair` inside the two ZIPs' bounding box (name, address, lat/lon, website, phone). License ODbL: show "© OpenStreetMap contributors".
- Prices: each shop's own public website (posted oil change, brake, tire rotation, battery, alignment prices or specials), read by hand or by an agent, one row per price with the page URL and date. No scraping of RepairPal/Yelp/Google (terms of service).
- Where a shop posts no price: no row. The app shows the shop without a price, never an invented one.

**Files:**
- Create: `db/migrations/0002_local.sql`, `db/seed/shops_austin.json`, `db/seed/shop_prices_austin.json`, `scripts/fetch-osm-shops.ts`, `tests/local.test.ts`

**Interfaces:**
- Produces tables:
  - `shops(id uuid pk, osm_id text unique, name text, address text, zip text, lat float8, lon float8, website text, phone text, kind text check in ('dealer','independent','chain','tire'), source text, as_of date)`
  - `shop_prices(id uuid pk, shop_id uuid, job_key text, price_cents int, includes text, source_url text not null, as_of date not null, is_special bool default false)`
  - View `job_price_stats(zip, job_key, n, min_cents, median_cents, max_cents)`.
- Target: at least 15 shops, at least 25 price rows covering oil_change, brake_pads_front, tire_rotation, battery, alignment.

- [ ] **Step 1:** Test: every `shop_prices` row has `source_url` and `as_of`; every `job_key` exists in `labor_hours.json`; every shop zip is in the demo list.
- [ ] **Step 2:** FAIL. Run `scripts/fetch-osm-shops.ts --zips 78704,78745` (writes `shops_austin.json`), collect prices into `shop_prices_austin.json`, load both via Supabase MCP.
- [ ] **Step 3:** PASS. Commit `feat(db): Austin demo shops and published prices`. Post on board: tables + row counts.

### Task 2B: Three demo cars with model-specific content, stored in Supabase (@gowtheeer data, @megategus checks)

Demo cars = the three best-selling US vehicles: **2019 Ford F-150 (2.7L EcoBoost, 4WD)**, **2020 Chevrolet Silverado 1500 (5.3L V8, 4WD)**, **2021 Toyota RAV4 Hybrid (AWD)**. Each is distinct: truck turbo V6, truck V8, hybrid AWD, so schedules, warranty (Toyota hybrid battery) and guides all differ.

**Files:**
- Create: `db/migrations/0003_models.sql`, `db/seed/models.json`, `tests/models.test.ts`

**Interfaces:**
- Produces tables:
  - `vehicle_models(id text pk, year int, make text, model text, engine text, drivetrain text, fuel text, oil_spec text, oil_capacity_qt numeric, tire_size text, tire_pressure_psi int, msrp_cents int, source text, as_of date)` (id like `2021-toyota-rav4-hybrid`)
  - `model_schedule(model_id text, job_key text, interval_miles int, interval_months int, severe_interval_miles int, notes text, source text)` (owner's-manual schedule; overrides `schedules.json` for these models in `duePlan`)
  - `model_guides(id uuid pk, model_id text, job_key text, kind text check in ('maintenance','repair'), title text, difficulty text check in ('easy','medium','hard','shop_only'), time_min int, tools text[], parts text[], steps jsonb, video_url text, source text)`: per car at least 5 maintenance guides (oil change, air filter, cabin filter, tire rotation, wiper blades) and 3 repair guides (battery, brake pads, one model-specific known issue, e.g. F-150 2.7L PCV/oil consumption check, Silverado AFM lifter symptoms, RAV4 Hybrid 12V battery). Steps drafted by Claude from the owner's manual and checked by a person; `video_url` = CarCareKiosk page for that make/model if verified, else make page.
  - `model_common_issues(model_id text, title text, symptom text, typical_cost_low_cents int, typical_cost_high_cents int, source text)`
- `duePlan` (Task 5) reads `model_schedule` first, then `schedules.json`.

- [ ] **Step 1:** Test: 3 models; each has ≥ 5 maintenance + ≥ 3 repair guides; each guide has steps and source; the three schedules differ (at least one job_key interval differs per pair).
- [ ] **Step 2:** FAIL, fill data, load, PASS. Commit `feat(db): 3 demo models with schedules and guides`.

### Task 2C: Synthetic demo profile (@megategus)

One labeled synthetic owner so the jury sees a lived-in account in one click.

**Profile "Jordan, 34, South Austin (78745), sample data":** owns the 2021 RAV4 Hybrid (38,400 mi) and the 2019 F-150 (71,200 mi).
- 14 months of history per car: service records (oil changes, rotations, one brake job, one battery), with shop names and prices drawn from Task 2A rows where they exist.
- Synthetic service bills ("paychecks" in the brief, read as receipts): 2 overpaid bills with a padded coolant flush and a fuel injector cleaning, so the benchmark and "money saved" numbers come out of real logic.
- 3 past quote checks, open reminders (one overdue), one expiring insurance document (Plus demo).
- The Silverado stays as a "fresh car" for the jury to add themselves via VIN or year/make/model.

**Files:**
- Create: `db/seed/demo_profile.json`, `lib/demo.ts`, `app/api/demo/route.ts`, `tests/demo.test.ts`

**Interfaces:**
- Produces: `loadDemoProfile(guestId): Promise<{ carIds: string[] }>` copies the demo rows into the visitor's own `guest_id` (so the jury can edit without breaking it for others); every copied row gets `is_sample = true` (add `is_sample bool default false` to `cars`, `service_records`, `quote_checks`, `documents`).
- `POST /api/demo` → `{ carIds }`; the landing "Try with a sample owner" button calls it.
- [ ] **Step 1:** Test: loading twice for the same guest does not duplicate; all rows `is_sample`; quote checks re-run through `checkQuote` (verdicts computed, not stored from JSON).
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat: synthetic demo profile`.

### Task 3: Shared types, guest identity, DB client (@megategus)

**Files:**
- Create: `lib/types.ts`, `lib/guest.ts`, `lib/db.ts`, `middleware.ts`, `tests/guest.test.ts`

**Interfaces:**
- Produces in `lib/types.ts`:
  - `type Car = { id; vin?; year; make; model; trim?; drivetrain?: 'fwd'|'rwd'|'awd'|'4wd'; fuel?: 'gas'|'diesel'|'hybrid'|'ev'; state; mileage; originalOwner; purchaseDate? }`
  - `type QuoteLine = { raw: string; jobKey: string | null; laborHours?: number; partsCents?: number; totalCents: number }`
  - `type LineVerdict = { line: QuoteLine; status: 'fair'|'high'|'upsell'|'warranty'|'recall'|'unknown'; fairLowCents?; fairHighCents?; overpayCents: number; reason: string; sayToShop?: string }`
  - `type QuoteVerdict = { lines: LineVerdict[]; totalCents; overpayCents; flaggedCount; disclaimer: string }`
  - `type DueService = { jobKey; label; dueMiles?; dueDate?; overdue: boolean; source: string }`
  - `type ServiceRecord = { id; assetType: 'car'; assetId: string; serviceDate: string; mileage: number; source: 'manual'|'voice'|'quote'|'import'; shop?: string; lines: { jobKey: string | null; label: string; totalCents: number }[]; totalCents: number }`
  - `type Plan = 'free' | 'plus'`
- Produces: `getGuestId(req): string` (reads/creates `cc_guest` httpOnly cookie, uuid v4, 1 year), `db()` returns Supabase client with service key (server-only import guard).

- [ ] **Step 1:** Test: `getGuestId` returns same id when cookie present; new uuid when absent.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement; `middleware.ts` sets the cookie on first visit.
- [ ] **Step 4:** Run, expect PASS. Commit `feat(lib): shared types and guest identity`.

### Task 4: VIN decode and recalls (@megategus)

**Files:**
- Create: `lib/vehicle/vin.ts`, `lib/vehicle/recalls.ts`, `app/api/vin/route.ts`, `app/api/recalls/route.ts`, `app/api/cars/route.ts`, `app/api/cars/[id]/route.ts`, `tests/vehicle.test.ts`

**Interfaces:**
- Produces: `decodeVin(vin: string): Promise<Partial<Car> | { error: 'invalid' | 'unavailable' }>` via `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/<vin>?format=json` (map ModelYear, Make, Model, Trim, DriveType, FuelTypePrimary/ElectrificationLevel), 5 s timeout.
- Produces: `getRecalls(car): Promise<{ items: { campaign, component, summary, remedy }[] } | { error: 'unavailable' }>` via `https://api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=` (model-level; copy says "Recalls for this model").
- Produces: `POST /api/cars` (zod-validated Car minus id), `GET /api/cars`, `GET/PATCH /api/cars/[id]`.

- [ ] **Step 1:** Tests with mocked fetch: valid VIN maps fields; VIN with ErrorCode not "0" returns `invalid`; 17-char check before fetch; timeout returns `unavailable`; recall mapping; recall timeout returns `unavailable` (Review Focus 3).
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement. **Step 4:** Run, expect PASS.
- [ ] **Step 5:** Commit `feat(api): VIN decode, recalls, car CRUD`.

### Task 5: Pricing, schedule, upsell and warranty engines (@megategus)

**Files:**
- Create: `lib/pricing/fairRange.ts`, `lib/schedule/plan.ts`, `lib/schedule/upsell.ts`, `lib/warranty/coverage.ts`, `tests/engines.test.ts`

**Interfaces:**
- Consumes: Task 2 seed JSON, Task 3 types.
- Produces:
  - `fairRange(jobKey: string, state: string): { lowCents; highCents; basis: string } | null` = hours × state rate + parts, low/high each.
  - `duePlan(car: Car, history: ServiceRecord[], today: Date): DueService[]` (make rows override generic; skip rows whose `applies_to` doesn't match drivetrain/fuel; due = last done + interval, or interval multiples from 0 when never done).
  - `upsellFlag(jobKey: string, car: Car, history: ServiceRecord[]): { isUpsell: boolean; reason: string } | null` (upsell when next due is more than 5,000 miles away and no severe-schedule reason).
  - `warrantyCoverage(car: Car, jobKey: string, today: Date): { status: 'likely'|'possibly'|'not_covered'|'unknown'; reason; until?: { date?: string; miles?: number } }` (age from purchaseDate else Jan 1 of model year; non-original-owner uses `powertrain_original_owner_only` when present).
- [ ] **Step 1:** Tests with exact values: coolant flush offered at 45,000 mi on a Toyota with 100,000-mi interval → `isUpsell: true`; brake pads TX → range from table; 2018 Elantra original owner, 62,000 mi, water pump → `likely` under 10 yr/100k; same car second owner → `not_covered` beyond 5 yr/60k; unknown make → generic plan + warranty `unknown` (Review Focus 2); hybrid-only row excluded for gas car.
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement. **Step 4:** Run, expect PASS.
- [ ] **Step 5:** Commit `feat(lib): pricing, schedule, upsell, warranty engines`.

### Task 6: Quote parse and check, the core pipeline (@megategus)

**Files:**
- Create: `lib/ai/client.ts`, `lib/quote/parse.ts`, `lib/quote/check.ts`, `app/api/quotes/check/route.ts`, `tests/quote.test.ts`

**Interfaces:**
- Consumes: Task 4 `getRecalls`, Task 5 engines, Task 3 types.
- Produces:
  - `parseQuote(input: { text?: string; imageBase64?: string; mediaType?: string }): Promise<QuoteLine[]>`: one `claude-sonnet-5-5` call with a tool whose JSON schema is `QuoteLine[]`; the prompt lists allowed `job_key`s and aliases from `labor_hours.json`, unknown lines get `jobKey: null`. Validate with zod.
  - `checkQuote(lines: QuoteLine[], ctx: { car; history; recalls; today }): QuoteVerdict` (pure). Precedence per line: recall match → `recall`, warranty `likely` → `warranty` (overpay = full line), upsell → `upsell` (overpay = full line), above `highCents` → `high` (overpay = total − high), else `fair`; `jobKey null` → `unknown`, overpay 0.
  - `POST /api/quotes/check` body `{ carId, text? , imageBase64?, sampleId? }` → stores `quote_checks` row, returns `{ checkId, verdict, plan }`. Free plan response omits `sayToShop` and per-line ranges beyond the first 2 lines (`locked: true`).
- [ ] **Step 1:** Tests on `checkQuote` with fixed lines: sample (a) gives 2 upsell lines and overpay = their totals; "shop supplies $35" → `unknown`, excluded (Review Focus 1); line above high → overpay = difference; empty lines array → throws `NoLinesError` (Review Focus 4).
- [ ] **Step 2:** Test `parseQuote` with mocked Anthropic client: tool output mapped; invalid JSON → retries once then throws.
- [ ] **Step 3:** Run, expect FAIL. **Step 4:** Implement. **Step 5:** Run, expect PASS.
- [ ] **Step 6:** Manual check: `curl -X POST localhost:3000/api/quotes/check -d '{"carId":"…","sampleId":"a"}'` returns verdict with overpay > 0.
- [ ] **Step 7:** Commit `feat(core): quote parse and check pipeline`. Post on board: response shape is live.

### Task 7: Paywall and Stripe test checkout (@gowtheeer)

**Files:**
- Create: `lib/entitlements.ts`, `app/api/checkout/route.ts`, `app/api/checkout/confirm/route.ts`, `tests/entitlements.test.ts`

**Interfaces:**
- Produces: `getPlan(guestId): Promise<Plan>`, `POST /api/checkout { interval: 'month'|'year' }` → Stripe Checkout Session (test mode, prices $5.99/mo, $39.99/yr, 7-day trial) → `{ url }`; `GET /api/checkout/confirm?session_id=` verifies session `status === 'complete'` and the session's `client_reference_id === guestId`, then upserts `entitlements.plan = 'plus'`, redirects back.
- [ ] **Step 1:** Test: confirm with mismatched guest id does not grant Plus; completed session grants Plus.
- [ ] **Step 2:** Run FAIL, implement, run PASS.
- [ ] **Step 3:** Commit `feat(payments): Stripe test checkout and entitlements`.

### Task 8: Maintenance plan, reminders and service records (@megategus)

**Files:**
- Create: `app/api/plan/[carId]/route.ts`, `app/api/plan/[carId]/ics/route.ts`, `app/api/records/route.ts`, `lib/records/save.ts`, `tests/records.test.ts`

**Interfaces:**
- Consumes: Task 5 `duePlan`.
- Produces: `saveRecord(input): Promise<ServiceRecord>` (rejects mileage lower than the car's latest record with `MileageWentDownError`, updates `cars.mileage`, regenerates `reminders` from `duePlan`); `GET /api/plan/[carId]` → `DueService[]`; `GET .../ics` → `text/calendar` with one event per due item that has a date; checked quotes saved as `source: 'quote'` via a "Save to my records" action.
- [ ] **Step 1:** Tests: mileage down rejected (Review Focus 5); saving an oil change moves next oil change due by interval; unknown make still returns generic plan; ics contains `BEGIN:VEVENT` per dated item.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(core): records, plan, reminders, calendar export`.

### Task 9: Design system and app shell (@igor123456hhh-tech)

**Files:**
- Create: `components/ui/*`, `app/globals.css` tokens, `components/AppShell.tsx` (bottom tab bar on phone, side nav ≥ 1024px), `components/SampleBadge.tsx`, `components/Disclaimer.tsx`

- [ ] **Step 1:** Run `/design-consultation` (design agent) for tokens, type scale, colors; record the result in `docs/design.md`.
- [ ] **Step 2:** Build shell and primitives; check at 375px and 1440px widths in the browser pane; no horizontal scroll.
- [ ] **Step 3:** Commit `feat(ui): design tokens and responsive app shell`.

### Task 10: Shallow features, backend (@megategus)

**Files:**
- Create: `lib/records/voice.ts`, `app/api/records/voice/route.ts`, `lib/ai/assistant.ts`, `app/api/assistant/route.ts`, `lib/fixOrSell.ts`, `lib/benchmark.ts`, `lib/guides.ts`, `app/api/export/route.ts`, `app/api/import/route.ts`, `app/api/resale/route.ts`, `tests/shallow.test.ts`

**Interfaces:**
- `voiceToRecord(transcript: string, car: Car): Promise<Partial<ServiceRecord>>` (Haiku, returns a draft the user confirms; never auto-saves).
- `askAssistant({ car, history, message, imageBase64? }): Promise<{ answer: string }>` (system prompt carries car, plan, history; photo uses Sonnet; free plan: 3/day via `entitlements.assistant_day/assistant_count`; over limit returns 402 `{ upgrade: true }`).
- `fixOrSell(car, repairCents, today): { verdict: 'fix'|'consider_selling'; estValueCents; reason }`, value = depreciation curve from MSRP band assumption (label "estimate").
- `expectedYearlyCost(car): number` and `benchmark(car, history)` = user's last-12-month spend vs expected cost from plan × fair prices ("expected cost for a car like yours", not other owners).
- `guideUrl(car, jobKey): string` → `https://www.carcarekiosk.com/videos/<Make with + for spaces>` (deeper path only if verified).
- `cheaperNearby(jobKey: string, zip: string, quotedCents: number): { shops: { name, address, priceCents, sourceUrl, asOf, savingsCents }[]; stats: { n, minCents, medianCents } | null }` from `shop_prices` + `job_price_stats` (only shops with a published price, sorted by price; `stats: null` and copy "No published prices nearby" when n = 0). `GET /api/shops?jobKey=&zip=&quoted=`.
- `GET /api/export?carId=` JSON; `POST /api/import` validates same schema; `POST /api/resale { carId }` → `{ token, url }` public read-only page at `/r/[token]`.
- [ ] **Step 0:** Tests for `cheaperNearby`: oil change quoted $120 in 78745 returns shops priced below it with `savingsCents`; unknown ZIP returns `stats: null`; shops without a price row never appear.
- [ ] **Step 1:** Tests: guideUrl for "Land Rover" → `.../videos/Land+Rover`; fixOrSell returns `consider_selling` when repair > 50% of value; import rejects malformed JSON; export→import round-trip equal.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat: shallow features backend`.

### Task 11: Core flow UI (@igor123456hhh-tech)

**Files:**
- Create: `app/page.tsx`, `app/car/new/page.tsx`, `app/car/[id]/page.tsx`, `app/car/[id]/check/page.tsx`, `app/check/[checkId]/page.tsx`, `components/VerdictLine.tsx`, `components/Paywall.tsx`, `components/RecallCard.tsx`, `components/WarrantyCard.tsx`, `components/PlanList.tsx`

**Interfaces:**
- Consumes: Task 4, 6, 7, 8 routes and types.

- [ ] **Step 1:** Landing: one-line promise + "Try with a sample owner" (calls `POST /api/demo`, Task 2C, banner "Sample data" on every sample screen) + "Add my car" (suggest the Silverado 1500 as the quick demo pick).
- [ ] **Step 1b:** Verdict screen: per flagged line, "Cheaper nearby" list from `GET /api/shops` (name, price, source link, date, savings), map link per shop, OSM attribution. Car home: model guides (maintenance + repair, difficulty, time, tools, steps) and common issues from Task 2B for the 3 demo models; other cars get the CarCareKiosk link only.
- [ ] **Step 2:** Add car: VIN field with decode, fallback manual fields, mileage, state, original owner, drivetrain/fuel prefilled from VIN.
- [ ] **Step 3:** Car home: warranty card, recall card, next 3 due services, "Check a quote" primary button, calendar export.
- [ ] **Step 4:** Quote input: camera/file (`accept="image/*" capture="environment"`), paste box, 3 sample chips; loading state; error copy from Review Focus 4.
- [ ] **Step 5:** Verdict: total overpay headline, five-check strip (price, schedule, warranty, recall, unknown), lines with status; locked lines + Paywall with test card text; "Save to my records".
- [ ] **Step 6:** Walk the flow on the production URL at 375px and 1440px as the jury would. Commit `feat(ui): core quote-check flow`.

### Task 12: Shallow features UI (@igor123456hhh-tech)

**Files:**
- Create: `app/car/[id]/log/page.tsx` (log list, add form, mic button using `webkitSpeechRecognition` when available, hidden otherwise), `app/car/[id]/assistant/page.tsx` (chat + photo), `app/r/[token]/page.tsx` (resale record + QR via `qrcode`), export/import buttons, fix-or-sell card, benchmark card (Plus), guides links on each due service, documents list (Plus, upload + expiry date), "Find shops nearby" Google Maps search link.

- [ ] **Step 1:** Build each as one screen with real data; hide any control whose API is not live yet (Q85).
- [ ] **Step 2:** Commit `feat(ui): logs, voice, assistant, resale, documents`.

### Task 13: Production hardening and submission checks (@gowtheeer, with lead)

- [ ] **Step 1:** Run `/qa` against the production URL: full core flow on mobile and desktop widths, all 3 samples, one real typed quote, checkout with test card.
- [ ] **Step 2:** Verify no secrets: `git grep -nE "sk_(test|live)|sk-ant|service_role"` returns nothing.
- [ ] **Step 3:** README final: what it is, live URL, how to run, env vars, dependencies (Claude, Supabase, Stripe test, NHTSA), sample data note.
- [ ] **Step 4:** Repo public; code freeze 11:00 Nov 15; captain submits deck PDF + URL + repo before 12:00.

### Task 14: Deck and unit economics (@peacefulww)

**Files:**
- Create: `pitch/deck.pdf` (≤ 10 slides incl. title), `pitch/unit-economics.xlsx`

- [ ] **Step 1:** Slides: problem + user, product flow (screenshots, no video), what they pay for + price, why they renew, numbers (price, CAC by channel, retention, LTV, sources: RevenueCat/Adapty benchmarks), competitors (MyAutoLog, CARFAX Car Care, RepairPal/KBB, FIXD) and our angle, roadmap (home assets via asset-agnostic records).
- [ ] **Step 2:** Excel: inputs labeled sourced vs assumption; LTV/CAC per channel.
- [ ] **Step 3:** Export PDF, check every number matches the app.

## Skills and tools to use

- `deploy-to-vercel`, `vercel-react-best-practices`, Vercel MCP (deploy logs, runtime errors).
- Supabase MCP (`apply_migration`, `execute_sql`, `get_advisors`).
- `claude-api` skill before writing `lib/ai/*` (model ids, tool use, vision).
- `/design-consultation` (design agent), `frontend-ui-engineering`, `web-design-guidelines`.
- `test-driven-development` for Tasks 2–8, 10; `/qa` and `/review` before merges; `/ship` for PRs.
