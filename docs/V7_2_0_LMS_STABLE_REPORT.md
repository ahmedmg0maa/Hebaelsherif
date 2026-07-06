# V7.2.0 LMS Stable Milestone Report

Current completed version: **7.2.0**  
Next version target: **7.2.1**

## Scope

This milestone stabilizes the learner dashboard and LMS foundations after the V7.1.x patch series.

## Implemented

### V7.1.1 — Customer Dashboard Shell

- Dashboard sidebar includes a dedicated **كورساتي** route.
- Dashboard shell has authenticated app layout and premium unauthenticated state.
- Dashboard summary cards cover books, sessions, orders, and learning direction.
- Empty states are useful and do not use fake data.

### V7.1.2 — Course Player UI

- Added protected learner route:

```txt
/dashboard/courses/[slug]/learn
```

- Old public course learning route redirects to the dashboard route:

```txt
/courses/[slug]/learn → /dashboard/courses/[slug]/learn
```

- Course player shell includes:
  - large lesson visual/player area
  - curriculum sidebar
  - progress ring
  - progress bar
  - resources/download panel
  - personal notes area
  - next/previous context
  - mark-complete button
  - premium dashboard cards

### V7.1.3 — Course Progress Logic

- `/api/progress` now checks authenticated user access before reading/updating progress.
- Progress updates require paid/access-granted order or active content access.
- Progress writes include `completedLessonIds`, `lastLessonId`, and `progressPercent`.
- Compatibility layer aliases were improved for `course_lessons` and `course_progress` reads.

## No Fake Production Data

The course player does not fabricate lessons, course cards, or access. If a course has no lessons, the UI shows an honest empty state. If the user has no access, the UI shows a protected-access state.

## Deployment Readiness

Run before production:

```bash
pnpm install --frozen-lockfile
pnpm run check:deploy
supabase db push
```

## Known Limitations

- Persistent personal notes UI is present, but permanent note-save API is reserved for the next commerce/LMS iteration if needed.
- Staging Supabase migration execution must be performed in the deployment environment because this execution environment may not have Docker/Supabase local services.

## Next Target

```txt
V7.2.1 = Commerce unification step 1
```
