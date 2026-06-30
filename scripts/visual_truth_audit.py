#!/usr/bin/env python3
"""Audit org-chart views for visual clutter and false reporting implications.

This is intentionally stricter than a viewport smoke test. It opens real app
views, captures screenshots, and checks for the failure modes that make an org
chart tell the wrong story: overlapping cards, report lines running through
unrelated cards, controls covering cards, missing labels, and render errors.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "senior-team",
        "kind": "tab",
        "button_text": "Senior team",
        "required": ["Ari Supran", "Pat McGaughan", "Gigi Dryer", "Jorge Notni"],
        "min_people": 7,
        "check_edges": True,
    },
    {
        "id": "brand",
        "kind": "tab",
        "aria_prefix": "Brand view",
        "required": ["Brand Ownership", "Sonance"],
        "min_people": 6,
        "check_edges": False,
        "ignore_overlap_types": ["mirror"],
        "ignore_overlap_id_prefixes": ["mirror-group:"],
        "ignore_control_id_prefixes": ["mirror-group:"],
    },
    {
        "id": "channel",
        "kind": "tab",
        "aria_prefix": "Channel view",
        "required": ["Channel Support", "Residential", "Professional"],
        "min_people": 6,
        "check_edges": False,
        "ignore_overlap_types": ["mirror"],
        "ignore_overlap_id_prefixes": ["mirror-group:"],
        "ignore_control_id_prefixes": ["mirror-group:"],
    },
    {
        "id": "department",
        "kind": "tab",
        "aria_prefix": "Department view",
        "required": ["Department Map", "Administration", "Finance", "Sales Ops"],
        "min_people": 6,
        "check_edges": False,
    },
    {
        "id": "grid",
        "kind": "tab",
        "aria_prefix": "Grid view",
        "required": ["Brand x Channel Grid", "Sonance", "Residential", "Professional"],
        "min_people": 0,
        "check_edges": False,
    },
    {
        "id": "all-residential",
        "kind": "published",
        "label": "All Residential",
        "required": ["All Residential", "Jason Sloan", "Tyler Kungl"],
        "min_people": 4,
        "check_edges": True,
    },
    {
        "id": "shared-services",
        "kind": "published",
        "label": "Shared services",
        "required": ["Shared services", "Finance", "Administration & HR"],
        "min_people": 1,
        "check_edges": False,
    },
    {
        "id": "product-engineering-team",
        "kind": "area",
        "area_node_id": "area-card:area-product-engineering",
        "required": ["Product & Engineering", "Mike Paganini"],
        "min_people": 3,
        "check_edges": True,
    },
    {
        "id": "finance-team",
        "kind": "area",
        "area_node_id": "area-card:area-finance",
        "required": ["Finance", "Mike Neves"],
        "min_people": 3,
        "check_edges": True,
    },
]

STORAGE_KEYS_TO_CLEAR = [
    "org-chart-team-view-layouts-v6",
    "org-chart-team-view-layouts-v5",
    "org-chart-team-view-layouts-v4",
    "org-chart-team-view-layouts-v3",
    "org-chart-team-view-layouts-v2",
    "org-chart-view-frame-defaults-v1",
    "org-chart-matrix-wrap-layout-v4",
    "org-chart-matrix-wrap-layout-v3",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run visual-truth audits across org-chart views.")
    parser.add_argument("--base-url", default="http://localhost:3012", help="Running app URL.")
    parser.add_argument("--out-dir", default="/private/tmp/org-visual-truth-audit", help="Report/screenshot directory.")
    parser.add_argument("--duration-seconds", type=int, default=0, help="Repeat scenarios until this timebox expires.")
    parser.add_argument("--headed", action="store_true", help="Run Chromium visibly.")
    return parser.parse_args()


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def reset_app_storage(page: Any) -> None:
    page.evaluate(
        """(keys) => {
          for (const key of keys) localStorage.removeItem(key);
        }""",
        STORAGE_KEYS_TO_CLEAR,
    )


def click_first(locator: Any, label: str) -> str | None:
    try:
        locator.first.click(timeout=5000)
        return None
    except PlaywrightTimeoutError as exc:
        try:
            locator.first.click(force=True, timeout=2000)
            return f"forced click after timeout: {str(exc).splitlines()[0]}"
        except Exception as force_exc:  # noqa: BLE001
            return f"click failed for {label}: {force_exc}"
    except Exception as exc:  # noqa: BLE001
        return f"click failed for {label}: {exc}"


def navigate(page: Any, scenario: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    page.goto("http://localhost:3012/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    reset_app_storage(page)
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1300)

    if scenario["kind"] == "tab":
        if "button_text" in scenario:
            issue = click_first(page.get_by_role("button", name=scenario["button_text"], exact=True), scenario["button_text"])
        else:
            issue = click_first(page.locator(f'button[aria-label^="{scenario["aria_prefix"]}"]'), scenario["aria_prefix"])
        if issue:
            issues.append(issue)
    elif scenario["kind"] == "published":
        issue = click_first(page.get_by_label("Choose published operating view"), "published view picker")
        if issue:
            issues.append(issue)
        else:
            page.wait_for_timeout(150)
            option = page.get_by_text(scenario["label"], exact=True)
            option_issue = click_first(option, scenario["label"])
            if option_issue:
                issues.append(option_issue)
    elif scenario["kind"] == "area":
        locator = page.locator(f'.react-flow__node[data-id="{scenario["area_node_id"]}"] button').first
        issue = click_first(locator, f'{scenario["area_node_id"]} Open')
        if issue:
            issues.append(issue)
    else:
        issues.append(f"unknown scenario kind: {scenario['kind']}")

    page.wait_for_timeout(1800)
    return issues


def collect(page: Any, scenario: dict[str, Any]) -> dict[str, Any]:
    return page.evaluate(
        """
        ({ scenario }) => {
          const viewport = { width: window.innerWidth, height: window.innerHeight };
          const bodyText = document.body.innerText || "";
          const flow = document.querySelector(".react-flow");
          const flowRect = flow ? flow.getBoundingClientRect() : null;
          const visible = (rect) =>
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.bottom > 0 &&
            rect.left < viewport.width &&
            rect.top < viewport.height;
          const rectFor = (rect) => ({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
          const typeFor = (className, id) => {
            if (className.includes("react-flow__node-hierarchyNode")) return "person";
            if (className.includes("react-flow__node-areaCardNode")) return "area";
            if (className.includes("react-flow__node-mirrorNode")) return "mirror";
            if (className.includes("react-flow__node-sharedServiceGroupNode")) return "support";
            if (id?.startsWith("formation-pod:")) return "support";
            return "chrome";
          };
          const nodes = Array.from(document.querySelectorAll(".react-flow__node"))
            .map((el) => {
              const rect = el.getBoundingClientRect();
              const id = el.getAttribute("data-id") || "";
              const className = String(el.getAttribute("class") || "");
              return {
                id,
                type: typeFor(className, id),
                className,
                text: (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 160),
                rect: rectFor(rect),
                visible: visible(rect),
              };
            })
            .filter((node) => node.visible);

          const semanticNodes = nodes.filter((node) => ["person", "area", "mirror", "support"].includes(node.type));
          const personNodes = semanticNodes.filter((node) => node.type === "person");
          const areaNodes = semanticNodes.filter((node) => node.type === "area");

          const controls = [];
          for (const el of document.querySelectorAll(".react-flow__minimap, button, [role='button']")) {
            const text = (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim();
            const aria = el.getAttribute("aria-label") || "";
            const label = text || aria;
            if (!label && !String(el.className || "").includes("minimap")) continue;
            if (!/(\\bFit\\b|FULL SCREEN|\\bLegend\\b|Scroll: Zoom|\\bZoom\\b|minimap|react-flow__minimap)/i.test(`${label} ${el.className}`)) continue;
            const rect = el.getBoundingClientRect();
            if (!visible(rect)) continue;
            controls.push({ label: label || "minimap", rect: rectFor(rect) });
          }

          const edges = Array.from(document.querySelectorAll(".react-flow__edge.react-flow__edge-manager"))
            .map((edge) => {
              const label = edge.getAttribute("aria-label") || "";
              const match = label.match(/Edge from (.+?) to (.+)$/);
              const path = edge.querySelector("path");
              const points = [];
              if (path && typeof path.getTotalLength === "function") {
                const ctm = path.getScreenCTM();
                const total = path.getTotalLength();
                if (ctm && Number.isFinite(total)) {
                  const steps = Math.max(8, Math.ceil(total / 12));
                  for (let i = 0; i <= steps; i += 1) {
                    const point = path.getPointAtLength(total * (i / steps));
                    points.push({
                      x: point.x * ctm.a + point.y * ctm.c + ctm.e,
                      y: point.x * ctm.b + point.y * ctm.d + ctm.f,
                    });
                  }
                }
              }
              return {
                id: edge.getAttribute("data-id") || "",
                source: match ? match[1] : "",
                target: match ? match[2] : "",
                label,
                points,
              };
            });

          const required = {};
          const searchableText = bodyText.toLowerCase();
          for (const label of scenario.required || []) {
            required[label] = searchableText.includes(String(label).toLowerCase());
          }

          const errors = Array.from(document.querySelectorAll("nextjs-portal, [data-nextjs-dialog-overlay]"))
            .map((el) => (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 300))
            .filter(Boolean);

          return {
            url: location.href,
            bodyText: bodyText.slice(0, 1200),
            viewport,
            flowRect: flowRect ? rectFor(flowRect) : null,
            nodes,
            semanticNodes,
            personNodes,
            areaNodes,
            controls,
            edges,
            required,
            errors,
          };
        }
        """,
        {"scenario": scenario},
    )


def overlap_area(a: dict[str, int], b: dict[str, int]) -> int:
    x = max(0, min(a["right"], b["right"]) - max(a["left"], b["left"]))
    y = max(0, min(a["bottom"], b["bottom"]) - max(a["top"], b["top"]))
    return x * y


def point_in_rect(point: dict[str, float], rect: dict[str, int], pad: int = 0) -> bool:
    return (
        rect["left"] + pad <= point["x"] <= rect["right"] - pad and
        rect["top"] + pad <= point["y"] <= rect["bottom"] - pad
    )


def score(snapshot: dict[str, Any], scenario: dict[str, Any], nav_issues: list[str]) -> list[str]:
    issues = list(nav_issues)
    if "Internal Server Error" in snapshot["bodyText"]:
        issues.append("page rendered Internal Server Error")
    if snapshot["errors"]:
        issues.append(f"Next/app error overlay visible: {snapshot['errors'][0]}")
    if not snapshot["flowRect"]:
        issues.append("React Flow canvas missing")
        return issues
    if len(snapshot["personNodes"]) < scenario["min_people"]:
        issues.append(f"only {len(snapshot['personNodes'])} visible person cards; expected at least {scenario['min_people']}")
    missing = [label for label, present in snapshot["required"].items() if not present]
    if missing:
        issues.append(f"missing required text: {', '.join(missing)}")

    ignored_overlap_types = set(scenario.get("ignore_overlap_types", []))
    ignored_overlap_prefixes = tuple(scenario.get("ignore_overlap_id_prefixes", []))
    nodes = [
        node
        for node in snapshot["semanticNodes"]
        if node["type"] not in ignored_overlap_types
        and not node["id"].startswith(ignored_overlap_prefixes)
    ]
    for i, first in enumerate(nodes):
        for second in nodes[i + 1:]:
            area = overlap_area(first["rect"], second["rect"])
            if area < 180:
                continue
            smaller = min(first["rect"]["width"] * first["rect"]["height"], second["rect"]["width"] * second["rect"]["height"])
            if smaller and area / smaller > 0.045:
                issues.append(f"card overlap: {first['id']} over {second['id']} ({area}px)")

    ignored_control_prefixes = tuple(scenario.get("ignore_control_id_prefixes", []))
    control_nodes = [
        node
        for node in nodes
        if not node["id"].startswith(ignored_control_prefixes)
    ]
    for node in control_nodes:
        for control in snapshot["controls"]:
            area = overlap_area(node["rect"], control["rect"])
            if area > 180:
                issues.append(f"control covers card: {control['label']} over {node['id']} ({area}px)")

    if scenario.get("check_edges", False):
        inspect_nodes = [node for node in nodes if node["type"] in {"person", "area", "support"}]
        for edge in snapshot["edges"]:
            if not edge["points"]:
                continue
            for node in inspect_nodes:
                if node["id"] in {edge["source"], edge["target"]}:
                    continue
                hit_count = sum(1 for point in edge["points"] if point_in_rect(point, node["rect"], pad=8))
                if hit_count >= 2:
                    issues.append(f"reporting line crosses card: {edge['source']} -> {edge['target']} through {node['id']}")
                    break

    flow = snapshot["flowRect"]
    if snapshot["semanticNodes"]:
        min_top = min(node["rect"]["top"] for node in snapshot["semanticNodes"])
        max_bottom = max(node["rect"]["bottom"] for node in snapshot["semanticNodes"])
        if min_top - flow["top"] > flow["height"] * 0.48:
            issues.append("content starts too low in canvas")
        if flow["bottom"] - max_bottom < 24:
            issues.append("content too close to bottom edge")

    # Keep the report useful: de-duplicate while preserving order.
    deduped: list[str] = []
    for issue in issues:
        if issue not in deduped:
            deduped.append(issue)
    return deduped


def run_once(browser: Any, base_url: str, out_dir: Path, iteration: int) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for scenario in SCENARIOS:
        context = browser.new_context(viewport={"width": 1600, "height": 1000}, device_scale_factor=1)
        page = context.new_page()
        page.set_default_timeout(8000)
        nav_issues: list[str] = []
        try:
            page.goto(base_url)
            page.wait_for_load_state("networkidle")
            nav_issues = navigate(page, scenario)
            snapshot = collect(page, scenario)
            issues = score(snapshot, scenario, nav_issues)
            shot = out_dir / f"{iteration:02d}-{slug(scenario['id'])}.png"
            page.screenshot(path=str(shot), full_page=False)
            results.append(
                {
                    "iteration": iteration,
                    "scenario": scenario["id"],
                    "status": "pass" if not issues else "fail",
                    "issues": issues,
                    "screenshot": str(shot),
                    "personCount": len(snapshot["personNodes"]),
                    "areaCount": len(snapshot["areaNodes"]),
                    "nodeCount": len(snapshot["semanticNodes"]),
                    "url": snapshot["url"],
                }
            )
        except Exception as exc:  # noqa: BLE001
            shot = out_dir / f"{iteration:02d}-{slug(scenario['id'])}-error.png"
            try:
                page.screenshot(path=str(shot), full_page=False)
            except Exception:  # noqa: BLE001
                pass
            results.append(
                {
                    "iteration": iteration,
                    "scenario": scenario["id"],
                    "status": "fail",
                    "issues": [f"audit crashed: {exc}"],
                    "screenshot": str(shot),
                }
            )
        finally:
            context.close()
    return results


def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    all_results: list[dict[str, Any]] = []
    deadline = time.monotonic() + args.duration_seconds if args.duration_seconds > 0 else None

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        iteration = 1
        while True:
            all_results.extend(run_once(browser, args.base_url, out_dir, iteration))
            if not deadline or time.monotonic() >= deadline:
                break
            iteration += 1
        browser.close()

    report = out_dir / "visual-truth-report.json"
    report.write_text(json.dumps(all_results, indent=2), encoding="utf-8")
    failures = [item for item in all_results if item["status"] == "fail"]
    print(
        json.dumps(
            {
                "report": str(report),
                "screenshots": str(out_dir),
                "total": len(all_results),
                "failed": len(failures),
                "failures": failures[:30],
            },
            indent=2,
        )
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
