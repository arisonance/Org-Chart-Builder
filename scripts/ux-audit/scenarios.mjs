/**
 * UX-audit scenario manifest.
 *
 * Each scenario drives the app into one area/state an SLT viewer or section
 * owner would actually reach, then captures evidence (screenshot + DOM facts)
 * at every `shot` step. The loop edits this file freely as it learns the DOM —
 * scenarios are data, not framework.
 *
 * Step vocabulary (executed by shoot.mjs, soft-fail by default):
 *   { goto: "/" }                        navigate (relative to base URL)
 *   { clearStorage: true }               wipe localStorage then reload
 *   { click: { role, name, exact? } }    click by ARIA role+name
 *   { click: { selector } }              click by CSS selector
 *   { click: { text } }                  click first element containing text
 *   { hover: { ...same as click } }
 *   { press: "Escape" }                  keyboard
 *   { wheelZoom: { deltaY, x?, y?, times? } }  mouse-wheel zoom on canvas
 *   { drag: { fromX, fromY, toX, toY } } pan the canvas pane
 *   { wait: 800 }                        settle time in ms
 *   { shot: "state-name" }               capture screenshot + facts
 *   { required: ["Label", ...] }         labels the NEXT shots check for
 */

export const DEFAULT_VIEWPORT = { width: 1600, height: 1000 };

/** Viewports the loop cares about. Projector ≈ what an SLT room sees. */
export const VIEWPORTS = {
  desktop: { width: 1600, height: 1000 },
  laptop: { width: 1366, height: 768 },
  projector: { width: 1920, height: 1080 },
  narrow: { width: 1024, height: 768 },
};

const settle = (ms = 1200) => ({ wait: ms });

export const SCENARIOS = [
  // ─── Tier 1: trust & orientation ────────────────────────────────────────
  {
    id: "t1-first-load",
    tier: 1,
    goal: "Cold first load: what a brand-new SLT viewer sees before touching anything.",
    steps: [
      { goto: "/" },
      { clearStorage: true },
      settle(2200),
      { required: ["Senior Leadership Team", "Ari Supran"] },
      { shot: "fresh" },
    ],
  },
  {
    id: "t1-lens-sweep",
    tier: 1,
    goal: "Every lens' first frame: overlap, clipping, and false-structure check.",
    steps: [
      { goto: "/" },
      settle(2200),
      { shot: "senior" },
      { click: { selector: 'button[aria-label^="Brand view"]' } },
      settle(1800),
      { shot: "brand" },
      { click: { selector: 'button[aria-label^="Channel view"]' } },
      settle(1800),
      { shot: "channel" },
      { click: { selector: 'button[aria-label^="Department view"]' } },
      settle(1800),
      { shot: "department" },
    ],
  },
  {
    id: "t1-camera-lost",
    tier: 1,
    goal: "Get deliberately lost (zoom out, zoom in, pan into nowhere): is recovery obvious?",
    steps: [
      { goto: "/" },
      settle(2000),
      { wheelZoom: { deltaY: 600, times: 6 } },
      settle(600),
      { required: ["Zoomed far out", "Show overview"] },
      { shot: "zoomed-way-out" },
      { wheelZoom: { deltaY: -600, times: 10 } },
      settle(600),
      { shot: "zoomed-way-in" },
      { drag: { fromX: 800, fromY: 500, toX: 100, toY: 900 } },
      { drag: { fromX: 800, fromY: 500, toX: 100, toY: 900 } },
      { drag: { fromX: 800, fromY: 500, toX: 100, toY: 900 } },
      settle(600),
      { required: ["No people in view", "Show overview"] },
      { shot: "panned-into-nowhere" },
    ],
  },
  {
    id: "t1-drill-in-out",
    tier: 1,
    goal: "Drill into a team/area from the senior view, then find the way back.",
    steps: [
      { goto: "/" },
      settle(2200),
      { shot: "before-drill" },
      // Click the first drillable area/portfolio card if present
      { click: { selector: '[data-area-card], .react-flow__node-areaCardNode' } },
      settle(1800),
      { shot: "after-drill" },
      { press: "Escape" },
      settle(1200),
      { shot: "after-escape" },
    ],
  },
  {
    id: "t1-more-menu",
    tier: 1,
    goal: "The More menu junk drawer, as a newcomer sees it.",
    steps: [
      { goto: "/" },
      settle(2000),
      { click: { role: "button", name: /more/i } },
      settle(500),
      { shot: "more-open" },
    ],
  },

  // ─── Tier 2: walkthrough surfaces ───────────────────────────────────────
  {
    id: "t2-official-views",
    tier: 2,
    goal: "Each official view's first frame — the projector moment.",
    viewport: "projector",
    steps: [
      { goto: "/" },
      settle(2200),
      { click: { selector: '[data-published-view-switcher], button[aria-label*="official" i], button[aria-label*="view" i]' } },
      settle(600),
      { shot: "switcher-open" },
      // The loop expands this scenario per-view once it confirms menu item names.
    ],
  },
  {
    id: "t2-projector-legibility",
    tier: 2,
    goal: "Senior view at projector distance: can the back of the room read it?",
    viewport: "projector",
    steps: [
      { goto: "/" },
      settle(2200),
      { shot: "senior-projector" },
      { wheelZoom: { deltaY: 300, times: 2 } },
      settle(600),
      { shot: "senior-projector-zoomout" },
    ],
  },

  // ─── Tier 3: section-owner editing ──────────────────────────────────────
  {
    id: "t3-edit-mode",
    tier: 3,
    goal: "Switch to edit mode as a twice-a-year editor: what changes, what's obvious?",
    steps: [
      { goto: "/" },
      settle(2200),
      { click: { text: "Edit" } },
      settle(800),
      { shot: "edit-mode-on" },
      { click: { selector: ".react-flow__node-hierarchyNode" } },
      settle(900),
      { shot: "person-selected" },
    ],
  },
  {
    id: "t3-relationship-ui",
    tier: 3,
    goal: "The relationship-creation surface (soon: reporting vs supports only).",
    steps: [
      { goto: "/" },
      settle(2200),
      { click: { text: "Edit" } },
      settle(800),
      { hover: { selector: ".react-flow__node-hierarchyNode" } },
      settle(600),
      { shot: "card-hover-affordances" },
      { click: { selector: ".react-flow__node-hierarchyNode", button: "right" } },
      settle(500),
      { shot: "context-menu" },
    ],
  },
  {
    id: "t3-edit-narrow",
    tier: 3,
    goal: "Edit panel at narrow width — regression watch for the old cutoff bug.",
    viewport: "narrow",
    steps: [
      { goto: "/" },
      settle(2200),
      { click: { text: "Edit" } },
      settle(800),
      { click: { selector: ".react-flow__node-hierarchyNode" } },
      settle(900),
      { shot: "editor-narrow" },
    ],
  },

  // ─── Tier 4: cold-open self-service ─────────────────────────────────────
  {
    id: "t4-search",
    tier: 4,
    goal: "Find a person cold: search entry, results, landing.",
    steps: [
      { goto: "/" },
      settle(2200),
      { click: { selector: 'input[type="search"], [data-person-search] input, input[placeholder*="earch"]' } },
      { type: "Rob" },
      settle(700),
      { shot: "search-results" },
      { press: "Enter" },
      settle(1400),
      { shot: "search-landed" },
    ],
  },
  {
    id: "t4-help",
    tier: 4,
    goal: "Help/shortcuts: does it teach the app's actual mental model?",
    steps: [
      { goto: "/" },
      settle(2000),
      { press: "?" },
      settle(600),
      { shot: "help-open" },
    ],
  },
];
