#!/usr/bin/env python3
"""
scripts/nsfw_scan.py
────────────────────────────────────────────────────────────────────────────
NudeNet-based NSFW scanner for the Exhibit archive.

NudeNet uses body-part detection (not scene classification), which means
it correctly identifies nudity in classical paintings, engravings, drawings,
and photographs — not just modern photos.

Install:
    pip install nudenet pillow

Usage:
    python scripts/nsfw_scan.py               # scan everything
    python scripts/nsfw_scan.py --limit 5000  # test on first 5000 items
    python scripts/nsfw_scan.py --threshold 0.5  # stricter (fewer false positives)

Output:
    scripts/nsfw-flagged.json  — review this, remove false positives, then run:
    node scripts/nsfw-purge.mjs
────────────────────────────────────────────────────────────────────────────
"""

import sqlite3
import hashlib
import os
import sys
import json
import time
import argparse
import re
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DB_PATH    = SCRIPT_DIR.parent / "artworks.db"
CACHE_DIR  = Path(r"C:\Users\ameen\Desktop\.img-cache")
OUTPUT     = SCRIPT_DIR / "nsfw-flagged.json"

# NudeNet confidence threshold — 0.4 is a good balance.
# Lower = more flags (more false positives).
# Higher = fewer flags (might miss some).
DEFAULT_THRESHOLD = 0.4

# These NudeNet labels are considered NSFW
NSFW_LABELS = {
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "ANUS_EXPOSED",
    "BUTTOCKS_EXPOSED",
}

# These are detected but less severe — flagged at lower confidence
PARTIAL_LABELS = {
    "FEMALE_BREAST_COVERED",
    "FEMALE_GENITALIA_COVERED",
    "MALE_GENITALIA_COVERED",
}

# Strong metadata keywords — flagged regardless of model
STRONG_KEYWORDS = [
    "nude", "nudity", "naked", "nakedness",
    "erotic", "erotica", "pornographic", "obscene",
]

# ── Cache filename logic — exact copy of getFetchUrl from prewarm-cache.mjs ──
def iiif_url(url: str, size: int) -> str:
    return re.sub(r"/full/[^/]+/", f"/full/!{size},{size}/", url)

def ch_source_url(url: str) -> str:
    return re.sub(r"_[bzn]\.jpg$", "_z.jpg", url, flags=re.IGNORECASE)

def get_fetch_url(image_url: str, size: int) -> str:
    if "letterformarchive.org" in image_url:
        return image_url
    if "/full/" in image_url:
        return iiif_url(image_url, size)
    if "images.collection.cooperhewitt.org" in image_url and \
       re.search(r"_[bzn]\.jpg$", image_url, re.IGNORECASE):
        return ch_source_url(image_url)
    return image_url

def get_cache_filename(image_url: str, size: int) -> str:
    fetch_url = get_fetch_url(image_url, size)
    key       = f"{fetch_url}:{size}"
    return hashlib.md5(key.encode()).hexdigest() + ".jpg"

def find_cached_path(image_url: str) -> Path | None:
    for size in [400, 1200]:
        p = CACHE_DIR / get_cache_filename(image_url, size)
        try:
            if p.stat().st_size > 500:
                return p
        except FileNotFoundError:
            pass
    return None

