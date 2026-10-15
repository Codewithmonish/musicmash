"""
DEV ONLY: open the AI Analysis page in a real (headless) Chromium and take screenshots.

Logs in through the login form as the demo user, opens the analysis created by
scripts/demo_seed.py, waits for the pitch chart, and saves to ./screenshots/:
  ai-analysis-full.png     the whole page
  pitch-chart.png          the pitch-curve card
  pitch-chart-hover.png    the chart while hovering the sharp note (tooltip visible)
  comparison.png           the reference-comparison card (if demo_seed.py made a comparison)
  comparison-detail.png    the same card after clicking the first problem section
  console.txt              browser console errors, page errors and failed API calls
Exits with code 1 if the chart, the sharp-note tooltip or the comparison timeline is
missing, or anything errored.

Usage (services running and demo_seed.py done, from the repo root):
    music-mash-ai\\.venv\\Scripts\\python scripts\\e2e_screenshot.py [--analysis-id N] [--headed]
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "screenshots"
FRONTEND = os.environ.get("MUSICMASH_FRONTEND", "http://localhost:5173")
EMAIL = os.environ.get("MUSICMASH_DEMO_EMAIL", "demo@musicmash.local")
PASSWORD = os.environ.get("MUSICMASH_DEMO_PASSWORD", "demo-pass-123")
SHARP_NOTE = "E4"
TOOLTIP = re.compile(r"([A-G]#?\d) · ([+-]\d+)¢ (sharp|flat)")


def read_seed() -> dict:
    seed = ROOT / "logs" / "demo_seed.json"
    if not seed.exists():
        sys.exit("No logs/demo_seed.json: run scripts/demo_seed.py first, or pass --analysis-id.")
    return json.loads(seed.read_text())


def hover_sharp_note(page, chart) -> str | None:
    """Sweep the mouse across the plot area and stop in the middle of the sharp note.

    Every x position whose tooltip shows "E4 ... sharp" is collected; the mouse is left on
    the middle one, so the tooltip shows a typical value for the note rather than an edge
    frame where the analysis window still overlaps the previous note.
    """
    plot = chart.locator(".recharts-cartesian-grid").bounding_box()
    y = plot["y"] + plot["height"] / 2
    hits: list[tuple[float, str]] = []
    steps = 300
    for i in range(steps + 1):
        x = plot["x"] + plot["width"] * i / steps
        page.mouse.move(x, y)
        text = chart.locator(".recharts-tooltip-wrapper").inner_text().strip()
        match = TOOLTIP.search(text)
        if match and match.group(1) == SHARP_NOTE and match.group(3) == "sharp":
            hits.append((x, text))
    if not hits:
        return None
    x, _ = hits[len(hits) // 2]
    page.mouse.move(x, y)
    page.wait_for_timeout(200)
    return chart.locator(".recharts-tooltip-wrapper").inner_text().strip()


def main() -> int:
    # Windows consoles default to cp1252; the tooltip ("·", "¢") and browser messages
    # (emoji) would otherwise raise UnicodeEncodeError inside Playwright's event handlers.
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--analysis-id", type=int, default=None)
    parser.add_argument("--headed", action="store_true", help="show the browser window")
    args = parser.parse_args()
    seed = {} if args.analysis_id else read_seed()
    analysis_id = args.analysis_id or seed["analysis_id"]
    comparison_id = seed.get("comparison_id")
    OUT.mkdir(exist_ok=True)

    problems: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: msg.type == "error" and problems.append(f"console: {msg.text}"))
        page.on("pageerror", lambda err: problems.append(f"page error: {err}"))
        page.on("response", lambda r: "/api/" in r.url and r.status >= 400
                and problems.append(f"HTTP {r.status} {r.request.method} {r.url}"))

        # 1. Log in through the real form.
        page.goto(f"{FRONTEND}/login")
        page.wait_for_load_state("networkidle")  # Vite may reload once while optimising deps
        page.locator("input[type=email]").wait_for()
        page.fill("input[type=email]", EMAIL)
        page.fill("input[type=password]", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_url(lambda url: "/login" not in url, timeout=15000)

        # Only the AI Analysis page is under test; drop anything the landing page logged.
        problems.clear()

        # 2. Open the analysis and wait for the chart to draw its line.
        query = f"?comparison={comparison_id}" if comparison_id else ""
        page.goto(f"{FRONTEND}/ai-analysis/{analysis_id}{query}")
        card = page.locator("div.rounded-2xl", has=page.get_by_role("heading", name="Your pitch curve")).last
        chart = card.locator(".recharts-wrapper")
        try:
            chart.locator(".recharts-line-curve").first.wait_for(timeout=30000)
        except Exception:
            page.screenshot(path=OUT / "ai-analysis-full.png", full_page=True)
            problems.append("pitch chart did not render (see ai-analysis-full.png)")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

        page.screenshot(path=OUT / "ai-analysis-full.png", full_page=True)
        if chart.count():
            card.screenshot(path=OUT / "pitch-chart.png")

            # 3. Hover the sharp note and capture the tooltip.
            card.scroll_into_view_if_needed()
            tooltip = hover_sharp_note(page, chart)
            card.screenshot(path=OUT / "pitch-chart-hover.png")
            if tooltip:
                print(f"Tooltip on the sharp note: {tooltip!r}")
            else:
                problems.append(f"no tooltip showing {SHARP_NOTE} sharp was found")

        # 4. The reference comparison: timeline, then the details of the first problem block.
        if comparison_id:
            compare_card = page.locator(
                "div.rounded-2xl", has=page.get_by_role("heading", name="How close am I to the original?")).last
            blocks = compare_card.locator("button[aria-label*=' from ']")
            try:
                blocks.first.wait_for(timeout=60000)
                compare_card.scroll_into_view_if_needed()
                page.wait_for_timeout(500)
                compare_card.screenshot(path=OUT / "comparison.png")
                labels = [blocks.nth(i).get_attribute("aria-label") for i in range(blocks.count())]
                print(f"Problem blocks on the timeline: {labels}")
                blocks.first.click()
                page.wait_for_timeout(300)
                compare_card.screenshot(path=OUT / "comparison-detail.png")
            except Exception as e:
                compare_card.screenshot(path=OUT / "comparison.png")
                problems.append(f"comparison timeline did not render: {e}")
        browser.close()

    (OUT / "console.txt").write_text("\n".join(problems) or "no errors\n", encoding="utf-8")
    for name in ("ai-analysis-full.png", "pitch-chart.png", "pitch-chart-hover.png",
                 "comparison.png", "comparison-detail.png", "console.txt"):
        if (OUT / name).exists():
            print(f"saved {OUT / name}")
    if problems:
        print("\nProblems:\n  " + "\n  ".join(problems))
        return 1
    print("\nNo console errors; chart, sharp-note tooltip and comparison timeline all rendered.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
