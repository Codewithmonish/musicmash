# Running MusicMash locally (Windows)

Everything below runs from the **repo root** in PowerShell. It starts all three services,
creates a demo analysis through the real API, and screenshots the result in a real browser.

| Service | Port | Started from |
|---|---|---|
| Spring Boot backend (auth, uploads, `/api/ai/**` proxy) | 8081 | `music-mash-backend` via `mvn spring-boot:run` |
| FastAPI AI service | 8000 | `music-mash-ai\.venv` via `uvicorn` |
| Vite frontend | 5173 | `music-mash-frontend` via `npm run dev` |

## One-time setup

1. **MySQL 8** running on `localhost:3306` with a `music_mash` database
   (Windows service `MySQL80`: `Start-Service MySQL80` in an admin shell).
2. **Spring secrets:** copy `music-mash-backend\.env.example` to `music-mash-backend\.env`
   and fill in `DB_USERNAME`, `DB_PASSWORD` and `JWT_SECRET`. Never commit it.
3. **AI service venv** (Python 3.12+; first install downloads a few hundred MB):
   ```powershell
   cd music-mash-ai
   python -m venv .venv
   .venv\Scripts\pip install -r requirements-dev.txt
   .venv\Scripts\python -m playwright install chromium
   cd ..
   ```
4. **Frontend packages:** `cd music-mash-frontend; npm install; cd ..`
5. Optional: `music-mash-frontend\.env` with `VITE_API_URL=http://localhost:8081/api`
   (the `/api` suffix may be left off; `api.js` adds it).

> **First analysis after a fresh venv takes a few minutes.** librosa compiles its numba
> kernels on first use and caches them in the venv. Later runs take seconds.

## Start / stop

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev_start.ps1
powershell -ExecutionPolicy Bypass -File scripts\dev_stop.ps1
```

`dev_start.ps1`:
- loads `music-mash-backend\.env` into its own process environment without printing any
  names or values
- refuses to start if MySQL isn't reachable or a port is busy
- points the AI service's `UPLOAD_DIR` at `music-mash-backend\uploads`, so both services
  share the upload folder
- waits until all three answer

Logs go to `logs\spring.log`, `logs\fastapi.log` and `logs\vite.log` (plus `*.err.log`).
`dev_stop.ps1` kills the recorded processes and anything still listening on 8081/8000/5173.

## Demo data

```powershell
music-mash-ai\.venv\Scripts\python scripts\demo_seed.py
```

This generates two recordings of the same 24-note tune (120 BPM, 12 s):
- **the reference**, played perfectly
- **your take**, with planted mistakes:
  - the E4 at 1 s is 40 cents sharp
  - seconds 4–8 are 35 cents sharp
  - seconds 8–12 are 20% faster

It then goes through the real Spring API, exactly as the app would:
1. As `demo@musicmash.local` (password `demo-pass-123`, a local dev account): uploads the
   take, creates a performance and runs the AI analysis.
2. As `host@musicmash.local` (role HOST): uploads the reference and registers it as a
   reference track. Later runs reuse it.
3. As the demo user again: compares the analysed take with the reference.

It prints the measured notes, scores and problem sections, then the page URL, e.g.
`http://localhost:5173/ai-analysis/5?comparison=1`. Log in there as the demo user.

## Screenshots (Playwright)

**Playwright** is a browser-automation library: a script opens a real Chromium, clicks and
types like a user, and saves screenshots. We use it only as a dev tool to check the UI.
It is not part of the running app.

```powershell
music-mash-ai\.venv\Scripts\python scripts\e2e_screenshot.py            # headless
music-mash-ai\.venv\Scripts\python scripts\e2e_screenshot.py --headed   # watch it run
```

It logs in through the login form and opens the demo analysis. Output goes to
`screenshots\` (gitignored):

| File | What it shows |
|---|---|
| `ai-analysis-full.png` | the whole AI Analysis page |
| `pitch-chart.png` | the pitch-curve card |
| `pitch-chart-hover.png` | the chart with the tooltip on the sharp E4 |
| `comparison.png` | the "How close am I to the original?" card: similarity, timeline, tempo chart |
| `comparison-detail.png` | the same card after clicking the first problem section |
| `console.txt` | browser console errors, page errors and failed API calls (`no errors` when clean) |

The script exits with code 1 if the chart or the comparison timeline doesn't render, the
sharp-note tooltip isn't found, or anything was logged in `console.txt`.

## After a schema change

The AI service's SQLite tables are created once and never altered. After pulling a
change to its models, stop the services and recreate the dev database (this deletes all
stored analyses):

```powershell
music-mash-ai\.venv\Scripts\python scripts\reset_dev_db.py
```

## Tests

```powershell
cd music-mash-ai;      .venv\Scripts\python -m pytest;  cd ..   # AI service
cd music-mash-backend; mvn test;                        cd ..   # Spring contract tests
cd music-mash-frontend; npm run build;                  cd ..   # frontend must build
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `MySQL is not reachable on localhost:3306` | Start the MySQL80 service. |
| `Port 8081 is already in use` | `scripts\dev_stop.ps1`, or close the other app on that port. |
| Analysis FAILED: "not found in the upload directory" | The AI service must run with `UPLOAD_DIR` = Spring's upload folder; start it through `dev_start.ps1`. |
| AI page says a column doesn't exist | Run `scripts\reset_dev_db.py` (see above). |
| Script output shows `UnicodeEncodeError` | The scripts force UTF-8 output; in your own scripts use `$env:PYTHONIOENCODING='utf-8'`. |
