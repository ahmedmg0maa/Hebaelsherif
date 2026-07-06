# V7 Color System

Current delivered version: V7.0.1

## Palette

The V7 palette is textile-inspired and Arabic-first. Hex values are defined only in token/config files; production UI should consume CSS variables or Tailwind semantic classes.

| Token | Hex | Role |
| --- | --- | --- |
| ivory | #F7F2EA | Primary public background and breathing space |
| softWhite | #FFFDF8 | Elevated cards and admin table surfaces |
| sand | #D8D0BE | Layered panels, dividers, quiet borders |
| taupe | #9C9484 | Muted utility copy and secondary UI |
| khaki | #A79C82 | Soft status and supporting accents |
| deepTeal | #0E3440 | Primary CTA, admin shell, high-emphasis structure |
| tealHover | #123F4C | Hover and dark shell depth |
| burgundy | #7A1F2B | Emotional emphasis, offers, alerts, current progress |
| burgundySoft | #B45A64 | Softer warnings and emotional highlights |
| cobalt | #2F6FA8 | Resource links, chart lines, small information accents |
| antiqueGold | #B59A65 | Icons, dividers, premium cues |
| mutedGold | #D5C49E | Subtle gold backgrounds and completed states |
| ink | #1F1E1C | Main text |
| textSoft | #6E675D | Body and secondary text |
| border | #E6DDCF | Standard border color |

## Distribution Targets

Public website:

- Ivory/soft white: 55-60%
- Sand/taupe: 18-22%
- Deep teal: 10-14%
- Gold: 6-8%
- Burgundy: 3-6%
- Cobalt: 2-4%

Dashboard:

- Ivory/white cards: 65%
- Deep teal: 15%
- Taupe/sand: 10%
- Burgundy: 4%
- Cobalt: 3%
- Gold: 3%

Admin:

- Ivory/white surfaces: 55-60%
- Deep teal sidebar/header: 18-22%
- Taupe/sand panels: 8-10%
- Gold KPI/icons: 5%
- Burgundy alerts/rejections: 3-4%
- Cobalt charts/info: 2-3%

## Implementation Rules

- Use `rgb(var(--color-...))` and Tailwind tokens instead of random hex values.
- Keep `deepTeal` as the main action color on a screen.
- Use burgundy for emphasis, alerts, offers, and selected lesson/progress states.
- Use cobalt sparingly for links, resources, and analytics micro-accents.
- Use antique gold for icons, dividers, premium cues, and KPI glyphs.
- Keep botanical/textile motifs light and away from dense text.

## Compatibility

Legacy V6 class aliases (`petrol`, `olive`, `warm-gray`, `charcoal`, `gold`) remain available, but they now resolve to the V7 palette. New work should prefer semantic V7 names such as `deepTeal`, `cobalt`, `antiqueGold`, `textSoft`, and `softWhite`.

## Audit

Run:

```bash
pnpm run audit:colors
```

The audit verifies V7 tokens, verifies the canonical palette values in `src/constants/design.ts`, fails uncontrolled hex colors outside token files, and warns about legacy palette aliases that should be migrated in later patches.
