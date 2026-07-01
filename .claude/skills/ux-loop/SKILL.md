---
name: ux-loop
description: Run the UX-improvement loop on the Org Chart Builder — open each area in a real browser, critique it against the agreed rubric, fix, verify, commit. Use when Ari says "run the loop", "keep improving the app", or "do another pass".
---

# The UX loop

Iteratively make the app intuitive for its agreed audience. One iteration =
evidence → critique → fix → verify → commit → report. Repeat, tier by tier,
until a full sweep of Tiers 1–3 finds nothing new worth fixing.

## Who this is for (agreed with Ari, 2026-07-01)

- **Workflow**: Ari builds the org design → walks each SLT member through it
  (projected, Ari driving) → each SLT owner edits **their own section**
  (layout + org data within it) and locks it → Ari approves → published.
- **Judge every screen as**: an SLT member or admin seeing it cold. For edit
  surfaces: a section owner who edits **twice a year** — zero muscle memory.
- Presentation-critical surfaces get polished first; self-serve concerns
  (tooltips, empty states, escape hatches) still count but come after.

## Vocabulary law

Real Sonance words (never rename, always prefer): **Sonance / James / iPort**;
sales channels **Luxury Residential, National Accounts, International
Residential, International Professional, NA Professional, iPort Enterprise**;
**departments** (traditional sense); **locations** (Minden, Fontana,
San Clemente, Copenhagen, China); **SLT**; **shared services**.

App-invented words (rename into plain speech whenever they'd confuse):
formation, pods, coverage/portfolio areas, Business Grid, mirror lanes,
lens marketing names ("Executive Map"), dedicated-vs-supports.

## Relationship law

Exactly **two** line types: **reporting** (solid; the only line that moves
cards) and **supports** (dashed; optional free-text label). The
dedicated/supports/shared-service/dotted/sponsor taxonomy collapses into
"supports". Shared services survives as a *grouping* concept, not a line
type. Simplify every surface that exposes the old taxonomy (editor panel
relationships tab, drag handles, context menu, legend).

## Priorities

- **Tier 1 — trust & orientation**: (1) chart truthfulness — no overlapping
  cards/edges implying false reporting (Ari's top embarrassment risk);
  (2) camera confidence — never lost, recovery always one obvious action;
  (3) drill-in/out — ONE consistent, reversible pattern everywhere, way back
  always visible; (4) More-menu junk drawer — organize by intent, guard
  "Reset Demo" behind confirmation.
- **Tier 2 — walkthrough surfaces**: official views, senior team portfolio,
  focus/framing transitions, projector legibility.
- **Tier 3 — section-owner editing**: two-line-type relationship UI,
  quick-add/edit-panel self-evidence, "you're editing your section" clarity.
- **Tier 4 — cold-open self-service**: first load, empty states, tooltips,
  jargon sweep, hide unfinished features from explore mode.

## Scope rules

- Structural layout/edge-routing changes are **in scope** (Ari flagged
  overlap/false-structure explicitly).
- **Hide, don't finish**: unfinished machinery (publish workflow UI,
  Supabase wiring, spreadsheet CSV, scenario comparison, inline card editor)
  gets hidden from explore mode, not completed. Building auth/AD/publish
  plumbing is feature work — out of scope.
- **Business Grid is parked**: skip it; don't polish, don't remove.
- Data is temporary until Active Directory integration — guard destructive
  actions, but don't build backup ceremony.
- Anything bigger than a surgical fix goes to `docs/ux-audit/BIGGER-IDEAS.md`
  instead of being smuggled into the loop.

## One iteration

1. **Evidence**: dev server on :3000, then
   `node scripts/ux-audit/shoot.mjs [--only <ids>]` (scenarios in
   `scripts/ux-audit/scenarios.mjs` — edit/extend them freely as the DOM
   evolves; add narrow-width states where relevant). Output lands in
   `.ux-audit/run-NNN/` (gitignored): per-shot PNG + facts.json with
   card-overlap pairs, node counts by type, zoom, orientation cues, chrome
   inventory.
2. **Critique**: read screenshots AND facts. For each state ask: would the
   agreed audience know where they are, what they're looking at, and what to
   do next? Does anything visually lie (overlaps, ambiguous lines)? Any
   invented jargon? Classify: **confusing** (fix now) / **cosmetic** (note,
   skip) / **bigger idea** (log).
3. **Fix**: top 1–3 issues per area per pass. Surgical diffs.
4. **Verify**: rerun the same scenarios; confirm facts improved (e.g.
   overlapPairs shrank) and screenshots read better; check other lenses
   didn't regress. Run `npx vitest run` before committing.
5. **Commit** per fix (small, descriptive, no model names in messages), push
   to the working branch.
6. **Report**: append to `docs/ux-audit/REPORT.md` — issue, evidence
   (facts numbers), fix, before/after screenshots (copy curated PNGs to
   `docs/ux-audit/shots/`). New big ideas go to BIGGER-IDEAS.md.

## Exit criteria

A full re-sweep of Tiers 1–3 produces zero new "confusing"-class findings.
Then summarize the run for Ari: what changed, what's logged as bigger ideas,
what to review before merging to main.

## Known starting findings (from harness shakedown, 2026-07-01)

- Channel lens first frame: **23 overlapping card pairs** (fumble #5, live).
- Camera-lost recovery pill ("No people in view / Show overview") exists —
  verify it appears in ALL lost states, not just some.
- Brand lens first frame renders only group/coverage cards at 51% zoom —
  check an SLT viewer understands what they're looking at with no people
  visible.
