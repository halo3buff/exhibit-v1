# Changelog

All notable changes to Exhibit are documented here.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
The changelog from v2.0.1 onward is maintained automatically by
[release-please](https://github.com/googleapis/release-please).

---

## [2.0.0] — 2026-05-16

This release is the stable baseline for the v2 rewrite. All entries below were
backfilled from git history.

### Features

- **Pipeline validation phase** — data-quality and SSRF allowlist gates (H9, H10) added to the ETL pipeline (`feat(pipeline)` #H9/#H10)

### Performance

- **Edge middleware** — auth check moved to Next.js Edge runtime; eliminates dual DB connection on auth routes (`perf(auth)` #7)
- **Read DB singleton** — `getReadDb()` persistent singleton for hot GET routes removes per-request connection overhead

### Bug Fixes

- **Session pruning** — expired sessions are now automatically pruned every 100 `getSession()` calls to prevent unbounded growth (`fix(auth)` #8)
- **Tailwind v4 syntax** — replaced v3 `@tailwind` directives with v4 `@import` syntax
- **Image cache path** — `IMG_CACHE_DIR` env var now controls image cache location correctly
- **Dead API routes** — removed orphaned `exhibit_edges` API routes
- **Database split** — separated `artworks.db` (catalog/pipeline-owned) from `app.db` (user data/app-owned) to prevent data loss on pipeline re-runs

---

## [1.0.0] — 2025 (legacy baseline)

Initial public architecture: harvest pipeline, SQLite catalog, gallery UI, and
infinite-canvas exhibit editor.

---

<!-- release-please inserts new entries above this line -->
