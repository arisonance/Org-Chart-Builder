# UX Loop — Running Report

Audience & rules: see `.claude/skills/ux-loop/SKILL.md`.
Each entry: what was confusing, the evidence, what changed, before/after.

## Iteration 1 — Tier 1: trust & orientation (2026-07-01)

### 1. Channel lens: 23 pairs of overlapping cards (chart truthfulness) — FIXED
- **Evidence**: `t1-lens-sweep` facts — 23 content-node overlap pairs on the
  channel lens first frame; live measurement showed every shared-service
  card rendered 196–227px tall while the layout grid advanced 190px per row.
- **Why it mattered**: stacked cards read as structure that doesn't exist —
  Ari's #1 embarrassment risk in an SLT walkthrough.
- **Fix** (`8c1761e`): shared-service cards now have a fixed, data-independent
  height (164px) that the grid stride matches; chips clip in one row instead
  of wrapping. Lane owner-context cards moved below the counter-scaled lane
  header (they used to cover lane titles like "INTERNATIONAL R…"), and lane
  top padding derives from the real context-row count. Badge copy
  "Shared-service pod" → "Shared services" (vocabulary law).
- **Verified**: overlapPairs 23 → 0 on channel; senior/brand/department
  unchanged at 0; 95/95 unit tests pass.
- Before/after: `shots/01-channel-overlap-before.png` / `-after.png`

### 2. Zoomed to 4% = blank page with no way back (camera confidence) — FIXED
- **Evidence**: `t1-camera-lost` — at 4% zoom the org is an illegible speck;
  the rescue pill only fired when *zero* people intersected the viewport, so
  nothing appeared. (Panning away did show the pill — inconsistent.)
- **Fix** (`569a010`): the pill also fires below ~55% of the lens's readable
  fit zoom, reading "Zoomed far out / Show overview".
- **Verified**: all three lost states now rescue; healthy states stay quiet.
  Audit scenario asserts the pill text in both lost states.
- Before/after: `shots/02-lost-zoom-before.png` / `-after.png`

### 3. Escape didn't exit team views (drill-in/out reversibility) — FIXED
- **Evidence**: `t1-drill-in-out` — drilling into "Technology & IT" via an
  area chip opens a clean Team view with a Back button and an Undo toast,
  but Esc did nothing (facts showed the Team view persisting after Esc).
  The only other way out was double-clicking blank canvas — undiscoverable.
- **Fix** (`da0c788`): Esc steps back one level — clears selection first,
  then exits the team view exactly like "Back to broader view". Open dialogs
  keep owning Esc. Button tooltip now advertises "(Esc)".
- **Verified**: facts show the full round trip (9 cards → 5 in team view →
  Esc → 9 in the official view).

### 4. "Reset Demo" wiped everything in one click (destructive guard) — FIXED
- **Evidence**: More menu item called `resetToDemo` directly — no
  confirmation, from a menu two items below Undo/Redo.
- **Fix** (`ecd031c`): renamed "Replace with demo data…", opens a
  confirmation dialog stating what's lost and pointing to Export JSON.
- **Verified**: browser probe — dialog appears, Cancel closes without
  resetting. Screenshot: `shots/04-reset-confirm-after.png`

