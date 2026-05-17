# Changelog

All notable changes to Exhibit are documented here.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
The changelog from v2.0.1 onward is maintained automatically by
[release-please](https://github.com/googleapis/release-please).

---

## [2.2.0](https://github.com/halo3buff/exhibit-v1/compare/v2.1.0...v2.2.0) (2026-05-17)


### Features

* **api:** add Zod validation to all write routes ([a9e1199](https://github.com/halo3buff/exhibit-v1/commit/a9e1199f9977475ef0420d098752821fa0188d80))
* **app:** add error boundaries to all major route segments ([b912e85](https://github.com/halo3buff/exhibit-v1/commit/b912e855a200ba6203d1a88c32d9767259b65355))
* **pipeline:** add unified run.ts orchestrator ([5519ecb](https://github.com/halo3buff/exhibit-v1/commit/5519ecb975e100346a00165c7f95395b3f847358))
* **pipeline:** add validate phase with data-quality and SSRF ([e039c9e](https://github.com/halo3buff/exhibit-v1/commit/e039c9e5f068a51936dfb893cb398d5a44f95375))


### Bug Fixes

* **auth:** prune expired sessions automatically every 100 ([1130fcf](https://github.com/halo3buff/exhibit-v1/commit/1130fcf8331224f208063cca64e505e25e9c110f))
* remove dead exhibit_edges API routes ([e115c57](https://github.com/halo3buff/exhibit-v1/commit/e115c57888a7f378228371ca80f56f79f62b98da))
* replace Tailwind v3 directives with v4 import syntax ([dd5c94a](https://github.com/halo3buff/exhibit-v1/commit/dd5c94a57a74ddd405b5fea933576d657610244a))
* split artworks.db into catalog + app.db to prevent user  data loss ([3e63e1b](https://github.com/halo3buff/exhibit-v1/commit/3e63e1b0b9dd61f6cb799d89792d58b5d11b6f02))
* use IMG_CACHE_DIR env var for image cache path ([313846d](https://github.com/halo3buff/exhibit-v1/commit/313846dd10f597bcc00fc13d8d2a7a3d3fc39379))


### Performance

* add getReadDb() singleton for hot GET routes ([5ba6df3](https://github.com/halo3buff/exhibit-v1/commit/5ba6df371b684e6a3894f5dc1f3881be16638e6a))
* **auth:** add Edge middleware + fix dual DB connection on ([4f9d9a7](https://github.com/halo3buff/exhibit-v1/commit/4f9d9a7704931ef6283c76f4a8463ee62dc23c9f))


### Refactors

* **components:** remove legacy components, relocate SaveToExhibit ([8163602](https://github.com/halo3buff/exhibit-v1/commit/8163602e5f01292f7d6f74f5b054d1ca0e9d0e25))

## [2.1.0](https://github.com/halo3buff/exhibit-v1/compare/exhibit-v2.0.0...exhibit-v2.1.0) (2026-05-17)


### Features

* **api:** add Zod validation to all write routes ([a9e1199](https://github.com/halo3buff/exhibit-v1/commit/a9e1199f9977475ef0420d098752821fa0188d80))
* **app:** add error boundaries to all major route segments ([b912e85](https://github.com/halo3buff/exhibit-v1/commit/b912e855a200ba6203d1a88c32d9767259b65355))
* **pipeline:** add unified run.ts orchestrator ([5519ecb](https://github.com/halo3buff/exhibit-v1/commit/5519ecb975e100346a00165c7f95395b3f847358))
* **pipeline:** add validate phase with data-quality and SSRF ([e039c9e](https://github.com/halo3buff/exhibit-v1/commit/e039c9e5f068a51936dfb893cb398d5a44f95375))


### Bug Fixes

* **auth:** prune expired sessions automatically every 100 ([1130fcf](https://github.com/halo3buff/exhibit-v1/commit/1130fcf8331224f208063cca64e505e25e9c110f))
* remove dead exhibit_edges API routes ([e115c57](https://github.com/halo3buff/exhibit-v1/commit/e115c57888a7f378228371ca80f56f79f62b98da))
* replace Tailwind v3 directives with v4 import syntax ([dd5c94a](https://github.com/halo3buff/exhibit-v1/commit/dd5c94a57a74ddd405b5fea933576d657610244a))
* split artworks.db into catalog + app.db to prevent user  data loss ([3e63e1b](https://github.com/halo3buff/exhibit-v1/commit/3e63e1b0b9dd61f6cb799d89792d58b5d11b6f02))
* use IMG_CACHE_DIR env var for image cache path ([313846d](https://github.com/halo3buff/exhibit-v1/commit/313846dd10f597bcc00fc13d8d2a7a3d3fc39379))


### Performance

* add getReadDb() singleton for hot GET routes ([5ba6df3](https://github.com/halo3buff/exhibit-v1/commit/5ba6df371b684e6a3894f5dc1f3881be16638e6a))
* **auth:** add Edge middleware + fix dual DB connection on ([4f9d9a7](https://github.com/halo3buff/exhibit-v1/commit/4f9d9a7704931ef6283c76f4a8463ee62dc23c9f))


### Refactors

* **components:** remove legacy components, relocate SaveToExhibit ([8163602](https://github.com/halo3buff/exhibit-v1/commit/8163602e5f01292f7d6f74f5b054d1ca0e9d0e25))

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
