"""README media: clean screenshots and a recorded demo walkthrough of the running app.

Run while MusicMash is running (MusicMash.bat) with the demo data from scripts/demo_seed.py:

    music-mash-ai\\.venv\\Scripts\\python scripts\\readme_media.py screenshots
    music-mash-ai\\.venv\\Scripts\\python scripts\\readme_media.py demo

screenshots  1440x900 (and 390px mobile) PNGs -> WebP <= 300 KB in docs/screenshots/.
demo         Records a walkthrough with Playwright (WebM), then ffmpeg makes
             docs/media/demo.mp4 (<= 10 MB) and docs/media/demo.gif (<= 8 MB, sped-up preview).
gif          Only rebuilds demo.gif from the existing demo.mp4.

Only the demo accounts are used, so no personal data appears. Chromium gets a fake microphone
(a test tone) so the tuner and the recording studio have something to show.
"""
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP = "http://localhost:8081"
SHOTS = ROOT / "docs" / "screenshots"
MEDIA = ROOT / "docs" / "media"
EMAIL, PASSWORD = "demo@musicmash.local", "demo-pass-123"
TOOLTIP = re.compile(r"([A-G]#?\d) · ([+-]\d+)¢ (sharp|flat)")
FAKE_MIC = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
MAX_SHOT_BYTES = 300 * 1024


def seed() -> dict:
    return json.loads((ROOT / "logs" / "demo_seed.json").read_text())


def ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    winget = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    for exe in winget.glob("Gyan.FFmpeg*/**/bin/ffmpeg.exe"):
        return str(exe)
    sys.exit("ffmpeg not found: install it (winget install Gyan.FFmpeg) and open a new terminal.")


def login(page: Page, slow: bool = False) -> None:
    page.goto(f"{APP}/login")
    page.get_by_label("Email").click()
    page.get_by_label("Email").type(EMAIL, delay=45 if slow else 0)
    page.get_by_label("Password").type(PASSWORD, delay=45 if slow else 0)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(f"{APP}/dashboard", timeout=20000)
    page.wait_for_load_state("networkidle")


def save_webp(png: bytes, name: str) -> Path:
    """PNG bytes -> docs/screenshots/<name>.webp, lowering quality until it is <= 300 KB."""
    image = Image.open(io.BytesIO(png)).convert("RGB")
    out = SHOTS / f"{name}.webp"
    for quality in (88, 82, 76, 70, 64, 58, 50):
        image.save(out, "WEBP", quality=quality, method=6)
        if out.stat().st_size <= MAX_SHOT_BYTES:
            break
    print(f"  {out.relative_to(ROOT)}  {image.size[0]}x{image.size[1]}  {out.stat().st_size // 1024} KB")
    return out


def scroll_to(page: Page, heading: str, offset: int = 80) -> None:
    """Scroll so the section heading sits just below the fixed nav bar."""
    target = page.get_by_role("heading", name=heading).first
    target.wait_for(timeout=60000)
    y = target.evaluate("el => el.getBoundingClientRect().top + window.scrollY")
    page.evaluate(f"window.scrollTo(0, {max(0, y - offset)})")
    page.wait_for_timeout(600)


def smooth_scroll_to(page: Page, heading: str, offset: int = 80, steps: int = 24) -> None:
    """Like scroll_to, but visibly scrolls (for the video)."""
    target = page.get_by_role("heading", name=heading).first
    target.wait_for(timeout=60000)
    start = page.evaluate("window.scrollY")
    end = target.evaluate("el => el.getBoundingClientRect().top + window.scrollY") - offset
    for i in range(1, steps + 1):
        page.evaluate(f"window.scrollTo(0, {start + (end - start) * i / steps})")
        page.wait_for_timeout(30)
    page.wait_for_timeout(400)


