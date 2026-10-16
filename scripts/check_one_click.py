"""Check the one-click app on its single address (http://localhost:8081), like a user would.

Run while MusicMash is running (MusicMash.bat), with the demo data from scripts/demo_seed.py:

    music-mash-ai\\.venv\\Scripts\\python scripts\\check_one_click.py

Steps: landing page loads from Spring; log in through the form; a deep link (/practice) works
on a fresh load (SPA fallback); an unknown /api path is a JSON 404, not the app; the AI Analysis
page for the demo analysis shows the AI Coach section. Every request must stay on
localhost:8081 (no Vite on 5173). Screenshots go to screenshots/one-click/. Exit code 1 on failure.
"""
import json
import sys
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP = "http://localhost:8081"
OUT = ROOT / "screenshots" / "one-click"
EMAIL, PASSWORD = "demo@musicmash.local", "demo-pass-123"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    analysis_id = json.loads((ROOT / "logs" / "demo_seed.json").read_text())["analysis_id"]
    problems: list[str] = []

    api_404 = httpx.get(f"{APP}/api/does-not-exist", timeout=10)
    if api_404.status_code not in (401, 403, 404) or "<!doctype html>" in api_404.text.lower():
        problems.append(f"/api/does-not-exist returned {api_404.status_code} with the app page")
    health = httpx.get(f"{APP}/api/public/health", timeout=10)
    if health.json() != {"status": "UP", "database": "UP"}:
        problems.append(f"health: {health.text}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        foreign: list[str] = []
        errors: list[str] = []
        page.on("request", lambda r: foreign.append(r.url) if r.url.startswith("http://localhost:")
                and not r.url.startswith(APP) else None)
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        page.goto(APP)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=OUT / "1-landing.png")
        if "MusicMash" not in page.title():
            problems.append(f"landing title is {page.title()!r}")

        page.goto(f"{APP}/login")
        page.get_by_label("Email").fill(EMAIL)
        page.get_by_label("Password").fill(PASSWORD)
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url(f"{APP}/dashboard", timeout=20000)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=OUT / "2-dashboard.png")

        page.goto(f"{APP}/practice")          # fresh load of a client-side route
        page.wait_for_load_state("networkidle")
        if page.get_by_role("heading", name="Practice Arena").count() == 0:
            problems.append("/practice deep link did not render the Practice Arena")

        page.goto(f"{APP}/ai-analysis/{analysis_id}")
        page.get_by_role("heading", name="AI Coach").wait_for(timeout=30000)
        page.get_by_text("Your 7-day plan").wait_for(timeout=90000)   # first coach call loads the model
        page.wait_for_load_state("networkidle")
        page.screenshot(path=OUT / "3-ai-analysis.png", full_page=True)
        coach = page.get_by_role("heading", name="AI Coach").locator("xpath=ancestor::section[1]")
        coach.screenshot(path=OUT / "4-ai-coach.png")

        browser.close()

    if foreign:
        problems.append(f"requests left {APP}: {sorted(set(foreign))[:5]}")
    if errors:
        problems.append(f"console errors: {errors[:5]}")
    for problem in problems:
        print("FAIL", problem)
    print("OK: landing, login, deep link, AI Analysis and AI Coach on", APP) if not problems else None
    print("screenshots:", OUT)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
