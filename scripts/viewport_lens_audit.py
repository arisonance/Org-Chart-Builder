#!/usr/bin/env python3
"""Audit first-entry framing for the main org-chart views.

The script opens fresh browser contexts at several viewport sizes, switches to
each primary view, captures screenshots, and records whether the first frame
shows an intuitive broad overview without obvious clipping or blank states.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


VIEWPORTS = [
    {"id": "desktop", "width": 1600, "height": 1000},
    {"id": "laptop", "width": 1366, "height": 768},
    {"id": "tablet", "width": 1024, "height": 768},
    {"id": "phone", "width": 430, "height": 932},
]

VIEWS = [
    {
        "id": "senior",
        "button": "Senior team",
        "required": ["Senior Leadership Team", "Ari Supran", "Rob Roland"],
        "min_people": 6,
    },
    {
        "id": "brand",
        "button_prefix": "Brand view",
        "required": ["Brand Ownership", "Sonance", "James", "iPort"],
        "min_people": 8,
    },
    {
        "id": "channel",
        "button_prefix": "Channel view",
        "required": ["Channel Support", "Residential", "Both Channels", "Professional"],
        "min_people": 8,
    },
    {
        "id": "department",
        "button_prefix": "Department view",
        "required": ["Department Map", "Administration", "Dealer Services", "Finance"],
        "min_people": 8,
    },
    {
        "id": "grid",
        "button_prefix": "Grid view",
        "required": ["Brand x Channel Grid", "Sonance", "Residential", "Professional"],
        "min_people": 0,
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit first-entry framing across org-chart views and viewport sizes.")
    parser.add_argument("--base-url", default="http://localhost:3002", help="Running app URL.")
    parser.add_argument("--out-dir", default="/private/tmp/org-viewport-audit", help="Where screenshots and JSON are written.")
    parser.add_argument("--headed", action="store_true", help="Run Chromium visibly.")
    return parser.parse_args()


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def click_view(page: Any, view: dict[str, Any]) -> str | None:
    if "button" in view:
        locator = page.get_by_role("button", name=view["button"], exact=True)
    else:
        locator = page.locator(f'button[aria-label^="{view["button_prefix"]}"]')
    count = locator.count()
    if count != 1:
        raise RuntimeError(f"{view['id']} view button matched {count} elements")
    try:
        locator.click(timeout=5000)
        return None
    except PlaywrightTimeoutError as exc:
        locator.click(force=True, timeout=2000)
        return str(exc).splitlines()[0]


def collect_metrics(page: Any, view: dict[str, Any], viewport: dict[str, int]) -> dict[str, Any]:
    return page.evaluate(
        """
        ({ view, viewport }) => {
          const flow = document.querySelector('.react-flow');
          const flowRect = flow ? flow.getBoundingClientRect() : null;
          const bodyText = document.body.innerText || '';
          const visible = (rect) => {
            const left = rect.left ?? rect.x;
            const top = rect.top ?? rect.y;
            return rect.width > 0 &&
              rect.height > 0 &&
              rect.right > 0 &&
              rect.bottom > 0 &&
              left < viewport.width &&
              top < viewport.height;
          };

          const nodeBoxes = Array.from(document.querySelectorAll('.react-flow__node'))
            .map((el) => {
              const rect = el.getBoundingClientRect();
              return {
                text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 140),
                className: String(el.className || ''),
                left: rect.left,
                top: rect.top,
                x: rect.x,
                y: rect.y,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
              };
            })
            .filter((box) => visible(box));

          const personBoxes = nodeBoxes.filter((box) => box.className.includes('react-flow__node-hierarchyNode'));
          const labelBoxes = {};
          const elements = Array.from(document.querySelectorAll('button, span, h1, h2, h3, p, div'));
          for (const label of view.required) {
            const matches = [];
            for (const el of elements) {
              const directText = Array.from(el.childNodes)
                .filter((node) => node.nodeType === 3)
                .map((node) => node.textContent || '')
                .join(' ')
                .trim()
                .replace(/\\s+/g, ' ');
              const text = directText || (el.textContent || '').trim().replace(/\\s+/g, ' ');
              if (!text.includes(label)) continue;
              const rect = el.getBoundingClientRect();
              if (!visible(rect)) continue;
              if (rect.width > viewport.width * 0.82 && rect.height > viewport.height * 0.45) continue;
              matches.push({
                text: text.slice(0, 120),
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
            labelBoxes[label] = matches.slice(0, 8);
          }

          const boxesForBounds = nodeBoxes.filter((box) =>
            box.width >= 12 &&
            box.height >= 12 &&
            (!flowRect || (
              box.right >= flowRect.left &&
              box.x <= flowRect.right &&
              box.bottom >= flowRect.top &&
              box.y <= flowRect.bottom
            ))
          );
          let bounds = null;
          let centerDelta = null;
          let edgeMargins = null;
          if (flowRect && boxesForBounds.length > 0) {
            const minX = Math.min(...boxesForBounds.map((box) => box.x));
            const maxX = Math.max(...boxesForBounds.map((box) => box.right));
            const minY = Math.min(...boxesForBounds.map((box) => box.y));
            const maxY = Math.max(...boxesForBounds.map((box) => box.bottom));
            const contentCenterX = (minX + maxX) / 2;
            const contentCenterY = (minY + maxY) / 2;
            const flowCenterX = flowRect.left + flowRect.width / 2;
            const flowCenterY = flowRect.top + flowRect.height / 2;
            bounds = {
              x: Math.round(minX),
              y: Math.round(minY),
              right: Math.round(maxX),
              bottom: Math.round(maxY),
              width: Math.round(maxX - minX),
              height: Math.round(maxY - minY),
            };
            centerDelta = {
              x: Number(((contentCenterX - flowCenterX) / flowRect.width).toFixed(3)),
              y: Number(((contentCenterY - flowCenterY) / flowRect.height).toFixed(3)),
            };
            edgeMargins = {
              left: Math.round(minX - flowRect.left),
              right: Math.round(flowRect.right - maxX),
              top: Math.round(minY - flowRect.top),
              bottom: Math.round(flowRect.bottom - maxY),
            };
          }

          const zoomText = Array.from(document.querySelectorAll('button, span, div'))
            .map((el) => (el.textContent || '').trim())
            .find((text) => /^\\d+%$/.test(text)) || null;

          return {
            viewId: view.id,
            viewportId: viewport.id,
            viewport: { width: viewport.width, height: viewport.height },
            hasFlow: Boolean(flow),
            flowRect: flowRect ? {
              x: Math.round(flowRect.x),
              y: Math.round(flowRect.y),
              width: Math.round(flowRect.width),
              height: Math.round(flowRect.height),
            } : null,
            zoomText,
            nodeCount: nodeBoxes.length,
            personCount: personBoxes.length,
            labelBoxes,
            bounds,
            centerDelta,
            edgeMargins,
            bodyHasRequired: Object.fromEntries(view.required.map((label) => [label, bodyText.includes(label)])),
          };
        }
        """,
        {"view": view, "viewport": viewport},
    )


def score(metrics: dict[str, Any], view: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    viewport_width = metrics["viewport"]["width"]
    max_center_x = 0.62 if viewport_width < 500 else 0.38
    max_center_y = 0.46 if viewport_width < 500 else 0.42
    if metrics.get("clickIssue"):
        issues.append(f"normal view-tab click failed: {metrics['clickIssue']}")
    if not metrics["hasFlow"]:
        issues.append("missing React Flow canvas")
        return issues
    if metrics["nodeCount"] == 0:
        issues.append("no visible flow nodes")
    if metrics["personCount"] < view["min_people"]:
        issues.append(f"only {metrics['personCount']} visible person cards; expected at least {view['min_people']}")
    missing_labels = [
        label for label, boxes in metrics["labelBoxes"].items()
        if not boxes and not metrics["bodyHasRequired"].get(label)
    ]
    offscreen_labels = [
        label for label, boxes in metrics["labelBoxes"].items()
        if not boxes and metrics["bodyHasRequired"].get(label)
    ]
    if missing_labels:
        issues.append(f"missing labels: {', '.join(missing_labels)}")
    if offscreen_labels:
        issues.append(f"labels present but offscreen: {', '.join(offscreen_labels)}")
    center = metrics["centerDelta"]
    if center and abs(center["x"]) > max_center_x:
        issues.append(f"content center x is off by {center['x']}")
    if view["id"] in {"senior", "grid"} and center and abs(center["y"]) > max_center_y:
        issues.append(f"content center y is off by {center['y']}")
    margins = metrics["edgeMargins"]
    if (
        viewport_width >= 500 and
        margins and
        center and
        abs(center["x"]) > 0.28 and
        min(margins["left"], margins["right"]) < -viewport_width * 0.75
    ):
        issues.append(f"content is badly clipped toward one side: {margins}")
    if margins and margins["top"] < -260:
        issues.append(f"content starts too far above canvas: {margins}")
    flow_rect = metrics["flowRect"]
    if margins and flow_rect and margins["top"] > flow_rect["height"] * 0.55:
        issues.append(f"content starts too low in canvas: {margins}")
    return issues


def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        for viewport in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": viewport["width"], "height": viewport["height"]},
                device_scale_factor=1,
            )
            page = context.new_page()
            page.goto(args.base_url)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(700)
            try:
                page.evaluate("localStorage.clear()")
            except Exception:
                pass
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(900)

            for view in VIEWS:
                click_issue = click_view(page, view)
                page.wait_for_timeout(1800)
                metrics = collect_metrics(page, view, viewport)
                metrics["clickIssue"] = click_issue
                issues = score(metrics, view)
                shot = out_dir / f"{slug(viewport['id'])}-{slug(view['id'])}.png"
                page.screenshot(path=str(shot), full_page=False)
                metrics["screenshot"] = str(shot)
                metrics["status"] = "pass" if not issues else "fail"
                metrics["issues"] = issues
                results.append(metrics)
            context.close()
        browser.close()

    report_path = out_dir / "report.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    failed = [item for item in results if item["issues"]]
    print(json.dumps({
        "report": str(report_path),
        "screenshots": str(out_dir),
        "total": len(results),
        "failed": len(failed),
        "failures": [
            {
                "viewport": item["viewportId"],
                "view": item["viewId"],
                "issues": item["issues"],
                "screenshot": item["screenshot"],
                "zoom": item["zoomText"],
                "personCount": item["personCount"],
                "centerDelta": item["centerDelta"],
                "edgeMargins": item["edgeMargins"],
            }
            for item in failed
        ],
    }, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