def hover_sharp_note(page: Page) -> str | None:
    """Sweep across the pitch chart and leave the mouse in the middle of the sharp E4."""
    chart = page.locator(".recharts-wrapper").first
    plot = chart.locator(".recharts-cartesian-grid").bounding_box()
    y = plot["y"] + plot["height"] / 2
    hits = []
    for i in range(0, 241):
        x = plot["x"] + plot["width"] * i / 240
        page.mouse.move(x, y)
        tip = chart.locator(".recharts-tooltip-wrapper")
        match = TOOLTIP.search(tip.inner_text()) if tip.count() else None
        if match and match.group(1) == "E4" and match.group(3) == "sharp":
            hits.append(x)
    if not hits:
        return None
    page.mouse.move(hits[len(hits) // 2], y)
    page.wait_for_timeout(300)
    return chart.locator(".recharts-tooltip-wrapper").inner_text()


def analysis_url() -> str:
    s = seed()
    return f"{APP}/ai-analysis/{s['analysis_id']}?comparison={s['comparison_id']}"


# --- Screenshots -------------------------------------------------------------------------------

def screenshots() -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=FAKE_MIC)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce",
                                      permissions=["microphone"])
        page = context.new_page()

        page.goto(APP)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        save_webp(page.screenshot(), "landing")

        login(page)

        page.goto(f"{APP}/practice")
        page.wait_for_load_state("networkidle")
        scroll_to(page, "Tools")
        page.get_by_role("button", name="Start", exact=True).click()
        page.get_by_role("button", name="Start tuner").click()
        page.wait_for_timeout(2500)
        save_webp(page.screenshot(), "practice-tools")
        page.get_by_role("button", name="Stop", exact=True).click()

        page.goto(f"{APP}/upload")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Start recording").click()
        page.wait_for_timeout(3500)
        save_webp(page.screenshot(), "studio-recording")
        page.get_by_role("button", name="Stop recording").click()
        page.wait_for_timeout(1500)

        page.goto(analysis_url())
        scroll_to(page, "Your pitch curve")
        page.locator(".recharts-line-curve").first.wait_for(timeout=30000)
        tip = hover_sharp_note(page)
        print(f"  tooltip: {tip!r}")
        save_webp(page.screenshot(), "pitch-contour-sharp-note")

        scroll_to(page, "How close am I to the original?")
        page.locator("button[aria-label*=' from ']").first.wait_for(timeout=60000)
        page.locator("button[aria-label*=' from ']").first.click()
        page.wait_for_timeout(700)
        save_webp(page.screenshot(), "comparison-timeline")

        scroll_to(page, "AI Coach")
        page.get_by_text("Your 7-day plan").wait_for(timeout=120000)
        save_webp(page.screenshot(), "ai-coach")

        page.goto(f"{APP}/leaderboard")
        page.wait_for_load_state("networkidle")
        save_webp(page.screenshot(), "leaderboard")

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                     reduced_motion="reduce", is_mobile=True, has_touch=True)
        phone = mobile.new_page()
        phone.goto(APP)
        phone.wait_for_load_state("networkidle")
        phone.wait_for_timeout(800)
        save_webp(phone.screenshot(), "mobile-landing")
        login(phone)
        phone.goto(analysis_url())
        phone.locator(".recharts-line-curve").first.wait_for(timeout=30000)
        scroll_to(phone, "Your pitch curve", offset=70)
        save_webp(phone.screenshot(), "mobile-pitch-curve")
        browser.close()


# --- Demo video --------------------------------------------------------------------------------

