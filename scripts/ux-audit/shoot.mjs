#!/usr/bin/env node
/**
 * UX-audit evidence capturer.
 *
 * Drives the running app through the scenarios in scenarios.mjs and writes,
 * per shot: a screenshot (PNG) and a facts.json with hard DOM measurements —
 * visible cards, card-overlap pairs (the "false reporting structure" signal),
 * orientation cues, zoom level, and visible chrome. The UX loop reads these
 * instead of guessing from pixels alone.
 *
 * Usage:
 *   node scripts/ux-audit/shoot.mjs [--base-url http://localhost:3000]
 *     [--out .ux-audit/run-<n>] [--only id1,id2] [--list]
 */

import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { SCENARIOS, VIEWPORTS, DEFAULT_VIEWPORT } from "./scenarios.mjs";

const args = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE_URL = opt("--base-url", "http://localhost:3000");
const ONLY = opt("--only", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LIST = args.includes("--list");

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultOut = () => {
  const base = join(repoRoot, ".ux-audit");
  mkdirSync(base, { recursive: true });
  const n = readdirSync(base).filter((d) => d.startsWith("run-")).length + 1;
  return join(base, `run-${String(n).padStart(3, "0")}`);
};
const OUT = opt("--out", defaultOut());

function findChromium() {
  for (const env of [process.env.CHROME_PATH]) {
    if (env && existsSync(env)) return env;
  }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      if (!dir.startsWith("chromium-")) continue;
      for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
        const p = join(root, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("No Chromium found. Set CHROME_PATH or PLAYWRIGHT_BROWSERS_PATH.");
}

/** Runs inside the page: measure what the viewer can actually see. */
const collectFacts = ({ required }) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible = (r) =>
    r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;

  // Containers (lanes, frames, bands, grids) legitimately sit under content;
  // everything else is "content" and content-on-content overlap is a defect.
  const CONTAINER = /lane|frame|band|grid|rail|foundation|unit|group-?frame/i;
  const nodesByType = {};
  const all = Array.from(document.querySelectorAll(".react-flow__node")).map((el) => {
    const type = (String(el.className).match(/react-flow__node-(\S+)/) || [])[1] || "unknown";
    const r = el.getBoundingClientRect();
    return {
      type,
      name: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    };
  });
  for (const n of all) {
    if (visible(n)) nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
  }
  const cards = all.filter(
    (c) => !CONTAINER.test(c.type) && visible(c) && c.width >= 8 && c.height >= 8
  );

  // Card-on-card overlap: the "false reporting structure" signal.
  const overlaps = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 0 || h <= 0) continue;
      const inter = w * h;
      const frac = inter / Math.min(a.width * a.height, b.width * b.height);
      if (frac > 0.06) {
        overlaps.push({
          a: a.name.slice(0, 40),
          b: b.name.slice(0, 40),
          overlapFraction: Number(frac.toFixed(2)),
        });
      }
    }
  }

  const textOf = (sel) =>
    Array.from(document.querySelectorAll(sel))
      .map((el) => (el.textContent || "").trim().replace(/\s+/g, " "))
      .filter(Boolean);

  const bodyText = document.body.innerText || "";
  const zoom =
    Array.from(document.querySelectorAll("button, span, div"))
      .map((el) =>
        Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent || "")
          .join("")
          .trim()
      )
      .find((t) => /^\d{1,4}%$/.test(t)) || null;

  // Header/chrome inventory: what a newcomer sees as available actions.
  const chrome = Array.from(document.querySelectorAll("header button, header a, header input"))
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      label:
        el.getAttribute("aria-label") ||
        (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50) ||
        el.getAttribute("placeholder") ||
        "",
    }))
    .filter((b) => b.label);

  return {
    viewport: { width: vw, height: vh },
    nodesByType,
    personCardsVisible: cards.length,
    overlapPairs: overlaps.slice(0, 40),
    overlapCount: overlaps.length,
    edgesVisible: document.querySelectorAll(".react-flow__edge").length,
    zoom,
    orientationText: textOf(
      '[data-orientation-map], [class*="orientation"], [class*="breadcrumb"], [class*="context-bar"]'
    ).slice(0, 6),
    dialogsOpen: textOf('[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] [class*="title"]').slice(0, 4),
    chrome,
    requiredLabels: Object.fromEntries((required || []).map((l) => [l, bodyText.includes(l)])),
    canvasEmpty: cards.length === 0 && document.querySelector(".react-flow") !== null,
  };
};

