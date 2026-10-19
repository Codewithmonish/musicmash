"""
Build MusicMash's photography from its sources: download, crop, tone, convert to WebP.

Every photo is from Unsplash under the Unsplash License (free, commercial use allowed, no
permission needed). Each entry below was checked by hand: the photographer and image id
were confirmed on the photo's own Unsplash page, and the image was reviewed for brand logos
and identifiable public figures (none are used).

Outputs (all regenerated on every run):
  music-mash-frontend/public/images/<group>/<name>.webp
  music-mash-frontend/public/images/CREDITS.md        human-readable credits
  music-mash-frontend/public/images/credits.json      the same, for the in-app /credits page
  music-mash-frontend/src/data/images.json            manifest the app imports (src, alt, size)

Budgets: hero <= 300 KB at 1920 px wide; 600 px square tiles <= 80 KB; banners <= 250 KB.

Usage (from the repo root; needs Pillow, see music-mash-ai/requirements-dev.txt):
    music-mash-ai\\.venv\\Scripts\\python scripts\\images\\process_images.py
"""
import io
import json
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "music-mash-frontend" / "public" / "images"
MANIFEST = ROOT / "music-mash-frontend" / "src" / "data" / "images.json"
CACHE = ROOT / "scripts" / "images" / ".cache"   # gitignored download cache

# group -> (width, height, max KB). Scenes override their size per entry.
SIZES = {
    "hero": (1920, 1080, 300),
    "genres": (600, 600, 80),
    "instruments": (600, 600, 80),
    "covers": (600, 600, 80),
    "empty-states": (600, 600, 80),
    "scenes": (1600, 700, 250),
}
PORTRAIT = (1000, 1250, 250)   # split-layout images (auth pages, 404)


@dataclass
class Photo:
    group: str
    name: str
    photo_id: str          # images.unsplash.com/<photo_id>
    page: str              # unsplash.com photo page
    photographer: str
    alt: str
    focus: tuple[float, float] = (0.5, 0.5)   # crop centre, 0..1 of width / height
    size: tuple[int, int, int] | None = None   # overrides SIZES[group]


