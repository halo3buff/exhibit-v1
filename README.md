# Exhibit

A museum-grade art archive and curation platform. Browse 100,000+ artworks from public institution APIs, organize them into personal exhibits on an infinite canvas, and explore collections through a curated wander mode.

---

## Features

- **Archive** — Browse a unified index of works from the Met, Rijksmuseum, Art Institute of Chicago, V&A, Smithsonian, NYPL, and more. Filter by category and source institution.
- **Gallery** — Editorial and scatter-layout views with year-range filtering and source toggles.
- **Exhibits** — Create named collections. Arrange artworks, freehand notes, and connection edges on an infinite canvas with pan, zoom, and multi-select.
- **Wander Mode** — Algorithmically curated drift through the archive seeded by a random walk.
- **Image Proxy** — All external images are routed through a local proxy with three resolution tiers (400, 800, 1200px) and an on-disk cache.
- **Auth** — Session-based authentication with httpOnly cookies.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | TailwindCSS v4 + CSS custom properties |
| Animation | Framer Motion 12 |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Auth | Custom session tokens, httpOnly cookies |
| Language | JavaScript (app layer), TypeScript (pipeline scripts) |
| Package manager | pnpm |

**Fonts:** Barlow Condensed (display headers), DM Sans (body), DM Mono (labels/metadata)

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.js                 # Archive (home) — browse all works
│   ├── gallery/page.js         # Gallery — editorial & scatter views
│   ├── exhibits/page.js        # Exhibit list
│   ├── exhibits/[id]/page.js   # Infinite canvas editor
│   ├── archive/[id]/page.js    # Artwork detail page
│   ├── wander/page.js          # Wander mode
│   ├── login/ & register/      # Auth pages
│   ├── error.js                # Root error boundary (per-segment error.js in each route)
│   └── api/                    # API routes
│       ├── exhibits/[id]/      # CRUD for items, notes, strokes, edges
│       ├── search/             # Full-text artwork search
│       └── img/                # Image proxy (sizes: 400, 800, 1200)
│
├── components/
│   ├── layout/                 # TopNav, AppShell, ErrorFallback
│   ├── canvas/                 # Infinite canvas primitives
│   ├── gallery/                # Grid layouts, filters, tooltips
│   ├── exhibits/               # Create modal, preview panel, SaveToExhibit
│   └── auth/                   # Auth layout wrapper
│
├── hooks/                      # useDebounce, useScatterLayout
├── lib/                        # Shared logic
│   ├── db.js                   # withDb(), requireExhibitOwner(), touchExhibit()
│   ├── auth.js                 # Session helpers
│   ├── schemas.js              # Zod schemas + parseBody() for all write routes
│   ├── images.js               # imgUrl(), hqUrl() — always proxy external images
│   ├── canvas.js               # Transform math, hit testing, path utilities
│   └── random.js               # Seeded PRNG (mulberry32, Fisher-Yates)
│
├── harvester/                  # Typed adapters for each museum API
│   └── adapters/               # artic, met, rijks, smithsonian, va, …
│
└── pipeline/                   # ETL scripts (TypeScript)
    ├── run.ts                  # Unified runner: pnpm pipeline:run [--source] [--stage]
    ├── 01-harvest/             # Pull raw JSON from each institution API
    ├── 02-transform/           # Normalize to internal schema
    ├── 03-load/                # Insert into SQLite, deduplicate
    └── maintenance/            # Operational scripts (reclassify, prewarm, etc.)

db/migrations/                  # Ordered SQL migration files (applied via: pnpm migrate)
scripts/                        # One-off utility scripts (not imported by app)
data/                           # Pipeline workspace (gitignored)
public/manifests/               # Generated source manifests (gitignored)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Installation

```bash
git clone https://github.com/halo3buff/exhibit.git
cd exhibit
pnpm install
```

### Environment

Copy the example and fill in your API keys:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `RIJKS_API_KEY` | Rijksmuseum API |
| `SMITHSONIAN_API_KEY` | Smithsonian Open Access |
| `HARVARD_API_KEY` | Harvard Art Museums |
| `EUROPEANA_API_KEY` | Europeana |
| `NEXT_PUBLIC_NYPL_API_KEY` | New York Public Library Digital Collections |
| `GEMINI_API_KEY` | Used for artwork classification (optional) |

> All institution APIs listed above are free. Register at each provider's developer portal.

### Database

The SQLite database is not committed. Run the ETL pipeline to populate it, or create a blank schema:

```bash
# Run the full harvest → transform → load pipeline for one source
npx tsx src/pipeline/01-harvest/harvest-met.ts
npx tsx src/pipeline/02-transform/02-transform.ts
npx tsx src/pipeline/03-load/03-load.ts
```

### Database migrations

Schema changes are tracked in `db/migrations/`. Apply any unapplied migrations with:

```bash
pnpm migrate
```

The app also bootstraps the schema automatically on first start via `ensureSchema()`, so this step is optional for new local setups.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Design System

Exhibit uses a Japanese-minimalist (wabi-sabi / Swiss grid) visual language with a strict set of constraints:

- **No border-radius** on any interactive element — hard edges only
- **No decorative shadows, gradients, or divider lines**
- **CSS custom properties exclusively** — no Tailwind color utilities
- **Three typefaces, three roles:** Barlow Condensed for headers, DM Sans light for body, DM Mono for all metadata and labels

Core tokens (`--bg`, `--fg`, `--fg-muted`, `--border`, `--accent`) are defined in `src/app/globals.css`.

---

## Data Sources

| Institution | API |
|---|---|
| The Metropolitan Museum of Art | [metmuseum.org/api](https://metmuseum.github.io/) |
| Art Institute of Chicago | [api.artic.edu](https://api.artic.edu/docs/) |
| Rijksmuseum | [data.rijksmuseum.nl](https://data.rijksmuseum.nl/object-metadata/api/) |
| Victoria and Albert Museum | [api.vam.ac.uk](https://developers.vam.ac.uk/) |
| Smithsonian Institution | [edan.si.edu](https://edan.si.edu/openaccess/apidocs/) |
| New York Public Library | [api.repo.nypl.org](https://api.repo.nypl.org/) |
| Europeana | [api.europeana.eu](https://pro.europeana.eu/page/apis) |
| Harvard Art Museums | [api.harvardartmuseums.org](https://github.com/harvardartmuseums/api-docs) |

All image URLs are proxied through `/api/img` and cached on disk. No artwork images are stored in this repository.

---

## License

MIT
