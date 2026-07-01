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