def get_keyword_match(row: dict) -> str | None:
    haystack = " ".join(filter(None, [
        row.get("title"), row.get("classification"),
        row.get("medium"), row.get("objectType"), row.get("subCategory"),
    ])).lower()
    return next((kw for kw in STRONG_KEYWORDS if kw in haystack), None)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit",     type=int,   default=None, help="Only scan first N items (for testing)")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="Detection confidence threshold (default 0.4)")
    parser.add_argument("--category",  type=str,   default=None, help="Only scan a specific category e.g. 'Painting'")
    args = parser.parse_args()

    print("\n🔍 NSFW Scanner (NudeNet) — Exhibit Archive")
    print("─────────────────────────────────────────────\n")

    # Check DB
    if not DB_PATH.exists():
        print(f"❌ artworks.db not found at {DB_PATH}")
        sys.exit(1)

    # Check cache dir
    if not CACHE_DIR.exists():
        print(f"❌ Cache directory not found: {CACHE_DIR}")
        print("   Update CACHE_DIR at the top of this script.")
        sys.exit(1)

    # Load NudeNet
    print("📦 Loading NudeNet model...")
    print("   (First run downloads ~90MB model — subsequent runs are instant)\n")
    try:
        from nudenet import NudeDetector
        detector = NudeDetector()
    except ImportError:
        print("❌ NudeNet not installed. Run: pip install nudenet pillow")
        sys.exit(1)
    print("✅ Model ready\n")

    # Load artworks from DB
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()
    if args.category:
        cur.execute("""
            SELECT id, title, author, year, imageUrl, source, mainCategory, link,
                   classification, medium, objectType, subCategory
            FROM artworks
            WHERE imageUrl IS NOT NULL AND imageUrl != ''
              AND mainCategory = ?
        """, (args.category,))
    else:
        cur.execute("""
            SELECT id, title, author, year, imageUrl, source, mainCategory, link,
                   classification, medium, objectType, subCategory
            FROM artworks
            WHERE imageUrl IS NOT NULL AND imageUrl != ''
        """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    if args.limit:
        rows = rows[:args.limit]
        print(f"⚠️  Limited to first {args.limit} items\n")

    # Spot-check cache
    found = sum(1 for r in rows[:200] if find_cached_path(r["imageUrl"]))
    print(f"📊 {len(rows):,} artworks to scan")
    print(f"   Cache spot-check (first 200): {found}/200 found")
    if found < 50:
        print(f"\n❌ Too few cached files found. Check CACHE_DIR: {CACHE_DIR}")
        sys.exit(1)
    print(f"   Threshold: {args.threshold}\n")

    flagged   = []
    cache_miss = 0
    errors    = 0
    scanned   = 0
    start     = time.time()

    for row in rows:
        scanned += 1
        img_path = find_cached_path(row["imageUrl"])
        kw_match = get_keyword_match(row)

        # Strong keyword match — flag even without image
        if kw_match and img_path is None:
            flagged.append({
                "id":           row["id"],
                "title":        row["title"],
                "author":       row["author"],
                "year":         row["year"],
                "source":       row["source"],
                "category":     row["mainCategory"],
                "link":         row["link"],
                "imageUrl":     row["imageUrl"],
                "keywordMatch": kw_match,
                "detections":   None,
                "triggeredBy":  [f"keyword:{kw_match}"],
            })
            cache_miss += 1
            continue

        if img_path is None:
            cache_miss += 1
            continue

        try:
            detections = detector.detect(str(img_path))

            # Filter to NSFW labels above threshold
            nsfw_hits    = [d for d in detections if d["class"] in NSFW_LABELS    and d["score"] >= args.threshold]
            partial_hits = [d for d in detections if d["class"] in PARTIAL_LABELS and d["score"] >= args.threshold + 0.2]
            all_hits     = nsfw_hits + partial_hits

            # Also flag on strong keyword even if model is clean
            should_flag = len(all_hits) > 0 or (kw_match is not None)

            if should_flag:
                flagged.append({
                    "id":          row["id"],
                    "title":       row["title"],
                    "author":      row["author"],
                    "year":        row["year"],
                    "source":      row["source"],
                    "category":    row["mainCategory"],
                    "link":        row["link"],
                    "imageUrl":    row["imageUrl"],
                    "keywordMatch": kw_match,
                    "detections":  [{"label": d["class"], "score": round(d["score"], 3)} for d in all_hits],
                    "triggeredBy": list({d["class"] for d in all_hits}) + ([f"keyword:{kw_match}"] if kw_match else []),
                })

        except Exception as e:
            errors += 1

        # Progress
        if scanned % 100 == 0 or scanned == len(rows):
            elapsed  = time.time() - start
            rate     = scanned / elapsed if elapsed > 0 else 1
            rem_secs = (len(rows) - scanned) / rate
            rem_h    = rem_secs / 3600
            pct      = (scanned / len(rows)) * 100
            print(
                f"\r  {pct:5.1f}% ({scanned:,}/{len(rows):,}) | "
                f"flagged: {len(flagged)} | "
                f"{elapsed:.0f}s | ~{rem_h:.1f}h left   ",
                end="", flush=True
            )

        # Save checkpoint every 5,000
        if scanned % 5000 == 0:
            _write_output(flagged, scanned, len(rows), cache_miss, errors, "in-progress", args.threshold)

    print("\n")

    _write_output(flagged, scanned, len(rows), cache_miss, errors, "complete", args.threshold)

    total_min = (time.time() - start) / 60
    print(f"✅ Done in {total_min:.1f} minutes")
    print(f"   Scanned:   {scanned:,}")
    print(f"   Flagged:   {len(flagged):,}")
    print(f"   No cache:  {cache_miss:,}")
    print(f"   Errors:    {errors:,}")
    print(f"\n📄 Review: scripts/nsfw-flagged.json")
    print(f"   Remove any false positives, then run:")
    print(f"   node scripts/nsfw-purge.mjs\n")


def _write_output(flagged, scanned, total, cache_miss, errors, status, threshold):
    import datetime
    output = {
        "scannedAt":    datetime.datetime.now().isoformat(),
        "status":       status,
        "totalScanned": scanned,
        "totalItems":   total,
        "cacheMiss":    cache_miss,
        "errors":       errors,
        "flaggedCount": len(flagged),
        "threshold":    threshold,
        "flagged":      flagged,
    }
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
