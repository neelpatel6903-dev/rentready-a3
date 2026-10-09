# RentReady

RentReady tells a Melbourne renter how strong their application looks **before**
they apply. They answer a few questions about themselves, pick a home, enter
their income and savings, and get back a score out of 100 with a plain-English
breakdown, any agent-style caps that applied, and tips for improving their
chances. Every check is saved, so they can compare several homes over time.

The flow: **Sign in -> About you -> Choose home -> Your finances -> Result.**

## Tech stack

| Layer | What it is |
| --- | --- |
| Frontend | React 19 + Vite 8, Tailwind CSS 4, `lucide-react`, `motion`. Linted with oxlint. |
| Backend | Python FastAPI, deployed as a **single** Vercel serverless function. |
| Data | Supabase (Postgres + Auth). Row Level Security is on for every table. |
| Hosting | Vercel serves the built React app (`dist/`) and the `/api` function from one origin. |

The backend talks to Supabase over plain HTTP with `httpx` (the Auth API and
PostgREST) rather than the `supabase-py` SDK, which keeps the serverless bundle
small and the calls explicit.

The browser never touches Supabase. It only ever calls same-origin `/api`
routes through `src/api/client.js`, holding its own access token in
`sessionStorage` (per tab) and sending it as an `Authorization: Bearer` header.
The backend forwards that token to Supabase, so RLS policies apply as the
signed-in user and people can only ever read their own rows.

### The scoring model

One model, implemented twice on purpose:

- `src/utils/score.js` runs in the browser for live feedback (the affordability
  meter and the What-if card).
- `api/_lib/scoring.py` is the server port and the **source of truth** for any
  score that gets persisted.

Five weighted factors make up 100 points: Affordability 35, Employment 20,
Savings 20, Rental history 15, References 10. Two hard caps mirror real agents:
rent above 50% of income caps the score at 40, and savings below four weeks of
rent cap it at 50. Change the rules in **both** files together;
`tests/test_scoring.py` compares the Python output against a JSON fixture
generated from the JS version and fails if they drift.

## Folder structure

```
rentready-a3/
├── api/                     FastAPI backend, one Vercel function
│   ├── index.py             App entry: CORS, error handling, mounts all routers
│   ├── _lib/                Shared backend code
│   │   ├── config.py        The ONLY file that reads environment variables
│   │   ├── supabase.py      Async httpx client for Supabase Auth + PostgREST
│   │   ├── auth.py          Bearer token -> verified user (FastAPI dependencies)
│   │   ├── scoring.py       Python port of src/utils/score.js
│   │   └── validation.py    Field-level input validation
│   └── _routes/             One APIRouter per resource
│                            auth, account, profile, listings, assessments
├── src/                     React frontend
│   ├── App.jsx              Step state machine + form state
│   ├── api/client.js        Same-origin fetch wrapper (the only backend path)
│   ├── screens/             Login, AboutYou, ChooseHome, Finances, Result, MyChecks
│   ├── components/          Button, InputField, FormSection, Stepper, ScreenShell,
│   │                        CheckingScreen, WhatIfCard
│   ├── hooks/useAuth.js     Session bootstrap, login / signup / logout
│   ├── data/                options.js (dropdown choices), suburbs.js
│   └── utils/               score.js, validation.js, dates.js, geo.js
├── supabase/migrations/     0001_init.sql: schema, RLS policies, seeded listings
├── scripts/                 score_fixture.js, which regenerates the test fixture
├── tests/test_scoring.py    Proves the Python scorer matches score.js
├── vercel.json              Build to dist/, rewrite /api/:path* to api/index
├── requirements.txt         Python deps (Vercel detects FastAPI from this file)
└── package.json, vite.config.js, .env.example
```

The `_lib` and `_routes` directories are underscore-prefixed deliberately:
Vercel turns every plain `.py` file under `api/` into its own serverless
function, so the prefix keeps them out of the build and leaves `api/index.py`
as the only deployed function.

## Credentials and environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Your Supabase project URL. |
| `SUPABASE_ANON_KEY` | yes | The public anon key, used server-side only. |
| `APP_ORIGIN` | no | Frontend origin allowed by CORS in local dev. Defaults to `http://localhost:5173`. |

How they are kept safe:

- **Read in exactly one place.** `api/_lib/config.py` is the only file that
  touches `os.environ`. Nothing else in the backend reads configuration.
- **Never exposed to the browser.** They are not `VITE_`-prefixed, so Vite does
  not inline them into the client bundle. The frontend contains no
  `import.meta.env` usage at all - it has no secrets to leak.
- **Fail fast.** A missing variable raises `SettingsError` the first time it is
  used, so a misconfigured deploy fails loudly instead of silently.
- **Never committed.** `.gitignore` blocks `.env` and `.env.*`, with
  `.env.example` kept as the documented template.

`.env.example` documents the names and shapes. It is a template only and
nothing loads it, so set the real values in
**Vercel -> Project -> Settings -> Environment Variables** for production and
export them in your terminal for local runs.

> Note: the API reads `os.environ` directly and has no dotenv loader, so
> `.env.local` is **not** picked up by Python. Export the variables in the
> shell that starts uvicorn (see below). Vite does read `.env.local`, but the
> frontend needs no variables of its own.

## Running locally

You need Node 20.19+ (or 22.12+, per Vite's `engines` field) and Python 3.11+.

**1. Install frontend dependencies**

```bash
npm install
```

**2. Create the database**

Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor. It creates
the `listings`, `profiles` and `assessments` tables, enables RLS, and seeds the
eight sample homes.

**3. Set up the Python environment**

```bash
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**4. Export your credentials** in the shell that will run uvicorn:

```bash
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

```powershell
# Windows PowerShell
$env:SUPABASE_URL = "https://your-project-ref.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"
```

**5. Start the backend** (terminal 1)

```bash
uvicorn api.index:app --port 8000 --reload
```

**6. Start the frontend** (terminal 2)

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `127.0.0.1:8000`, so the
browser stays same-origin in development exactly as it does in production - no
CORS surprises, and no code differences between the two environments.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | oxlint over the frontend. |
| `python -m pytest tests/ -q` | Scoring parity and unit tests. |

To regenerate the scoring fixture after changing `score.js`, bundle it first:
`src/utils/score.js` imports `../data/options` without an extension, which
plain Node ESM cannot resolve.

```bash
node_modules/.bin/rolldown scripts/score_fixture.js --file scripts/score_fixture.bundle.mjs
node scripts/score_fixture.bundle.mjs
```

The bundle writes `scripts/score_fixture.json` in UTF-8 with `fs.writeFileSync`.
Do not generate it with a shell redirect: on Windows PowerShell that adds a BOM
and mangles the em-dashes, which breaks `json.loads()` in the test.

## Deploying to Vercel

`vercel.json` builds the React app into `dist/`, ships `api/**` alongside the
function via `includeFiles`, and rewrites `/api/:path*` to `/api/index` so
every API route resolves to the one FastAPI function. Set `SUPABASE_URL` and
`SUPABASE_ANON_KEY` in the Vercel dashboard and nothing else is needed: the
frontend and the API are served from the same origin, so CORS never applies in
production.

