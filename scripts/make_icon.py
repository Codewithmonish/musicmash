r"""Draw assets/musicmash.ico from the favicon geometry (music-mash-frontend/public/favicon.svg):
four white equalizer bars and a Signal Blue baseline on an Obsidian rounded square.

Run with the AI venv (it has Pillow):  music-mash-ai\.venv\Scripts\python scripts\make_icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets" / "musicmash.ico"
GRID = 32                    # favicon.svg viewBox
SIZE = 1024                  # drawn large, then downsampled for clean edges
OBSIDIAN, WHITE, SIGNAL = "#121212", "#ffffff", "#699fff"
BARS = [(6, 13, 3, 9), (11, 8, 3, 14), (16, 11, 3, 11), (21, 6, 3, 16)]   # x, y, w, h
BASELINE = (6, 24, 18, 2)


def draw() -> Image.Image:
    s = SIZE / GRID
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas = ImageDraw.Draw(image)
    canvas.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=4 * s, fill=OBSIDIAN)
    for x, y, w, h in BARS:
        canvas.rounded_rectangle((x * s, y * s, (x + w) * s, (y + h) * s), radius=1 * s, fill=WHITE)
    x, y, w, h = BASELINE
    canvas.rounded_rectangle((x * s, y * s, (x + w) * s, (y + h) * s), radius=1 * s, fill=SIGNAL)
    return image


if __name__ == "__main__":
    OUT.parent.mkdir(exist_ok=True)
    big = draw().resize((256, 256), Image.LANCZOS)
    big.save(OUT, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
