# MusicMash design system

**A concert darkroom.** The page is a near-black stage, and photography and cover art carry all
the colour. The interface around them stays flat, achromatic and quiet.

This system uses the *design language* described in [DESIGN.md](DESIGN.md): tokens, layout
rhythm and component styles. DESIGN.md is a reference document about another product.
MusicMash uses none of that product's name, logo, wordmark or brand orange.

Source of truth in code:
- `music-mash-frontend/tailwind.config.js`: tokens as Tailwind classes. The theme *replaces*
  Tailwind's defaults, so off-system colours, radii, shadows and gradients don't exist.
- `music-mash-frontend/src/styles/index.css`: the same tokens as CSS variables.
- `/styleguide` (dev builds only): every token and component, rendered.

## Colour

| Token | Value | Tailwind | Use |
|---|---|---|---|
| Obsidian | `#121212` | `obsidian` | Page background (surface 0) |
| Graphite | `#303030` | `graphite` | Inputs, panels, raised cards (surface 1) |
| Mid Gray | `#666666` | `mid-gray` | Hover tier, dividers (surface 2) |
| Fog | `#999999` | `fog` | Muted text, ghost buttons, inactive dots |
| Silver | `#cccccc` | `silver` | Hairlines on light surfaces, primary-button hover |
| Bone | `#f2f2f2` | `bone` | The one light band per page (e.g. the landing-page product band) |
| White | `#ffffff` | `white` | Text, headings, **primary buttons** |
| Signal Blue | `#699fff` | `signal` | Inline links, the live dot, one accent in generated covers. **Never a button fill.** |

**Status colours are data, not decoration.** They are used only where they encode a
measurement: pitch-chart bands, comparison problem sections and form errors. They always
appear with a text label or symbol.

| Token | Value | Tailwind |
|---|---|---|
| Good | `#0ca30c` | `status-good` |
| Warning | `#fab219` | `status-warning` |
| Critical | `#d03b3b` | `status-critical` |

## Typography

One family: **Inter** (Google Fonts, weights 100 / 400 / 600 / 700). It substitutes for the
Söhne family in DESIGN.md.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-display` | 60 / 1.00 | **100** | Hero headlines only (weight 100 is never used smaller than this) |
| `text-heading` | 36 / 1.33 | 100 or 600 | Page titles, the light-band heading (100) |
| `text-heading-sm` | 28 / 1.29 | 600 | Section titles inside pages, big numbers |
| `text-subheading` | 22 / 1.27 | 600 | Section headers, card titles |
| `text-body` | 17 / 1.41 | 400 | Hero subheads, lead paragraphs |
| `text-body-sm` | 14 / 1.43 | 400 / 600 | Default UI text, tile titles (600), artists (400, Fog) |
| `text-caption` | 12 / 1.41 | 400 / 600 | Metadata, axis labels, badges. The only size below 14px, and never for body text. |

Weight 700 is reserved for button labels and strong CTAs.

## Spacing, radius, elevation

- **Spacing:** 4px base. Tailwind's default scale already equals every DESIGN.md token:
  `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40, `12`=48, `16`=64, `24`=96,
  plus `45`=180px.
- **Layout:** content column max 1200px (`.page` / `max-w-page`), 16px gutters on phones and
  24px from `sm`. Sections are 64px apart. Card padding is 16px; element gap is 8px.
- **Radius:** `rounded` = **4px** for buttons, inputs, badges and images. Cards are 0px.
  `rounded-full` exists only for dots and status indicators. There are no pills and no larger radii.
- **Elevation:** there is no shadow stack. Boundaries use the inset hairline
  `shadow-subtle` (`rgba(18,18,18,0.1) 0 0 0 1px inset`) and the gray steps
  Obsidian → Graphite → Mid Gray. No drop shadows, glows, gradients or backdrop blur.
  The one exception is the dark scrim over hero photos (`.hero-scrim`), which keeps text
  legible.

## Components (`src/components/ui`)

| Component | Rules |
|---|---|
| `Button` | `primary`: white fill, Obsidian text, 700. `ghost`: Fog text that turns white on hover. `subtle`: Graphite. `inverse`: Obsidian fill, used on the Bone band. 4px corners, no shadow. |
| `Input` | Graphite, 4px, inset hairline, Fog placeholder. Focus lightens to Mid Gray and shows the global white outline. Errors use a red hairline plus a dot and text. |
| `Card` | `panel` (Graphite + hairline + 16px padding) or `bare`. 0px radius. |
| `Badge` | 4px, 12px semibold. The `dot` prop adds a status or live dot next to the text. |
| `TrackCard` | Bare 1:1 cover (4px), 16px gap, title 14/600 white, artist 14/400 Fog. On hover the art zooms to 1.03 and a white play mark appears. |
| `TileGrid` / `TileItem` | 6 → 3 → 2 columns, 16px gaps, staggered reveal |
| `SectionHeader` | 22px title, Fog description, Signal Blue text link |
| `Modal` | Graphite panel, optional cover image, white CTA, quick scale-in, flat Obsidian backdrop |
| `notify()` toasts | Graphite panel with an optional square cover image; error toasts add a red dot |
| `Skeleton` | Graphite pulse blocks |
| `EmptyState` | Always image-led: an editorial photo (or a generated cover), title, one line and an action |
| `CoverImage` / `GeneratedCover` | Lazy images with set dimensions. A missing or broken image becomes a deterministic grayscale pattern with one Signal Blue accent. |
| `EqualizerBars` | White animated bars for playing/processing states |
| `ProgressRing` | Graphite track with a white arc |
| `Wordmark` | Four white equalizer bars on a Signal Blue baseline, plus "MusicMash" in 17/600 |

## Imagery

- Editorial, dark, slightly desaturated photographs: stage light, street performers, DJs,
  players and singers, studios and crowds. All are free-licensed (Unsplash License) and
  self-hosted as WebP. Every file is credited in `public/images/CREDITS.md` and on the
  in-app `/credits` page.
- No identifiable celebrities, brand logos or real album covers. Faces are acceptable only
  when the person isn't recognisable as a public figure.
- Cover art is 1:1 with 4px corners. Hero images are full-bleed with the dark scrim.
- Hierarchy: hero photo, then tiles, then the product mockup, then text.

## Motion

framer-motion with `reducedMotion="user"`, plus a global CSS rule that stops animations
when `prefers-reduced-motion` is set.
- Page transitions: fade and 8px rise, 300ms
- Tile reveal: 50ms stagger
- Image hover: zoom to 1.03 with the play mark
- Popups: scale from 0.94, 180ms
- Equalizer bars for playing/processing; skeletons while loading

Energy comes from imagery and motion, never from extra colours.

## Accessibility

- Text contrast is AA: white or Fog on Obsidian/Graphite, and Obsidian on Bone.
- Every focusable element shows a **2px white outline** (Obsidian on the light band).
- Every image has alt text. Purely decorative ones use `alt=""`.
- Status is never shown by colour alone.
- All interactive elements are reachable and operable by keyboard.

## Do / don't (MusicMash)

- **Do** use white for every primary action, and keep Signal Blue for links and the live dot.
- **Do** let photography supply the colour; keep the chrome Obsidian/Graphite/Fog/White.
- **Don't** use the reference product's orange (`#ff5500`), name, logo or waveform mark.
- **Don't** add gradients, glows, blur, drop shadows, pill shapes or radii above 4px.
- **Don't** show any number that isn't measured. If the API has no data, show an
  image-led empty state.