def demo() -> None:
    MEDIA.mkdir(parents=True, exist_ok=True)
    raw_dir = Path(tempfile.mkdtemp(prefix="musicmash-demo-"))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=FAKE_MIC)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, permissions=["microphone"],
                                      record_video_dir=str(raw_dir), record_video_size={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto(APP)                                   # landing: hero, genres, "See your pitch"
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2500)
        smooth_scroll_to(page, "Explore by genre", steps=40)
        page.wait_for_timeout(1200)
        smooth_scroll_to(page, "See your pitch. Fix your timing.", offset=200, steps=40)
        page.wait_for_timeout(2000)

        login(page, slow=True)                           # dashboard
        page.wait_for_timeout(2000)

        page.goto(f"{APP}/practice")                     # practice tools
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        smooth_scroll_to(page, "Tools")
        page.get_by_role("button", name="Start", exact=True).click()
        page.get_by_role("button", name="Start tuner").click()
        page.wait_for_timeout(3500)
        page.get_by_role("button", name="Stop", exact=True).click()
        smooth_scroll_to(page, "Exercises", steps=30)
        page.wait_for_timeout(1500)

        page.goto(f"{APP}/upload")                       # recording studio
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.get_by_role("button", name="Start recording").click()
        page.wait_for_timeout(4000)
        page.get_by_role("button", name="Stop recording").click()
        page.wait_for_timeout(2500)

        page.goto(analysis_url())                        # measured analysis of the demo take
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        smooth_scroll_to(page, "Your pitch curve")
        page.locator(".recharts-line-curve").first.wait_for(timeout=30000)
        hover_sharp_note(page)
        page.wait_for_timeout(2500)
        smooth_scroll_to(page, "How close am I to the original?")
        page.locator("button[aria-label*=' from ']").first.wait_for(timeout=60000)
        page.wait_for_timeout(800)
        page.locator("button[aria-label*=' from ']").first.click()
        page.wait_for_timeout(2500)
        smooth_scroll_to(page, "AI Coach")
        page.get_by_text("Your 7-day plan").wait_for(timeout=120000)
        page.wait_for_timeout(2500)
        smooth_scroll_to(page, "Your 7-day plan", steps=40)
        page.wait_for_timeout(2500)

        page.goto(f"{APP}/leaderboard")                  # community
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2500)

        video = page.video
        context.close()
        raw = Path(video.path())
        browser.close()

    ff = ffmpeg()
    mp4, gif = MEDIA / "demo.mp4", MEDIA / "demo.gif"
    for crf in (26, 30, 34):
        subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(raw), "-vf", "fps=30,scale=1280:-2",
                        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", "-an", str(mp4)], check=True)
        if mp4.stat().st_size <= 10 * 1024 * 1024:
            break
    # The GIF is a sped-up preview of the same walkthrough (the MP4 is the full-speed version).
    # Written to a temp file first: overwriting a big GIF that a virus scanner is still reading fails.
    tmp_gif = raw_dir / "demo.gif"
    for speed, width, fps in ((2.5, 720, 7), (3, 720, 6), (3, 640, 6), (4, 640, 5)):
        subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(mp4), "-vf",
                        f"setpts=PTS/{speed},fps={fps},scale={width}:-1:flags=lanczos,split[a][b];"
                        "[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
                        "-loop", "0", str(tmp_gif)], check=True)
        if tmp_gif.stat().st_size <= 8 * 1024 * 1024:
            print(f"  GIF preview: {speed}x speed, {width}px, {fps} fps")
            break
    shutil.copyfile(tmp_gif, gif)
    shutil.rmtree(raw_dir, ignore_errors=True)
    for f in (mp4, gif):
        print(f"  {f.relative_to(ROOT)}  {f.stat().st_size / 1024 / 1024:.1f} MB")


def gif_only() -> None:
    """Rebuild docs/media/demo.gif from the existing docs/media/demo.mp4 (no new recording)."""
    ff, mp4, gif = ffmpeg(), MEDIA / "demo.mp4", MEDIA / "demo.gif"
    tmp = Path(tempfile.mkdtemp(prefix="musicmash-gif-")) / "demo.gif"
    for speed, width, fps in ((2.5, 720, 7), (3, 720, 6), (3, 640, 6), (4, 640, 5)):
        subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(mp4), "-vf",
                        f"setpts=PTS/{speed},fps={fps},scale={width}:-1:flags=lanczos,split[a][b];"
                        "[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
                        "-loop", "0", str(tmp)], check=True)
        if tmp.stat().st_size <= 8 * 1024 * 1024:
            print(f"  GIF preview: {speed}x speed, {width}px, {fps} fps")
            break
    shutil.copyfile(tmp, gif)
    print(f"  {gif.relative_to(ROOT)}  {gif.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    {"screenshots": screenshots, "demo": demo, "gif": gif_only}[sys.argv[1] if len(sys.argv) > 1 else "screenshots"]()
