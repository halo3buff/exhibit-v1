# Exhibit — Design Redesign Brief

Look at all the images in `references/design/` before doing anything else. Study them carefully. They define the entire visual direction for this redesign.

---

## What You're Looking At

The images show a Japanese aesthetic design system built around 7 concepts: Shibui, Seijaku, Datsuzoku, Shizen, Yūgen, Kanso, Fukinsei. The visual language is what we are adopting for Exhibit.

---

## Design System to Implement

### Color Palette
Replace the current color tokens in `globals.css` with these:

```css
--bg:           #e8e5de;   /* Warm linen/stone — the dominant background */
--bg-card:      #dedad2;   /* Slightly darker card surface */
--bg-hover:     #d4d0c8;   /* Hover state */
--fg:           #1a1916;   /* Near-black ink — NOT pure black */
--fg-muted:     rgba(26, 25, 22, 0.52);
--fg-faint:     rgba(26, 25, 22, 0.28);
--border:       rgba(26, 25, 22, 0.07);
--border-md:    rgba(26, 25, 22, 0.14);
--accent:       #e8312a;   /* Single red accent — use sparingly */

/* Dark surfaces (archive, modals) — keep as-is */
```

### Typography
The images use two very specific type treatments. Source these fonts via Google Fonts or similar:

- **Display/Hero (concept titles):** `Barlow Condensed` or `Bebas Neue` — weight 700–800, all caps, very large. This is the bold condensed black used for "SHIBUI", "KANSO", "SEIJAKU" etc.
- **Body:** `DM Sans` (already in project) — weight 300, small size, justified text alignment for paragraph blocks
- **Labels/Meta:** `DM Mono` (already in project) — tracked uppercase, small, for metadata

**Critical typographic detail from the images:** The year "20**26**" uses mixed weight within the same word — "202" is light, "6" is bold. Apply this same contrast-within-type technique to key UI moments (e.g., exhibition counts, dates).

**Spaced tracking on secondary labels** — "T R A N Q U I L I T Y ,  S T I L L N E S S ." Letter-spacing 0.2–0.4em on uppercase secondary descriptors.

### Layout Principles (from the images)

**Fukinsei (asymmetry):** Never center-align content blocks. Text sits hard-left, images sit right — or flip it. The tension between left and right creates the visual interest. No centered hero layouts.

**Yūgen (mystery, negative space):** Huge amounts of empty space are intentional. A page that feels "empty" is correct. Resist filling space.

**Kanso (elimination):** Zero decorative elements. No divider lines, no icon embellishments, no decorative borders. If an element doesn't carry information, delete it.

**Shibui (subtle depth):** The richness comes from typography weight contrast and spatial placement, not from color or decoration.

### Photography Treatment
The reference images all show still-life photography with a consistent treatment:
- Subjects on dark wooden surfaces
- Warm taupe/brown backgrounds
- No cropping to circles or rounded containers — hard rectangular frames only
- Images appear at approximately 55–60% of the page width, never full-bleed on content pages

Apply this to artwork imagery in Exhibit: always rectangular, never circle-cropped, let the art breathe with space around it.

### The Red Accent Rule
The red (`#e8312a`) appears in exactly ONE place per layout — the logo mark. That's it. Do not use red for hover states, buttons, tags, or highlights. It must remain singular and powerful. The only exception is a single primary CTA button if absolutely needed.

---

## Pages to Redesign

Redesign all pages to reflect this aesthetic. Here is the priority order:

### 1. Gallery / Browse Page
- Hard asymmetric grid — not a uniform masonry layout
- Large condensed title "COLLECTION" or "ARCHIVE" top-left, massive, bold condensed
- Artwork cards: no border-radius, no shadows, pure rectangular frames
- Card metadata in DM Mono, tracked uppercase, muted

### 2. Homepage / Landing
- Dominant negative space
- One large bold condensed word or phrase — the application's purpose stated boldly
- Minimal navigation

### 3. Individual Artwork Page
- Artwork image takes up left 55% of the page
- All metadata hard-right, stacked vertically in DM Mono
- Title in bold condensed display font
- Japanese-inspired detail: show the artwork's year in mixed-weight type

### 4. Exhibits Page (user collections)
- List of exhibits as clean typographic rows
- No card chrome — just the title (bold condensed), date (DM Mono), and count
- Hover reveals a subtle background wash

### 5. Navigation
- Keep the existing 44px fixed nav height
- Nav links in DM Mono, tracked uppercase, weight 400
- The single red accent is the logo/wordmark only

---

## What to Absolutely Preserve

**The wander/random image preview feature must be kept exactly as it is.** Do not touch the wander page logic, the `buildOrganicBoxes` function, the scatter/physics behavior, or any of the random positioning code. Only update the colors and typography on that page to match the new tokens — the interactive behavior stays identical.

---

## What to Remove

- Any existing gradients
- Any `border-radius` on interactive or display elements
- Any box shadows beyond the hairline card shadow
- Any use of blue, purple, or saturated colors
- Any centered hero layouts

---

## Implementation Notes

- Update CSS tokens in `globals.css` first, then work page by page
- Add `Barlow Condensed` (or `Bebas Neue`) to `layout.js` via `next/font/google`
- Expose it as `--font-condensed` CSS variable alongside existing font vars
- Test each page at desktop width — this design is built for wide viewports first
- The muted warm background (`#e8e5de`) replaces the current off-white throughout

---

Start by reading the images in `references/design/`, then update `globals.css`, then `layout.js` for the new font, then work through pages in priority order. Check in after each page.
