# VISUAL SYSTEM

## Palette (source: `src/styles/tokens.ts` ↔ `@theme` in `src/app/globals.css`)
| Token | Hex | Role |
|---|---|---|
| ivory | #F7F2EA | page background (public 50–60%) |
| soft-white | #FFFDF8 | cards, surfaces |
| sand / taupe / khaki | #D8D0BE / #9C9484 / #A79C82 | secondary surfaces, muted text |
| deep-teal / teal-hover | #0E3440 / #123F4C | primary brand, sidebars, CTAs |
| burgundy / burgundy-soft | #7A1F2B / #B45A64 | prices, emphasis, destructive |
| cobalt | #2F6FA8 | informational accents |
| antique-gold / muted-gold | #B59A65 / #D5C49E | ornaments, eyebrows, highlights |
| ink / text-soft / line | #1F1E1C / #6E675D / #E6DDCF | text, secondary text, borders |

Generic Tailwind palette classes are build-forbidden (`audit:colors`).

## Typography
- Headings: **Amiri** (`font-heading`); decorative accents: Aref Ruqaa (`font-decorative`).
- Body/UI: **IBM Plex Sans Arabic** (`font-body`), Cairo fallback. All via next/font.
- Dashboard numerals: `.tnum` (tabular). Arabic-Indic digits via `toLocaleString('ar-EG')`; count grammar via `lessonsLabel()`.

## RTL rules
`<html lang="ar" dir="rtl">`; logical utilities only (ps/pe/ms/me, start/end); sidebars and drawers anchor to inline-start (right); LTR islands (`dir="ltr"`) for emails, codes, IBANs, phone numbers.

## Primitives (`src/components/ui/`)
Button (5 variants × 3 sizes, renders Link with href) · Card(+Header/Title) · Section (eyebrow/title/lead, 4 tones) · Badge (8 tones) · Countdown (RTL-safe, ar-EG digits) · EmptyState · StatCard (+sparkline) · Sidebar (desktop column / mobile drawer) · Table set · FormField/Textarea/Select · PageSpinner.
Composites: PageHero, ProductCard (original no-person editorial photography cropped per kind), CategoryStrip, ComparisonPanel, CTARibbon, ProsePage, Stars, admin Charts (SVG line/donut).

## Elevation & shape
Shadows: `shadow-card` / `shadow-card-hover` / `shadow-sidebar` (tokens). Radii: rounded-xl→3xl scale; pills (rounded-full) for buttons/badges/chips. Hover: cards lift `-translate-y-1` + shadow; transitions 200–300ms.

## Brand assets
The official seed identity is implemented in `BrandLogo`/`SeedMark`; scalable botanical ornament is original code-native SVG (`BotanicalSpray`). `public/brand/catalog-still-life.webp` is an original, optimized, no-person editorial photograph used as one coherent image system on home and catalog cards, with per-kind crop positions in `ProductCard.coverArt`.

## Do not
Gray placeholder boxes · loud reds/blues · busy patterns behind text · gradients outside brand hues · English-first layouts · Western digits in Arabic UI copy.