### Noted, not fixed this pass (candidates for later passes)
- **Channel lens first frame clips the leftmost/rightmost lanes** (fit is
  clamped at the lens's readability floor, then centered). The context bar's
  Groups chips + Fit view are the existing escape; consider left-aligned
  first frame or an explicit "more lanes →" cue. (cosmetic/orientation)
- **"INTERNATIONAL R…" lane title truncates** at low zoom — long channel
  names vs. counter-scaled type. (cosmetic)
- **Brand lens first frame shows only coverage groups, zero people** at 51%
  zoom — check an SLT viewer understands what the cards are. (Tier 2 review)
- Disabled More-menu items (AI Import, Import JSON, Auto Layout in explore
  mode) give no hint *why* they're disabled. (Tier 4)

## Iteration 2 — Tier 2: walkthrough surfaces (2026-07-01)

### 5. Official views opened blank or framed the wrong spot — FIXED (core)
- **Evidence**: probe of all 8 official views at projector size (1920×1080):
  **Enterprise opened with 0 people visible** (blank canvas at 50% zoom,
  toast saying "Showing Enterprise"), and framing was flaky across runs
  (blank one run, whole-lens 18% the next). International Residential
  showed 1 card; Shared services opened at 120% with cards clipped.
- **Root causes** (three, compounding — `db09328`):
  1. `fitView({nodes})` only fits *measured* nodes; with
     `onlyRenderVisibleElements` the off-screen team was unmeasured, so
     "fit" framed the 2 already-visible ancestors. Now: bounds computed
     from React Flow's live store (positions exist for unrendered nodes).
  2. Default-collapsed branches hid the view's own members — dimension
     views now `expandAll()` first (the focus filter still narrows render).
  3. The channel readability floor (minZoom 0.5) cropped scatter-wide
     views to empty center-canvas. If the clamped frame would show <half
     the view's people, framing uses the honest fit-all zoom instead.
  Plus: saved view frames (absolute viewports) are verified after apply
  and re-fit if they no longer show their people.
- **Verified**: two full circuits of all 8 views — Enterprise 0 → 12
  visible, all views stable across rounds, 95/95 tests pass.
- Before/after: `shots/05-enterprise-blank-before.png` / `-after.png`

### 6. Pod chip clipped mid-word ("COVERAGE GROU") — FIXED
- Regression from iteration 1's fixed-height chips; chips now truncate
  with ellipsis instead of hard-clipping (same commit as #5 batch).

### Noted, not fixed this pass
- **Enterprise & International Residential views are structurally weak**:
  their people are scattered across the whole channel canvas at their
  home-lane positions, so an honest fit shows tiny cards (9%). Real fix =
  re-layout dimension views compactly (like team views). → BIGGER-IDEAS.
- **Shared services opens at 120% zoom** — over-zoomed; needs its own
  framing pass.
- **Luxury Residential zoom flaps between runs (30% vs 50%)** — two
  framing paths still race; the late orientation-loop verification wins
  inconsistently. Candidate: single authoritative re-fit after settle.

## Iteration 3 — Tier 3: section-owner editing (2026-07-01)

### 7. Editing was unreachable by normal clicking — FIXED
- **Evidence**: in Edit mode, single-clicking a person auto-drilled into
  their org view ("Opened Jeana Ceglia's org view"); the only edit path
  was right-click → "Edit person…". A twice-a-year section owner would
  never find it.
- **Fix** (`55d1042`): auto-drill on click is now explore-only. In edit
  mode click selects, and the context bar shows a prominent
  **"Edit \<name\>…"** button (the old "Details" label also reads
  "Edit \<name\>…" when editing). Verified: click → select → Edit →
  editor opens with the person's fields; explore-mode drill unchanged.
  Screenshot: `shots/07-edit-path-after.png`

### 8. Relationship language now teaches two concepts — PARTIAL
- Legend collapsed from five near-identical entries to the agreed model:
  **Reports to** (the only line that shapes the chart) and **Supports**
  (solid-diamond, plus a dashed "advisory" flavor). Card menu "Add
  dotted-line" → "Add support line".
- **Remaining (next iteration)**: the schema still has 6 edge types
  (dedicated / support / shared-service / dotted / sponsor / manager).
  Collapsing them into reporting+supports with a data migration touches
  store/validation/edges and deserves its own pass. The editor panel's
  relationships tab and edge context menu still expose the old taxonomy.

## Queue for the next loop run
1. Schema collapse: 6 edge types → reporting + supports (with label),
   migrating existing edges; simplify editor-panel relationships tab and
   edge context menu to match.
2. Shared services official view opens at 120% zoom (over-zoomed).
3. Luxury Residential zoom flaps between runs (framing race).
4. Tier 4 sweep: search, help, first-load empty states, jargon pass
   (e.g. aria-label "Choose published operating view" → "official views"),
   disabled More-menu items lack explanation, hide unfinished features
   (spreadsheet CSV, scenario comparison, inline card editor) in explore.
5. Full Tier 1–3 re-sweep for the exit criteria.