U = "https://unsplash.com/photos/"
PHOTOS = [
    # Hero carousel (landing page)
    Photo("hero", "crowd-blue-stage", "photo-1610901056511-31de499995f0", U + "silhouette-of-people-watching-concert-jz_CtXafltc",
          "Dorel Gnatiuc", "Concert crowd in silhouette in front of a stage washed in blue light", (0.5, 0.45)),
    Photo("hero", "guitarist-smoke", "photo-1468392788711-903a924761a6", U + "GrIty4BNJEE",
          "Francisco Moreno", "Guitarist in silhouette on a smoky stage, black and white", (0.5, 0.5)),
    Photo("hero", "dj-hands-purple", "photo-1470225620780-dba8ba36b745", U + "YrtFlrLo2DQ",
          "Marcela Laskoski", "A DJ's hand over glowing decks in purple and red light", (0.5, 0.5)),

    # Genre tiles
    Photo("genres", "hiphop", "photo-1415886541506-6efc5e4b1786", U + "Udu9NgiNFk8",
          "aiden marples", "Rapper with a microphone in low stage light", (0.5, 0.4)),
    Photo("genres", "jazz", "photo-1725830071503-d705ef4a0975", U + "a-man-playing-a-saxophone-in-a-dark-room-z_disLOcoKM",
          "Denny Müller", "Saxophonist silhouetted against a pink-lit jazz bar", (0.45, 0.5)),
    Photo("genres", "classical", "photo-1465847899084-d164df4dedc6", U + "slbOcNlWNHA",
          "Larisa Birta", "Violin section of an orchestra in dim light", (0.5, 0.5)),
    Photo("genres", "rock", "photo-1498038432885-c6f3f1b912ee", U + "iIWDt0fXa84",
          "Hector Bermudez", "Long-haired guitarist playing an electric guitar on stage", (0.45, 0.4)),
    Photo("genres", "pop", "photo-1613592173563-cc06087dbebc", U + "k4s5mTSYULI",
          "Fabian Centeno", "Singer in a black dress under stage spotlights", (0.45, 0.5)),
    Photo("genres", "electronic", "photo-1642177192159-f76c78e07690", U + "9ZRqoZoyCPs",
          "Panagiotis Falcos", "Synthesizer and studio monitor in red and purple light", (0.45, 0.55)),
    Photo("genres", "folk", "photo-1471478331149-c72f17e33c73", U + "person-playing-guitar-2UuhMZEChdc",
          "Gabriel Gurrola", "Hands playing an acoustic guitar", (0.5, 0.55)),
    Photo("genres", "rnb", "photo-1502056618377-f15b18d813b7", U + "n6NNwX0lRTk",
          "Artem Bryzgalov", "Three singers in silhouette at microphones in blue haze", (0.5, 0.5)),

    # Instrument tiles (onboarding, exercises)
    Photo("instruments", "piano", "photo-1512733596533-7b00ccf8ebaf", U + "piano-keys-RWytwNueNng",
          "Johannes Plenio", "Piano keys in dramatic close-up", (0.5, 0.6)),
    Photo("instruments", "guitar", "photo-1567663711269-0351025d18a8", U + "OT-tVcdZUMw",
          "Arthur Ogleznev", "Hands on an electric guitar under blue stage light", (0.5, 0.5)),
    Photo("instruments", "violin", "photo-1566913485242-694e995731b4", U + "YY3ijZa2lGQ",
          "Joel Timothy", "Violinist's hands on the strings and bow", (0.5, 0.5)),
    Photo("instruments", "drums", "photo-1524230659092-07f99a75c013", U + "MjIMc6uhwrE",
          "Josh Sorenson", "Drummer's sticks hitting a drum kit", (0.45, 0.5)),
    Photo("instruments", "bass", "photo-1462965326201-d02e4f455804", U + "closeup-photo-of-person-playing-bass-Fx5rrxSaUtI",
          "freestocks", "Close-up of hands playing a bass guitar", (0.5, 0.5)),
    Photo("instruments", "vocals", "photo-1511671782779-c97d3d27a1d4", U + "Y20JJ_ddy9M",
          "israel palacio", "Vintage microphone in warm bokeh light", (0.4, 0.5)),
    Photo("instruments", "flute", "photo-1638317037996-f86e745cf657", U + "hz3g5dxWS30",
          "Ani Adigyozalyan", "Hands playing a flute against a black background", (0.5, 0.45)),
    Photo("instruments", "saxophone", "photo-1629907451365-6731862a0d32", U + "brass-saxophone-in-black-background-0h2F-Ib2Zdo",
          "benjamin lehman", "Brass saxophone against a black background", (0.5, 0.5)),
    Photo("instruments", "trumpet", "photo-1511192336575-5a79af67a629", U + "person-playing-trumpet-during-night-time-A10y2Eq7OHY",
          "Chris Bair", "Trumpet player at night in warm light", (0.45, 0.45)),
    Photo("instruments", "cello", "photo-1532956985363-fb868d867e67", U + "veCoBypas4A",
          "Adi Goldstein", "Cellist's hands and bow on a cello", (0.5, 0.55)),

    # Cover tiles (trending fallbacks, competitions, challenges, exercises)
    Photo("covers", "laser-rig", "photo-1573339887617-d674bc961c31", U + "black-laser-light-peTt3DTUhMQ",
          "Ben Tofan", "Stage lighting rig with a teal beam", (0.5, 0.5)),
    Photo("covers", "festival-night", "photo-1602369944529-c237ca143d09", U + "people-watching-concert-during-night-time-TVV49SQuQ_c",
          "Leslie del Moral", "Festival crowd facing a brightly lit stage at night", (0.5, 0.5)),
    Photo("covers", "mixer-blue", "photo-1594623930572-300a3011d9ae", U + "JhYnL-BiP18",
          "Aleksandr Popov", "DJ mixer glowing blue in the dark", (0.5, 0.5)),
    Photo("covers", "dj-outdoor", "photo-1618409698966-6caa2b95733a", U + "SP6vKjbUic0",
          "Michael Benz", "DJ's hands on a controller at an outdoor party", (0.5, 0.6)),
    Photo("covers", "mic-violet", "photo-1485579149621-3123dd979885", U + "OKLqGsCT8qs",
          "Matt Botsford", "Vintage silver microphone against a violet background", (0.65, 0.5)),
    Photo("covers", "headphones", "photo-1585298723682-7115561c51b7", U + "oXXc-s5nNy8",
          "Sebastian Banasiewcz", "Headphones on black, black and white", (0.5, 0.5)),
    Photo("covers", "piano-mono", "photo-1561014816-50ce5acb5e73", U + "grayscale-photography-of-piano-cHUBZFjY13g",
          "Amir Doreh", "Piano keys in black and white", (0.5, 0.5)),
    Photo("covers", "green-crowd", "photo-1629276301820-0f3eedc29fd0", U + "6F5ct471oRk",
          "Diane Picchiottino", "Guitarist and raised hands in green stage light", (0.5, 0.45)),
    Photo("covers", "guitar-mono", "photo-1591466581460-97103ca67533", U + "person-playing-guitar-grayscale-photo-8x_Ki1pdn0A",
          "Rahul Viswanath", "Hand on a guitar neck, black and white", (0.5, 0.5)),
    Photo("covers", "sax-mono", "photo-1615841192148-e87cc3fad736", U + "grayscale-photo-of-person-playing-saxophone-vAOzkqTOpaU",
          "Ayoola Salako", "Saxophonist's hands on the keys, black and white", (0.5, 0.5)),
    Photo("covers", "trumpet-mono", "photo-1698912237019-3a2b25399dec", U + "a-person-playing-a-trumpet-in-a-black-and-white-photo-g52nSARKp48",
          "Gilles Gravier", "Hands on trumpet valves, black and white", (0.5, 0.5)),
    Photo("covers", "orchestra-mono", "photo-1488630228244-bcdf33562a43", U + "VEOk8qUl9DU",
          "Arindam Mahanta", "Orchestra on a theatre stage, black and white", (0.5, 0.55)),
    Photo("covers", "club-beams", "photo-1657208431551-cbf415b8ef26", U + "teal-and-purple-nightclub-spotlights-QOajY0MNp8Y",
          "Scarlett Alt", "Teal and purple spotlights cutting through haze", (0.5, 0.5)),
    Photo("covers", "acoustic-dark", "photo-1647265194908-6815badcc397", U + "a-close-up-of-an-acoustic-guitar-on-a-black-background-kyCFXYIO0LA",
          "Harshveen Kalsi", "Acoustic guitar on a black background", (0.5, 0.5)),
    Photo("covers", "violin-dark", "photo-1723404058975-4f36b6f4ea6c", U + "vwJrH7A3ptM",
          "Raymond Petrik", "Violin and bow on a black background", (0.5, 0.5)),
    Photo("covers", "drums-spot", "photo-1639274032746-22a80d3f6636", U + "ibHyRkRU7t8",
          "Junseong Lee", "Drum kit under a spotlight, black and white", (0.5, 0.6)),
    Photo("covers", "red-silhouette", "photo-1751042322270-4c9abaf0ee60", U + "ek2R4dOGPsI",
          "Karsten Winegeart", "Lone figure on a stage under red light", (0.5, 0.5)),
    Photo("covers", "sax-blue", "photo-1634509507978-237c1dbc1505", U + "a-silhouette-of-a-man-playing-a-saxophone-zAPbXrhIfTU",
          "Gracious Adebayo", "Saxophonist in silhouette against a blue sky", (0.5, 0.5)),
    Photo("covers", "horn-section", "photo-1415201364774-f6f0bb35f28f", U + "person-playing-saxophone-dBWvUqBoOU8",
          "Jens Thekkeveettil", "Horn section playing saxophones in warm stage light", (0.4, 0.5)),
    Photo("covers", "stage-guitar", "photo-1464375117522-1311d6a5b81f", U + "gioH4gHo0-g",
          "Marcus Neto", "Guitarist on stage facing a blue-lit crowd", (0.45, 0.5)),
    Photo("covers", "violin-studio", "photo-1472312656035-eeef4726de6c", U + "uqKyeMaaAOQ",
          "Baher Khairy", "Violin and bow lit against black", (0.5, 0.5)),
    Photo("covers", "mic-spot", "photo-1507676385008-e7fb562d11f8", U + "dtqlaz4HyHw",
          "Brunxs", "Microphone in a pool of blue stage light", (0.5, 0.6)),
    Photo("covers", "hands-up", "photo-1558342706-2140d4e3c357", U + "silhouette-photography-of-concert-TGV7pZMzCb4",
          "Jerome", "Raised hands in silhouette at a concert", (0.5, 0.45)),

    # Page banners and split-layout images
    Photo("scenes", "login", "photo-1623517272043-cae1572afc96", U + "IzwvpT7gGgU",
          "Steven Erixon", "Singer in silhouette at a microphone", (0.45, 0.5), PORTRAIT),
    Photo("scenes", "register", "photo-1694720274936-298495c4dc8a", U + "sedlpOMZ1oU",
          "Robert Arnar", "Performer in silhouette in front of a stage spotlight", (0.5, 0.45), PORTRAIT),
    Photo("scenes", "not-found", "photo-1681149341674-45fd772fd463", U + "a-photo-of-a-spot-light-on-a-stage-FU_AO3Al_iQ",
          "Roberto Rendon", "A single spotlight on a stage above the crowd", (0.5, 0.4), PORTRAIT),
    Photo("scenes", "dashboard", "photo-1690460814053-5906ac3e90cd", U + "Vc4MjbuzTvY",
          "Vitalii Khodzinskyi", "Drum kit on a stage in beams of light", (0.5, 0.45)),
    Photo("scenes", "practice", "photo-1504960868016-9a59a5172321", U + "jmmTlAPtNw8",
          "Daniel Wirtz", "Guitarist seated alone on a dark stage, black and white", (0.5, 0.5)),
    Photo("scenes", "studio", "photo-1543510616-a4025b9c1434", U + "ILybAzFjn5c",
          "Oleg Ivanov", "Singer at a condenser microphone in a studio", (0.5, 0.4)),
    Photo("scenes", "competitions", "photo-1729553199933-c897fea4f41f", U + "a-large-crowd-of-people-in-a-dark-room-9lUGIJsf9iw",
          "Bennie Bates", "Crowd under sweeping blue concert lights", (0.5, 0.45)),
    Photo("scenes", "leaderboard", "photo-1577648875929-894904f7b051", U + "crowd-in-front-of-stage-Ke6Pr-9A2ac",
          "A J.", "Crowd in front of a blazing stage light show", (0.5, 0.4)),
    Photo("scenes", "challenges", "photo-1708961465136-e24550f3acd5", U + "mHc6j2qh13Y",
          "Vitalii Khodzinskyi", "Drum kit alone in a spotlight on an empty stage", (0.5, 0.5)),
    Photo("scenes", "social", "photo-1723743807556-30d654464fc9", U + "a-large-crowd-of-people-at-a-concert-qZyZmfAQyTQ",
          "Negley Stockman", "Festival crowd in front of an open-air stage at dusk", (0.5, 0.5)),
    Photo("scenes", "profile", "photo-1657208431551-cbf415b8ef26", U + "teal-and-purple-nightclub-spotlights-QOajY0MNp8Y",
          "Scarlett Alt", "Teal and purple spotlights cutting through haze", (0.5, 0.5)),

    # Empty states
    Photo("empty-states", "performances", "photo-1664587534303-67fda298c180", U + "a-guitar-leaning-against-a-wall-6D0_Y72T-TI",
          "Roger Ce", "Bass guitar leaning against a wall in window light", (0.5, 0.55)),
    Photo("empty-states", "analysis", "photo-1527261834078-9b37d35a4a32", U + "QrqeusbpFMM",
          "Matthias Wagner", "Microphone on a stand, waiting", (0.5, 0.5)),
    Photo("empty-states", "competitions", "photo-1509782642997-4befdc4b21c9", U + "rM5ZHrQvUCc",
          "Rodrigo Ruiz", "Concert hall seen from the balcony", (0.5, 0.55)),
    Photo("empty-states", "practice", "photo-1701749059090-ac8afdba7b44", U + "Ro7BTZEuqwE",
          "Ria Nurul Kamariah", "Violin resting on sheet music", (0.5, 0.5)),
    Photo("empty-states", "leaderboard", "photo-1573603088895-d399fbee9653", U + "acoustic-guitar-on-sofa-ZIbrlLp63PY",
          "Leandro Mazzuquini", "Acoustic guitar resting on a sofa", (0.55, 0.6)),
    Photo("empty-states", "social", "photo-1599855129764-f4cc28295202", U + "q7ZfVmvB49c",
          "Jason Leung", "Headphones on a dark table", (0.5, 0.5)),
    Photo("empty-states", "generic", "photo-1514213949578-58fe7b8ff146", U + "KYnWHy3hMk0",
          "Rajesh Kavasseri", "Flute resting on sheet music in warm light", (0.5, 0.5)),
]

