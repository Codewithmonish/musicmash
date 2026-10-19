# MusicMash frontend

React 18 + Vite + Tailwind CSS. A dark, flat interface where photography and cover art carry the
colour; the design system is documented in
[docs/MUSICMASH_DESIGN_SYSTEM.md](../docs/MUSICMASH_DESIGN_SYSTEM.md). Overview and screenshots:
[main README](../README.md).

The app only talks to the Spring backend (`/api/...`). In the one-click app it is built with
`npm run build:app` and served by Spring at `http://localhost:8081`; in developer mode Vite serves
it on `http://localhost:5173` with hot reload.

```powershell
npm install
npm run dev          # http://localhost:5173 (expects Spring on 8081, see .env.example)
npm run build        # production build into dist/
npm run build:app    # build with a relative /api base, used by scripts/build_app.ps1
```

## Where things are

| Path | |
|---|---|
| `src/pages/` | One folder per page (landing, auth, dashboard, studio, AI analysis, practice, competitions, ...) |
| `src/components/ui/` | Design-system components: Button, Input, Card, Badge, TrackCard, Modal, Toast, Skeleton, Stat, ... |
| `src/components/ai/` | Pitch contour chart, reference comparison timeline, AI coach |
| `src/components/practice/` | Metronome, tuner, practice heatmap, scored session runner |
| `src/audio/` | Web Audio: recorder with live meter, WAV encoder and resampler, YIN pitch detector, lookahead metronome |
| `public/images/` | Unsplash photos (WebP), credited in `CREDITS.md` |

`/styleguide` (development builds only) shows every component.
