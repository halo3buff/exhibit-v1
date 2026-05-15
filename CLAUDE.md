# Exhibit — Claude Code Context

## Project Purpose
Museum-grade art archive web app. Users can browse artworks from public APIs, 
create "exhibits" (curated collections), and explore via wander mode.

## Tech Stack
- Framework: Next.js 16 (App Router, `src/app/`)
- Styling: TailwindCSS v4 + CSS custom properties exclusively
- Animation: Framer Motion 12
- Database: better-sqlite3, SQLite WAL mode, two files: `artworks.db` (catalog, pipeline-owned) + `app.db` (user data, app-owned)
- Auth: Custom session-based (httpOnly cookies, `src/lib/auth.js`)
- Fonts: Cormorant Garamond (display), DM Sans (body), DM Mono (labels)
- Language: JS for app layer (.js), TypeScript for pipeline scripts (.ts)
- Module system: ESM ("type": "module" in package.json)

## File Placement Rules
- Pages → `src/app/<route>/page.js`
- API routes → `src/app/api/<route>/route.js`
- Feature components → `src/components/<feature>/<Name>.js`
  - Canvas components: `src/components/canvas/`
  - Gallery components: `src/components/gallery/`
  - Exhibit list components: `src/components/exhibits/`
  - Auth components: `src/components/auth/`
- Shared hooks → `src/hooks/<useName>.js`
- Shared logic → `src/lib/<module>.js`
- Pipeline scripts → `src/pipeline/` (TypeScript)
- Utility scripts → `scripts/` (not imported by the app)
- Client components MUST begin with `'use client';`

## Dev Commands
- Start dev: `pnpm dev` (or `npm run dev`)
- Build: `pnpm build`
- Check types (pipeline): `tsc --noEmit`
- Image proxy always: `/api/img?url=ENCODED_URL&size=N` (sizes: 400, 800, 1200)

## Navigation Structure
- **TopNav** (`src/components/layout/TopNav.js`) — fixed 44px bar, floats above all content, no border-bottom
  - Logo (red pinwheel mark + EXHIBIT wordmark) far left
  - Nav links (INDEX, GALLERY, EXHIBITS) far right — DM Mono, tracked uppercase, weight 400
  - Auth link (Sign In / Sign Out) rightmost
- **AppShell** (`src/components/layout/AppShell.js`) — adds `paddingTop: 44px` to all pages; hides nav on `/login` and `/register`
- **Sidebar is gone.** `SidebarContentCtx` still exists as a no-op — existing `useSidebarContent` calls are harmless
- **Category filter strip** — on archive (home) and gallery pages, fixed/sticky at `top: 44px`, 32px tall. Five categories with counts. DM Mono, no pills, no borders.
- **Collections/source strip** — on gallery page, sticky at `top: 76px`, 28px tall. Shows source institutions when a category is active.

## Design System — CRITICAL
This is a Japanese-minimalist (wabi-sabi/Swiss) design. EVERY pixel must follow these rules:

**NEVER:**
- Use `border-radius` on buttons, cards, or inputs (hard edges only)
- Use Tailwind color classes (`bg-blue-500`, `text-gray-400`) — CSS vars only
- Hardcode `#fff` or `#000` — use `var(--bg)` and `var(--fg)`
- Use `font-weight: 700` or `bold` outside of `var(--font-condensed)` headings — max body weight is 500
- Add decorative shadows, gradients, or divider lines/borders
- Forget `'use client'` on components using hooks or browser APIs

**ALWAYS:**
- Use design tokens: `var(--bg)`, `var(--fg)`, `var(--fg-muted)`, `var(--border)`, etc.
- Use DM Mono (`var(--font-mono)`) for ALL labels, metadata, counts, nav links
- Use DM Sans light (`var(--font-sans)`) for body/descriptions (weight 300-400)
- Use Barlow Condensed (`var(--font-condensed)`) for page headers and artwork titles — weight 700, all caps
- Use `cubic-bezier(0.16, 1, 0.3, 1)` for animations (spring easing)
- Account for 44px fixed nav: `calc(100vh - 44px)` for full-height pages
- Route all external images through `/api/img` via `imgUrl()` or `hqUrl()` from `@/lib/images`
- Page headers (ARCHIVE, COLLECTION, etc.) go top-right, smaller (`clamp(1.8rem, 3.5vw, 5rem)`), `var(--font-condensed)`

