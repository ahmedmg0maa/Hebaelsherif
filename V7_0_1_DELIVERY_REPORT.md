# V7.0.1 Delivery Report

Date: 2026-07-06
Delivered version: V7.0.1
Next recommended patch: V7.0.2

## Delivered

- Bumped package version from `7.0.0` to `7.0.1`.
- Rebased the visual system on the V7 textile palette from the visual target brief.
- Added semantic Tailwind color aliases: `softWhite`, `taupe`, `khaki`, `deepTeal`, `tealHover`, `cobalt`, `antiqueGold`, `mutedGold`, `burgundySoft`, `ink`, `textSoft`, and `border`.
- Kept legacy class aliases (`petrol`, `olive`, `warm-gray`, `charcoal`, etc.) mapped to V7 values so existing UI remains stable.
- Converted hardcoded admin/readability colors to CSS variable usage.
- Added `scripts/audit-colors.mjs` and wired `audit:colors` into `check:deploy`.
- Added missing V7 docs:
  - `docs/V7_COLOR_SYSTEM.md`
  - `docs/V7_VISUAL_TARGETS.md`
  - `docs/V7_PATCH_ROADMAP_TO_V8.md`
- Extended `audit:v7` to require the new docs.
- Fixed local public-page runtime resilience: `useAuth` no longer crashes the homepage when Supabase public env vars are not configured.
- Set the public experience to default light mode unless the user explicitly selects dark mode.
- Added pnpm build approvals for `sharp` and `unrs-resolver` so frozen installs pass under pnpm's build-script approval gate.

## Verification

Passing commands:

```bash
pnpm install --frozen-lockfile
pnpm run type-check
pnpm run lint
pnpm run build
pnpm run audit:colors
pnpm run check:deploy
```

Browser smoke check on `http://127.0.0.1:3000`:

- Homepage rendered Arabic content.
- V7 light tokens were active.
- Primary CTA was visible.
- Six images rendered.
- Horizontal overflow was `0`.

## Notes

- `audit:colors` passes and reports legacy alias warnings. This is intentional for V7.0.1 because the patch preserves compatibility while making future migration visible.
- The custom `build-v6.mjs` wrapper still prints static-generation warnings for routes intentionally marked dynamic. The build exits successfully.
- Supabase migrations were audited but not executed against a live database in this environment.
