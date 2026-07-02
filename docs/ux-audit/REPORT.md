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

## Iteration 4 — queue work + re-sweep (2026-07-01)

### 9. Edge taxonomy collapsed to reporting + supports — DONE (`e81ce71`)
- Six relationship types → two working concepts. Legacy values
  (dedicated / shared-service / dotted / sponsor) normalize to "support"
  at every boundary: document parse (imports + persisted state), store
  writes, and demo cloning. All support flavors render as one dashed
  teal line; edge menu offers two conversions; legend/help teach two
  concepts; "Add support line" creates a "New supporter" (was "New
  dotted-line"). Covered by 4 new unit tests (99 total pass).
- Note: support lines stay hidden inside team views by existing design
  (reporting-only); they render in lane/matrix lenses.

### 10. Official-view framing races — FIXED (`7e7baec`)
- Lens-entry framing raced the view's own framing (Luxury Residential
  landed at 30% or 50% by luck). View opens now claim the camera and the
  lens-entry fit stands down. Shared services stopped using a bare
  fitView (opened at 120% with clipped cards) → 100%, stable, verified
  two rounds.

### 11. Search results were invisible — FIXED (`0626214`)
- Typing in "Find person, team, view…" showed nothing: the header's
  overflow-hidden clipped the dropdown, and the header's stacking
  context painted it under the canvas. Results now render fully.
  Before/after: `shots/09-search-invisible-before.png` / `-after.png`
- Same commit: help dialog uses real tab names + documents Esc;
  official-views trigger aria-label plain-speech; disabled More-menu
  items explain "Switch to Edit mode (top right) to use this".

### 12. Re-sweep corrections (`b4980e7`)
- Empty-frame guard threshold 50% → 20% (department lens had regressed
  to 5% fit-all specks; Enterprise's blank-frame case still triggers).
- Card LOD "medium" floor 0.45 → 0.40 so the senior view's natural fit
  (~0.40–0.42) never flickers the Owns/drill chips away.

### Full re-sweep result (run-015/016/017)
- Overlaps: 0 across all lenses. Camera rescue pill fires in both lost
  states. Drill round trip reversible via Esc. All 8 official views
  stable across rounds (Enterprise honest-fit at ~12% pending the
  compact-relayout bigger idea). Search, help, edit-path verified.
- **No new confusing-class findings in Tiers 1–3 → exit criteria met
  for this run.**

## Iteration 5 — the default view reads like an org chart (2026-07-02)

**Complaint driving it:** first frame opened at 42% zoom — nine unreadable card
miniatures floating in dead canvas, with hand-tuned pixel offsets scattering
Gigi/Jorge at odd positions.

**Root causes found and fixed:**
1. `calculateTeamTreeLayout` used a worst-case uniform row pitch (380px) and
   80px sibling gaps → the 9-card tree sprawled to 2,367×1,134px. Now
   height-aware: each child row starts just below its parent's *real* bottom
   (card + portfolio shelf), gaps tightened (44/96).
2. `compressSeniorLeadershipTeamLayout` hand-warped the senior frame with
   hardcoded x/y offsets. Deleted; the honest layout replaces it.
3. Three framing paths raced on load (team framer, overview fits, collapse
   seed) with different padding/minZoom — last writer won nondeterministically
   (42% or 57%). All aligned: honest card heights in bounds, 10% padding,
   vertical centering under the official-view pill.
4. Card typography bumped (15px bold names) and full-detail LOD threshold
   lowered 0.6 → 0.55 so the landing zoom shows full cards.
5. Drill-in area-card stacks overlapped (104px pitch for 174px cards) — fixed
   to full card height per row.

**Verified:** default frame now lands at 62% (1600×1000) / 53% (1440×820),
centered, 0 card overlaps, full-detail cards, stable across repeated loads.
Screenshots: `.ux-audit/default-frame/before-1600.png` → `final-1600.png`.

**Spotted for next changes:** wide-team drill-ins (e.g. Jason Sloan's 36
people) fit at 22% clamped-and-cropped — needs row wrapping for wide sibling
sets; drill-in owner frames overlap neighboring groups' cards.

## Iteration 6 — F1 + F2: big orgs readable at every step (2026-07-02)

**F2 (wide-team drill-ins, was 22% cropped):**
- `calculateTeamTreeLayout` wraps all-leaf child sets (>4) into a grid around
  a central card-free aisle; per-row edge buses run in the gaps between rows
  (layout emits `busYByTargetId`, threaded into edge routing).
- Rows pack by their own height, children sorted short-to-tall so sidecar
  cards share the bottom row.
- Full subtree draws only when it stays readable (≤16 descendants). Bigger
  orgs show root + direct reports with a "+N people ▸" chip that drills one
  level deeper — every step of a walkthrough stays legible.
- Verified: Rob Roland 22% → 95%, Jason Sloan 22% → 62%, Rob → Mike → Josh
  chain lands at 95% each step.

**F9 (fixed early, it was inflating F2's frames):** sidecar space is reserved
only for areas that actually render as cards — areas with 2+ people in the
tree render as background frames instead.

**F1 (Enterprise official view opened nearly blank):** the fit framed
`memberIds` including the ancestor context chain, which sits lanes away in
the channel layout — the zoom clamp then cropped to empty middle. Channel
official views now frame the members themselves; ancestors stay visible as
context. Verified: Enterprise opens on Debbie Michelle's team at 66%, all 10
in-lane cards on screen (was 4 stray cards at the right edge).

**Noted:** cards in channel views show duplicated "ENTERPRISE ENTERPRISE"
chips → polish batch.

## Iteration 6b — F5 + F6: navigation tells one truth (2026-07-02)

- The "Senior team" header pill is now a state indicator: dark only when the
  home view is actually on screen (aria-current), neutral otherwise.
- `activeOperatingViewId` syncs on every navigation path: published views and
  area chips mark their view id; drill-ins, lens-group focus, and lens tabs
  clear it (drilling to the executive root re-marks the home view). The
  official-views dropdown never claims a view you're not in.
- The in-canvas "Senior team" orientation chip dropped its dark tone — it's a
  go-there action, not an active-state chip.
- Official views (All Residential, etc.) exit via "Back to Senior team", the
  same escape as org views — replacing the cryptic "Reset" that dumped users
  into the full-lens layout.

Verified in-browser: home → drill → home → area chip → back; pill state,
dropdown label, and back affordance correct at every step.

## Iteration 6c — F3: Channel and Department open readable (2026-07-02)

Fit-all framed 253 people at 18% (channel) / 28% (department, anchored to the
full-width floating owner row). Both lenses now open on the top-left corner of
the map — the first lane's opening ranks — at readable zoom; lanes visibly
continue off-frame, and Groups chips + minimap cover the rest.

Verified: channel first frame 18% → 44% (Residential channel with Jason
Sloan + Tyler Kungl org readable), department 28% → 77% (Pat McGaughan over
the Finance lane, fully readable).