# Manifest keys used by the app (src/utils/images.js).
MANIFEST_GROUP = {"hero": "hero", "genres": "genres", "instruments": "instruments", "covers": "covers",
                  "empty-states": "emptyStates", "scenes": "scenes"}
LIST_GROUPS = {"hero", "covers"}


def download(photo: Photo, width: int) -> Image.Image:
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / f"{photo.photo_id}-{width}.jpg"
    if not cached.exists():
        url = f"https://images.unsplash.com/{photo.photo_id}?w={width}&q=90&fm=jpg"
        request = urllib.request.Request(url, headers={"User-Agent": "MusicMash image build"})
        with urllib.request.urlopen(request, timeout=120) as response:
            cached.write_bytes(response.read())
    return Image.open(cached).convert("RGB")


def crop_to(img: Image.Image, width: int, height: int, focus: tuple[float, float]) -> Image.Image:
    """Scale so the image covers width x height, then crop around the focus point."""
    scale = max(width / img.width, height / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = min(max(round(resized.width * focus[0] - width / 2), 0), resized.width - width)
    top = min(max(round(resized.height * focus[1] - height / 2), 0), resized.height - height)
    return resized.crop((left, top, left + width, top + height))


def editorial_tone(img: Image.Image) -> Image.Image:
    """Slightly desaturated and dimmed, so photos sit quietly on the dark page."""
    return ImageEnhance.Brightness(ImageEnhance.Color(img).enhance(0.82)).enhance(0.94)


def encode_webp(img: Image.Image, max_kb: int) -> bytes:
    """Highest WebP quality (85 down to 40) that fits within max_kb."""
    for quality in range(85, 39, -5):
        buffer = io.BytesIO()
        img.save(buffer, "WEBP", quality=quality, method=6)
        if buffer.tell() <= max_kb * 1024:
            return buffer.getvalue()
    raise ValueError(f"cannot fit within {max_kb} KB")


def main() -> int:
    manifest: dict = {key: ([] if group in LIST_GROUPS else {}) for group, key in MANIFEST_GROUP.items()}
    credits = []
    total = 0
    for photo in PHOTOS:
        width, height, max_kb = photo.size or SIZES[photo.group]
        source = download(photo, 2400 if max(width, height) > 700 else 1200)
        image = editorial_tone(crop_to(source, width, height, photo.focus))
        data = encode_webp(image, max_kb)
        out = PUBLIC / photo.group / f"{photo.name}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        total += len(data)

        entry = {"src": f"/images/{photo.group}/{photo.name}.webp", "alt": photo.alt, "width": width, "height": height}
        key = MANIFEST_GROUP[photo.group]
        if photo.group in LIST_GROUPS:
            manifest[key].append(entry)
        else:
            manifest[key][photo.name.replace("-", "")
                          if photo.group == "genres" else _camel(photo.name)] = entry
        credits.append({"file": entry["src"], "photographer": photo.photographer, "source": photo.page,
                        "licence": "Unsplash License", "alt": photo.alt})
        print(f"{entry['src']:<48} {len(data) / 1024:6.1f} KB  {photo.photographer}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (PUBLIC / "credits.json").write_text(json.dumps(credits, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_credits_md(credits)
    print(f"\n{len(PHOTOS)} images, {total / 1024 / 1024:.2f} MB total")
    return 0


def _camel(name: str) -> str:
    head, *rest = name.split("-")
    return head + "".join(part.capitalize() for part in rest)


def write_credits_md(credits: list[dict]) -> None:
    lines = [
        "# Photo credits",
        "",
        "Every photograph in this folder is from [Unsplash](https://unsplash.com) and used under the",
        "[Unsplash License](https://unsplash.com/license): free to use, including commercially, without",
        "permission. Attribution isn't required, but we credit every photographer.",
        "",
        "Files are cropped, slightly desaturated and converted to WebP by",
        "`scripts/images/process_images.py`, which also regenerates this file.",
        "",
        "| File | Photographer | Source | Licence |",
        "|---|---|---|---|",
    ]
    lines += [f"| `{c['file']}` | {c['photographer']} | [Unsplash]({c['source']}) | {c['licence']} |" for c in credits]
    (PUBLIC / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
