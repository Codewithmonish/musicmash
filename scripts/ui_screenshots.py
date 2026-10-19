"""
DEV ONLY: screenshot every page at desktop (1440 px) and mobile (390 px) width.

Logs in through the API as the demo accounts created by scripts/demo_seed.py (the judge page
uses the demo HOST account), then saves full-page screenshots to ./screenshots/ui/ as
<page>-desktop.png and <page>-mobile.png. For each page it reports:
  * console errors and failed /api/ calls
  * horizontal overflow (page wider than the viewport), which must never happen at 390 px

Usage (services running, demo_seed.py done, from the repo root):
    music-mash-ai\\.venv\\Scripts\\python scripts\\ui_screenshots.py            # all pages
    music-mash-ai\\.venv\\Scripts\\python scripts\\ui_screenshots.py landing login
"""
import json
import sys
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "screenshots" / "ui"
FRONTEND = "http://localhost:5173"
API = "http://localhost:8081/api"
PASSWORD = "demo-pass-123"
USER, HOST = "demo@musicmash.local", "host@musicmash.local"
VIEWPORTS = {"desktop": (1440, 900), "mobile": (390, 844)}


def pages(seed: dict) -> list[tuple[str, str, str | None]]:
    """(name, path, account) - account None = logged out."""
    analysis = f"/ai-analysis/{seed['analysis_id']}" + (f"?comparison={seed['comparison_id']}" if seed.get("comparison_id") else "")
    return [
        ("landing", "/", None),
        ("login", "/login", None),
        ("register", "/register", None),
        ("credits", "/credits", None),
        ("not-found", "/no-such-page", None),
        ("onboarding", "/onboarding", USER),
        ("dashboard", "/dashboard", USER),
        ("upload", "/upload", USER),
        ("ai-analysis", analysis, USER),
        ("practice", "/practice", USER),
        ("competitions", "/competitions", USER),
        ("leaderboard", "/leaderboard", USER),
        ("challenges", "/challenges", USER),
        ("social", "/social", USER),
        ("profile", "/profile", USER),
        ("judge", "/judge", HOST),
        ("styleguide", "/styleguide", None),
    ]


def token_for(email: str) -> str:
    response = httpx.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD}, timeout=30)
    response.raise_for_status()
    return response.json()["token"]


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    seed = json.loads((ROOT / "logs" / "demo_seed.json").read_text())
    wanted = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    tokens = {USER: token_for(USER), HOST: token_for(HOST)}
    problems: dict[str, list[str]] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, path, account in pages(seed):
            if wanted and name not in wanted:
                continue
            for view, (width, height) in VIEWPORTS.items():
                context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1,
                                              reduced_motion="reduce")
                if account:
                    context.add_init_script(f"localStorage.setItem('token', {json.dumps(tokens[account])})")
                else:
                    context.add_init_script("localStorage.removeItem('token')")
                page = context.new_page()
                issues: list[str] = []
                page.on("console", lambda msg, issues=issues: msg.type == "error" and issues.append(f"console: {msg.text[:200]}"))
                page.on("pageerror", lambda err, issues=issues: issues.append(f"page error: {str(err)[:200]}"))
                page.on("response", lambda r, issues=issues: "/api/" in r.url and r.status >= 400
                        and issues.append(f"HTTP {r.status} {r.url.replace(API, '')}"))
                page.goto(FRONTEND + path)
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1200)  # images, charts, staggered reveals
                # Scroll through once so lazy images and whileInView reveals render, then back up.
                page.evaluate("""async () => {
                    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); }
                    window.scrollTo(0, 0);
                }""")
                page.wait_for_timeout(600)
                overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                if overflow > 0:
                    issues.append(f"horizontal overflow {overflow}px")
                page.screenshot(path=OUT / f"{name}-{view}.png", full_page=True)
                if issues:
                    problems[f"{name}-{view}"] = sorted(set(issues))
                print(f"{name:<13} {view:<8} {'OK' if not issues else '; '.join(sorted(set(issues)))}")
                context.close()
        browser.close()

    (OUT / "report.json").write_text(json.dumps(problems, indent=2), encoding="utf-8")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
