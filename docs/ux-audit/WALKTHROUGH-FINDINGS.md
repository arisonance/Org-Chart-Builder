# Full walkthrough findings — 2026-07-02

Method: drove every major user path in a real browser (1600×1000), explore and
edit modes, screenshotting each state. Judged as an SLT member seeing it cold.
Screenshots in `.ux-audit/walkthrough/`.

Paths covered: default load · Brand / Channel / Department / Grid tabs · all 8
official views · search · drill-in (double-click, area chips) · drill-out
(Escape, Back to broader view) · Collapse/Expand all · Legend · More menu ·
Explore/Edit/Publish switch · edit-mode select, right-click menu, double-click.

## What already works well
- Default Senior team view (fixed yesterday): readable tree at 62%.
- Search: fast, categorized, readable results.
- Luxury Residential / National Accounts / All Residential official views:
  clean readable trees at 42–50%.
- Edit-mode right-click menu and the selected-person preview bar are clear.
- Drill-in on small teams (e.g. Derick Dahl) is genuinely good: 95%, clean.

## Findings, ranked by how badly they'd land in an SLT walkthrough

### F1 — Enterprise official view opens on a nearly blank canvas (SEV: broken)
"Enterprise · 15 people" shows 3 stray cards at the right edge, a giant empty
lane rectangle, and dead space everywhere. A cold viewer assumes the app is
broken. (50-enterprise.png)
**Fix:** frame the actual member cluster (the fit already has an
expectedIds path — the members are scattered across distant lanes, so this
view needs either its own compact layout like All Residential's formation, or
a fit to the real bounding box of its 15 people.)

### F2 — Wide-team drill-ins land at 22%, cropped both sides (SEV: high)
Rob Roland (46 people) and Jason Sloan (36) open cropped at minZoom with cards
cut off at both edges and huge dead bands top/bottom. (10-drill-rob.png)
**Fix:** wrap wide sibling rows (>6 leaves) into a grid under their parent so
big teams become taller-not-wider; then the same fit that fixed the default
view lands these at 45–60% readable.

### F3 — Channel and Department lenses are unreadable walls (SEV: high)
Channel opens at 18%, Department at 28% with half the screen empty, lane
titles truncated ("INTERNATIONAL R…"), a lane title garbled by cards drawn on
top ("TECHNOLOGY"), Ari floating disconnected top-right with a long edge into
a lane, and the leftmost lane cropped mid-card. (03/04.png)
**Fix:** these lenses answer "who's in each lane" — open focused on the first
lane at readable zoom with lane-by-lane navigation (click lane header to
advance), instead of fitting all 26 lanes at once. Kill the floating-ancestor
cards or anchor them visually to their lane.

### F4 — The Grid tab (parked) is still the worst screen and still a top tab
Grid opens with SLT cards clipped under the context bar, empty pastel bands,
and stray cards floating bottom-left. We agreed it's parked — but it's still
one of five tabs an SLT member will click. (05/12.png)
**Fix:** hide the Grid tab in explore mode (keep it in edit/More for later),
or label it "(draft)".

### F5 — Three different controls say "Senior team" / active-state confusion
Top-left black pill "Senior team", the underlined active tab (e.g. Grid), and
an in-canvas "Senior team" button in Brand/Channel views — all visible at
once, two looking "active". After drilling from Grid, the Grid tab stays
underlined while viewing an org view. (05.png, 10.png)
**Fix:** one home control ("⌂ Senior team"), tabs show active state only for
the current canvas; in-canvas duplicate renamed ("Reset framing" or removed).

### F6 — Area-chip navigation lands you somewhere the header contradicts
Clicking "Residential Sales" chip from the home view opens the All
Residential formation — but the view dropdown still reads "Senior
Leadership…", and the exit is an unlabeled "Reset" chip instead of the
standard "Back to broader view". Two truths on screen at once. (33.png)
**Fix:** area-chip navigation should set the view dropdown to the view it
opened and use the same green "Back to broader view" bar as org views.

### F7 — Truncation still everywhere in Brand view + group cards
"Sonance / All Bran…", "Shared Services Fo…" ×4, chips reduced to "N…",
"HO…", "CO…" — and five cards all titled "Dealer Services" with the real
distinguishing name in small text. (02.png, 50-shared-services.png)
**Fix:** put the distinguishing name first ("Design Services — Dealer
Services"), let titles wrap to two lines, drop chips that can't render at
their size.

### F8 — Shared services view shows a false alarm
"⚠ No people in view — Show overview" pill renders while 8 group cards are
plainly visible. Undermines trust in every other message. (50-shared-services.png)
**Fix:** the person-visibility check should count group/unit cards as content.

### F9 — Drill-in vertical gap when reserved sidecar space goes unused
My iteration-5 heights reserve area-card space under anchors; when the cards
don't actually render (framed areas), the child row floats ~250px too low
(62-edit-dblclick.png: Derick → reports gap).
**Fix:** only reserve sidecar height for areas that will actually render.

### F10 — Minor
- Official-view header chips are cryptic: "All Residential · 14 people ·
  Residential · Reset · More" — "Residential" chip and "Reset" unexplained.
- "14 people" count disagrees with what's drawn (branches + pods show more).
- Brand view James band still has an empty top half.
- Mike Cleary floats unconnected at left of Luxury Residential.
- Grid/Channel context bar overlaps SLT cards at top of canvas.

## Proposed order (pending approval)
1. F1 + F2 (broken view + wide-team layout) — the two "app looks broken" items.
2. F5 + F6 (navigation truth: one home, consistent back, honest active states).
3. F3 (channel/department readable-by-default), includes F10 header cleanup.
4. F7 + F8 + F9 (truncation, false alarm, drill-in gap) — polish batch.
5. F4 (hide parked Grid from explore) — one-line decision, needs Ari's call.
