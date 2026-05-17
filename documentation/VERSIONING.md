# Versioning — How It Works

This document explains the full versioning system used in Exhibit: the scheme, the commit format, the automation, and how to cut a release.

---

## The Three Pillars

| Pillar | Tool | Purpose |
|---|---|---|
| Version scheme | **Semantic Versioning (SemVer)** | Defines what a version number *means* |
| Commit format | **Conventional Commits** | Drives automatic version bumps + changelog |
| Automation | **release-please** (GitHub Actions) | Reads commits → opens release PR → tags + publishes |

---

## 1. Semantic Versioning (SemVer)

Every release gets a version number in the form `MAJOR.MINOR.PATCH`.

```
v2  .  1  .  4
 ^     ^     ^
 |     |     └── PATCH — backwards-compatible bug fix
 |     └──────── MINOR — new backwards-compatible feature
 └────────────── MAJOR — breaking change (API, DB schema, etc.)
```

### Rules

| When you... | Bump |
|---|---|
| Fix a bug that doesn't change any interface | `PATCH` — `2.1.3 → 2.1.4` |
| Add a new feature that doesn't break anything | `MINOR` — `2.1.4 → 2.2.0` |
| Change something that breaks existing behavior | `MAJOR` — `2.2.0 → 3.0.0` |

The current version is always the single source of truth in `package.json → "version"`.

---

## 2. Conventional Commits

Every commit message must follow this structure:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE: ...]
```

### Commit types and their effect on the version

| Type | Example | Version bump |
|---|---|---|
| `feat` | `feat(gallery): add infinite scroll` | **MINOR** |
| `fix` | `fix(auth): prune expired sessions` | **PATCH** |
| `perf` | `perf(db): add read singleton` | **PATCH** |
| `refactor` | `refactor(pipeline): extract validator` | **PATCH** |
| `docs` | `docs: update API reference` | none (hidden) |
| `chore` | `chore: update deps` | none (hidden) |
| `ci` | `ci: add lint workflow` | none (hidden) |

### Breaking changes → MAJOR bump

Add `BREAKING CHANGE:` in the commit footer **or** append `!` after the type:

```
feat(db)!: rename exhibit_items.position to wallTransform

BREAKING CHANGE: all clients must migrate stored wallTransform values.
```

Either form signals release-please to bump the MAJOR version.

### Scope is optional but recommended

Use it to indicate the subsystem affected:

```
fix(auth):     auth & session logic
fix(pipeline): ETL pipeline
fix(gallery):  gallery UI
fix(canvas):   canvas editor
fix(api):      API routes
fix(db):       database layer
```

---

## 3. release-please (The Automation)

release-please is a Google-maintained GitHub Action that watches the `main` branch and handles the release lifecycle automatically.

### How it works — step by step

```
You push conventional commits to main
            │
            ▼
    GitHub Action fires
    (release-please.yml)
            │
            ▼
  release-please reads commits
  since the last release tag
            │
            ├─ No releasable commits? → does nothing
            │
            └─ Releasable commits found?
                        │
                        ▼
            Opens/updates a "Release PR"
            titled: "chore(main): release 2.1.0"
            ┌─────────────────────────────────┐
            │ • Bumps version in package.json │
            │ • Prepends new entries to       │
            │   CHANGELOG.md                  │
            │ • Updates manifest file         │
            └─────────────────────────────────┘
                        │
                        ▼
          YOU review and merge the Release PR
                        │
                        ▼
          release-please detects the merge,
          creates a GitHub Release + git tag
          (e.g., v2.1.0) pointing at that commit
```

### Key files

| File | Purpose |
|---|---|
| `.github/workflows/release-please.yml` | Triggers the Action on every push to `main` |
| `release-please-config.json` | Tells release-please the release type (`node`) and which commit types appear in the changelog |
| `.release-please-manifest.json` | Tracks the last released version — release-please reads this to know where to start scanning commits |
| `CHANGELOG.md` | Human-readable history; auto-updated by the Release PR |
| `package.json → "version"` | The canonical version number; updated by the Release PR |

---

## 4. Your Workflow Day-to-Day

### Writing commits

```bash
# Bug fix → PATCH bump
git commit -m "fix(auth): handle null session token on cold start"

# New feature → MINOR bump  
git commit -m "feat(gallery): add wander mode shuffle button"

# Breaking change → MAJOR bump
git commit -m "feat(db)!: restructure exhibit_items schema

BREAKING CHANGE: position column removed; use wallTransform."
```

### Cutting a release

1. Push (or merge PRs) to `main` as normal.
2. The GitHub Action opens a Release PR automatically — usually within seconds.
3. Review the PR. The CHANGELOG diff shows exactly what changed.
4. Merge the Release PR.
5. release-please creates the GitHub Release and the `vX.Y.Z` tag automatically.

That's it. You never manually edit `package.json → "version"` or `CHANGELOG.md` again.

### What if I pushed several features before releasing?

release-please batches them. It keeps its Release PR open and rebases it as you push more commits, accumulating all changes until you merge. You control the release cadence — merge the Release PR whenever you're ready to ship.

---

## 5. Version History

| Version | Date | Notes |
|---|---|---|
| `v1.0.0` | 2025 | Original architecture: ETL pipeline, gallery, canvas editor |
| `v2.0.0` | 2026-05-16 | Full rewrite — new design system, dual-DB architecture, Edge auth middleware, pipeline validation |

From `v2.0.1` onward, all releases are tracked automatically in `CHANGELOG.md`.

---

## 6. Quick Reference

```bash
# Check current version
node -p "require('./package.json').version"

# List all release tags
git tag --list "v*" --sort=-version:refname

# See what will go into the next release
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

---

## Further Reading

- [Semantic Versioning spec](https://semver.org/)
- [Conventional Commits spec](https://www.conventionalcommits.org/)
- [release-please documentation](https://github.com/googleapis/release-please)
- [release-please-action](https://github.com/googleapis/release-please-action)