## Design Tokens (globals.css)
```css
--bg:          #e8e5de;   /* warm linen */
--bg-card:     #dedad2;
--bg-hover:    #d4d0c8;
--fg:          #1a1916;
--fg-muted:    rgba(26,25,22,0.52);
--fg-faint:    rgba(26,25,22,0.28);
--border:      rgba(26,25,22,0.07);
--border-md:   rgba(26,25,22,0.14);
--accent:      #e8312a;   /* red — logo only */
--nav-h:       44px;
--gutter:      64px;
```

## Database Pattern
Two SQLite files:
- **`artworks.db`** — artwork catalog only. Owned by the pipeline (`pnpm load`). Never touch from app code.
- **`app.db`** — user data (users, sessions, exhibits, exhibit_items, exhibit_notes, exhibit_strokes). Owned by the app.

`withDb()` opens `app.db` and ATTACHes `artworks.db` as `catalog`. Unqualified `artworks` table references resolve automatically to `catalog.artworks`.

All API routes use `withDb()` from `@/lib/db`. Never open `new Database()` directly in a route.

```js
import { withDb, requireExhibitOwner, touchExhibit } from '@/lib/db';

export async function GET(request, { params }) {
  return withDb(db => {
    const rows = db.prepare('SELECT ...').all();
    return Response.json({ data: rows });
  }, { readonly: true });
}

export async function POST(request, { params }) {
  const body = await request.json();
  return withDb(db => {
    requireExhibitOwner(db, params.id, userId);   // throws 403/404 Response on failure
    db.prepare('INSERT ...').run(...);
    touchExhibit(db, params.id);                  // bumps updatedAt
    return Response.json({ ok: true });
  });
}
```

**Helpers in `src/lib/db.js`:**
- `withDb(fn, { readonly })` — always closes DB in finally; sets WAL + foreign_keys on write connections
- `requireExhibitOwner(db, exhibitId, userId)` — throws 404/403 Response if check fails
- `requireExhibitAccess(db, exhibitId, userId)` — same but allows public exhibits
- `touchExhibit(db, exhibitId)` — bumps `updatedAt = datetime('now')`

**Exception:** `api/search/route.js` uses an intentional module-level singleton DB with aggressive
caching pragmas. Do not convert it to `withDb()`.

## Shared Utilities
- **Images:** `import { imgUrl, hqUrl } from '@/lib/images'` — never call external image URLs directly
- **Seeded PRNG:** `import { hashSeed, mulberry32, fisherYates, seededRand } from '@/lib/random'`
- **Artwork metadata rows:** `import { getArtworkFields } from '@/lib/artwork-fields'`
- **Debounce:** `import { debounce } from '@/hooks/useDebounce'`
- **Canvas utils:** `import { defaultTransform, pointsToPath, pathHitTest, screenToWorld } from '@/lib/canvas'`

## Key Tables
- `artworks` — id, title, author, year, imageUrl, source, mainCategory, subCategory
- `exhibits` — id, userId, title, description, isPublic, updatedAt
- `exhibit_items` — exhibitId, artworkId, x, y, w, h, note
- `exhibit_notes` — id, exhibitId, content, x, y, fontSize, bold, italic
- `exhibit_strokes` — id, exhibitId, pathData, color, width
- `users`, `sessions` — auth tables

## What Claude Gets Wrong (fix these immediately if seen)
- Adding `border-radius` to any interactive element
- Using `font-weight: 700` outside condensed display headings
- Hardcoding hex colors instead of CSS vars
- Forgetting `'use client'` on interactive components
- Opening `new Database()` directly in an API route instead of using `withDb()`
- Calling external image URLs directly instead of through `imgUrl()` / `/api/img`
- Duplicating `imgUrl`, `seededRand`, `getArtworkFields`, or `debounce` — use the shared modules
- Adding divider lines (`border-top`, `border-bottom`, `<hr>`) — zero decorative separators
- Adding a sidebar — the navigation is a top bar only (`src/components/layout/TopNav.js`)
- Centering page headers — they go top-right
- Using `var(--font-display)` (Cormorant) for page headers — use `var(--font-condensed)` (Barlow) instead
- Using `--sidebar-w` or `--sidebar-w-collapsed` — these vars no longer exist