async function resolveLocator(page, spec) {
  if (spec.selector) return page.locator(spec.selector).first();
  if (spec.role) return page.getByRole(spec.role, { name: spec.name, exact: spec.exact }).first();
  if (spec.text) return page.getByText(spec.text, { exact: false }).first();
  throw new Error(`Unusable locator spec: ${JSON.stringify(spec)}`);
}

async function runScenario(browser, scenario) {
  const viewport = VIEWPORTS[scenario.viewport] || DEFAULT_VIEWPORT;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const dir = join(OUT, scenario.id);
  mkdirSync(dir, { recursive: true });

  const result = { id: scenario.id, tier: scenario.tier, goal: scenario.goal, viewport, shots: [], stepErrors: [] };
  let required = [];

  for (const step of scenario.steps) {
    try {
      if (step.goto) {
        await page.goto(new URL(step.goto, BASE_URL).href, { waitUntil: "networkidle", timeout: 30000 });
      } else if (step.clearStorage) {
        await page.evaluate(() => localStorage.clear()).catch(() => {});
        await page.reload({ waitUntil: "networkidle" });
      } else if (step.click) {
        const loc = await resolveLocator(page, step.click);
        await loc.click({ timeout: 4000, button: step.click.button || "left" });
      } else if (step.hover) {
        const loc = await resolveLocator(page, step.hover);
        await loc.hover({ timeout: 4000 });
      } else if (step.press) {
        await page.keyboard.press(step.press);
      } else if (step.type) {
        await page.keyboard.type(step.type, { delay: 40 });
      } else if (step.wheelZoom) {
        const { deltaY, x, y, times = 1 } = step.wheelZoom;
        const box = await page.locator(".react-flow__pane").first().boundingBox();
        const cx = x ?? (box ? box.x + box.width / 2 : 700);
        const cy = y ?? (box ? box.y + box.height / 2 : 500);
        await page.mouse.move(cx, cy);
        for (let i = 0; i < times; i++) {
          await page.mouse.wheel(0, deltaY);
          await page.waitForTimeout(120);
        }
      } else if (step.drag) {
        const { fromX, fromY, toX, toY } = step.drag;
        await page.mouse.move(fromX, fromY);
        await page.mouse.down();
        await page.mouse.move(toX, toY, { steps: 12 });
        await page.mouse.up();
      } else if (step.wait) {
        await page.waitForTimeout(step.wait);
      } else if (step.required) {
        required = step.required;
      } else if (step.shot) {
        const png = join(dir, `${step.shot}.png`);
        await page.screenshot({ path: png, fullPage: false });
        const facts = await page.evaluate(collectFacts, { required });
        result.shots.push({ name: step.shot, screenshot: png, facts });
      }
    } catch (err) {
      result.stepErrors.push({ step, error: String(err).split("\n")[0] });
    }
  }

  writeFileSync(join(dir, "facts.json"), JSON.stringify(result, null, 2));
  await context.close();
  return result;
}

async function main() {
  if (LIST) {
    for (const s of SCENARIOS) console.log(`t${s.tier}  ${s.id}  —  ${s.goal}`);
    return;
  }
  const picked = ONLY.length ? SCENARIOS.filter((s) => ONLY.includes(s.id)) : SCENARIOS;
  if (!picked.length) throw new Error(`No scenarios matched --only ${ONLY.join(",")}`);
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const summary = [];
  for (const scenario of picked) {
    const r = await runScenario(browser, scenario);
    summary.push({
      id: r.id,
      shots: r.shots.map((s) => ({
        name: s.name,
        cards: s.facts.personCardsVisible,
        overlaps: s.facts.overlapCount,
        zoom: s.facts.zoom,
        canvasEmpty: s.facts.canvasEmpty,
      })),
      stepErrors: r.stepErrors.length,
    });
    console.error(`✓ ${r.id} (${r.shots.length} shots, ${r.stepErrors.length} step errors)`);
  }
  await browser.close();

  writeFileSync(join(OUT, "summary.json"), JSON.stringify({ baseUrl: BASE_URL, out: OUT, summary }, null, 2));
  console.log(JSON.stringify({ out: OUT, scenarios: summary.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
