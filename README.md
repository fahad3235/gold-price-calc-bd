# Gold Price Calculator BD — স্বর্ণের দাম ক্যালকুলেটর

A free, fully offline, bilingual (English ⇄ বাংলা) gold price calculator for
Bangladesh. Enter the per-bhori market rate, pick a karat, enter the weight in
bhori / ana / ratti / gram, add a making-charge %, and get an itemized price
breakdown — plus a local price-history log with JSON export/import.

## 1. The problem

Gold shoppers in Bangladesh do mental math against a jeweller's quote: rates
are quoted per bhori (for 24k), but jewellery is sold in 22k/21k/18k, weighed in
ana and ratti, with a making charge added on top. There is no live public price
feed in this app by design — you type today's market rate once, and the app
does the exact arithmetic: purity scaling, unit conversion, and making charge.

## 2. Features

- **Per-bhori rate input (BDT)** — clearly labelled *"Enter today's market rate
  (no live feed)"*; rates are entered by you, never fetched
- **Karat selector** — 24 / 22 / 21 / 18; price scales by purity (karat ÷ 24)
- **Weight entry in bhori / ana / ratti / gram** — exact conversions:
  1 bhori = 16 ana = 96 ratti = 11.664 g (so 1 ratti = 0.1215 g); the result
  shows the weight expressed in all four units
- **Making-charge % input** — `total = weight_bhori × rate × (karat/24) × (1 + making%/100)`
- **Itemized breakdown** — weight, 24k rate, purity factor, gold price, making
  charge, total payable
- **Price history log** — save rate + date (+ optional note) entries in
  localStorage; add / delete; JSON export / import (round-trip verified)
- **Bilingual UI** — full English ⇄ বাংলা toggle with Bengali digits
  (৩,০২,৫০০), persisted across reloads
- **Input validation** — inline errors for non-positive rate/weight and making
  charge outside 0–100; results stay hidden until inputs are valid
- **Empty states** — friendly placeholders for "no calculation yet" and
  "no saved rates yet"
- **Responsive** — single-column layout, no horizontal overflow at 390px
- **Persistence** — last rate, karat, weight, unit, making charge and language
  auto-restore on reload

## 3. Stack

Plain HTML + CSS + vanilla JavaScript. No frameworks, no build step, no
backend, zero network requests. Runs from any static host (or `file://`).

## 4. Prerequisites

Any modern browser (Chrome, Edge, Firefox, Safari). Nothing to install.
For running the test suite: Node.js 18+ and the bundled `node_modules`
(puppeteer-core + a system Chromium at `/opt/meta-chromium/chrome`).

## 5. Install

No install step. Download the folder and open `index.html`, or serve it:

```bash
cd gold-price-calc-bd
python3 -m http.server 8000
# open http://localhost:8000
```

## 6. Dev commands

There is no build. Edit the files and refresh. Pure math lives in
`js/calc.js` (shared by the page and the unit tests); UI strings in
`js/i18n.js`; wiring in `js/app.js`.

```bash
node test-unit.js   # 29 unit checks: conversions, pricing formula, formatting
node smoke.js       # 50 headless-Chromium checks (needs node_modules + chrome)
```

## 7. Environment variables

None. The app makes zero network requests and uses no keys, tokens or
secrets. (The test harness's Chromium path is a command-line flag, not an
env var.)

## 8. Testing

Two suites, both run for real before every release:

- **Unit** (`node test-unit.js`) — 29 checks: exact conversions
  (16 ana / 96 ratti / 11.664 g = 1 bhori; 8 ana = 0.5 bhori), pricing formula
  including the hand-verified **৳302,500** case (2 bhori 22k @ ৳150,000/bhori
  + 10% making charge), 1 ratti @ ৳150,000 = ৳1,562.50, Indian-style
  lakh/crore grouping, Bengali-digit conversion.
- **Browser** (`node smoke.js`) — 50 headless-Chromium checks: UI calculation
  matches the hand math, karat switching (24/22/18), unit switching
  (bhori/ana/ratti/gram equivalences), making charge 0%, validation errors,
  history add/delete, localStorage persistence across reload, EN⇄বাংলা toggle
  with Bengali digits, export → clear → import round-trip, bad-import
  rejection, 390px mobile (no overflow, calc works), and **zero** console/page
  errors plus **zero** non-`file://` network requests throughout.

Latest run: **29/29 unit + 50/50 browser, 0 failures, 0 errors.**

## 9. Deployment

GitHub Pages compatible — it is a static site. Push the folder contents to a
repo (or the repo root), enable Pages, and it works. No server, no build, no
env vars to configure.

## 10. The formula (worked example)

```
1 bhori = 16 ana = 96 ratti = 11.664 g
purity factor = karat / 24
base   = weight_in_bhori × rate_per_bhori × (karat/24)
making = base × (making_pct / 100)
total  = base + making
```

Hand-verified: 2 bhori of 22k gold at ৳150,000/bhori with 10% making charge →
2 × 150,000 × 22/24 = 275,000 → × 1.10 = **৳302,500**.

## 11. Limitations

- **No live price feed** — the rate is typed in by you; the app cannot tell you
  today's market price and makes no attempt to fetch one.
- **Estimate only** — jewellers may use slightly different making-charge bases
  (e.g. per-bhori flat fees) or rounding; verify against the shop's quote.
- History and settings live in the browser's localStorage; clearing site data
  erases them (export JSON as a backup).
- Import accepts only files matching the exported schema; malformed files are
  rejected with a toast.

## 12. Status

Built and verified 2026-10-12 (factory run #31). 29/29 unit tests and 50/50
headless-Chromium checks pass, zero console/page errors, zero network
requests. Not published — awaiting coordinator publication.
