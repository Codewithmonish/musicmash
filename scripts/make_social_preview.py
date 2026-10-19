"""Render docs/media/social-preview.png (1280x640), the image GitHub shows when the repo is shared.

Built as an HTML page in the MusicMash design system (Obsidian background, Inter, the
equalizer-bar wordmark) and screenshotted with Playwright. The pitch curve is real: it is the
measured output for the generated demo melody (music-mash-frontend/src/data/sample-analysis.json),
coloured like the app's chart (within ±20 cents green, more than 35 cents off red).

    music-mash-ai\\.venv\\Scripts\\python scripts\\make_social_preview.py
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "music-mash-frontend" / "src" / "data" / "sample-analysis.json"
OUT = ROOT / "docs" / "media" / "social-preview.png"

# Chart area inside the 1280x640 canvas
X0, X1, Y0, Y1 = 640, 1200, 150, 470
GOOD, WARNING, CRITICAL, NOTE = "#0ca30c", "#fab219", "#d03b3b", "#303030"


def colour(cents: float) -> str:
    """Same bands as the app's pitch chart: <=20 cents good, <=35 warning, beyond that critical."""
    return GOOD if abs(cents) <= 20 else WARNING if abs(cents) <= 35 else CRITICAL


def contour_svg(points: list[dict], notes: list[dict]) -> str:
    voiced = [p for p in points if p["voiced"] and p["midi_float"] is not None]
    t_max = max(p["t"] for p in points)
    low = min(p["midi_float"] for p in voiced) - 1.5
    high = max(p["midi_float"] for p in voiced) + 1.5

    def x(t: float) -> float:
        return X0 + (X1 - X0) * t / t_max

    def y(midi: float) -> float:
        return Y1 - (Y1 - Y0) * (midi - low) / (high - low)

    parts = [f'<line x1="{X0}" y1="{Y1}" x2="{X1}" y2="{Y1}" stroke="#303030" stroke-width="2"/>']
    for n in notes:                                   # detected notes: soft bars behind the line
        parts.append(f'<rect x="{x(n["start"]):.1f}" y="{y(n["midi"]) - 5:.1f}" width="{x(n["end"]) - x(n["start"]):.1f}" '
                     f'height="10" rx="2" fill="{NOTE}"/>')
    previous = None
    for p in points:                                  # the measured pitch line, segment by segment
        if not (p["voiced"] and p["midi_float"] is not None):
            previous = None
            continue
        if previous is not None and p["t"] - previous["t"] < 0.08:
            parts.append(f'<line x1="{x(previous["t"]):.1f}" y1="{y(previous["midi_float"]):.1f}" '
                         f'x2="{x(p["t"]):.1f}" y2="{y(p["midi_float"]):.1f}" stroke="{colour(p["cents_off"])}" '
                         f'stroke-width="4" stroke-linecap="round"/>')
        previous = p
    return "\n".join(parts)


def page_html() -> str:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    mark = ('<svg width="44" height="44" viewBox="0 0 24 24"><g fill="#fff">'
            '<rect x="2" y="9" width="3" height="10"/><rect x="7" y="4" width="3" height="15"/>'
            '<rect x="12" y="7" width="3" height="12"/><rect x="17" y="2" width="3" height="17"/></g>'
            '<rect x="2" y="21" width="18" height="2" fill="#699fff"/></svg>')
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;400;600&display=swap" rel="stylesheet">
<style>
  html, body {{ margin: 0; width: 1280px; height: 640px; background: #121212; font-family: Inter, sans-serif; }}
  .wordmark {{ position: absolute; left: 80px; top: 72px; display: flex; align-items: center; gap: 14px;
               color: #fff; font-weight: 600; font-size: 34px; letter-spacing: -0.01em; }}
  h1 {{ position: absolute; left: 80px; top: 190px; width: 520px; margin: 0; color: #fff;
        font-weight: 100; font-size: 64px; line-height: 1.05; letter-spacing: -0.01em; }}
  p {{ position: absolute; left: 80px; top: 400px; width: 500px; margin: 0; color: #999;
       font-size: 22px; line-height: 1.4; }}
  .legend {{ position: absolute; left: {X0}px; top: 500px; display: flex; gap: 28px; color: #999; font-size: 17px; }}
  .legend span::before {{ content: ""; display: inline-block; width: 22px; height: 4px; margin-right: 8px;
                          vertical-align: middle; border-radius: 2px; background: var(--c); }}
  .tag {{ position: absolute; left: {X0}px; top: 104px; color: #cccccc; font-size: 17px; }}
  svg.chart {{ position: absolute; left: 0; top: 0; }}
</style></head><body>
<div class="wordmark">{mark}MusicMash</div>
<h1>See your pitch.<br>Fix your timing.</h1>
<p>AI music practice: pitch &amp; rhythm analysis, comparison with the original, and a grounded AI coach.</p>
<div class="tag">Measured pitch curve of a test melody</div>
<svg class="chart" width="1280" height="640">{contour_svg(data["points"], data["notes"])}</svg>
<div class="legend"><span style="--c:{GOOD}">within ±20¢</span><span style="--c:{WARNING}">20–35¢ off</span>
<span style="--c:{CRITICAL}">more than 35¢ off</span></div>
</body></html>"""


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 640})
        page.set_content(page_html(), wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        page.screenshot(path=str(OUT))
        browser.close()
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
