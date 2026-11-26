import { existsSync } from 'node:fs'
import { report } from './lib.mjs'

const required = [
  'package.json',
  'pnpm-lock.yaml',
  '.npmrc',
  '.nvmrc',
  'docs/CLOUDFLARE_DEPLOYMENT.md',
  'docs/CLOUDFLARE_COMPATIBILITY_SPIKE_2026-08-26.md',
  'docs/OWNER_CLOUDFLARE_SETUP_ONE_CONSOLIDATED_REQUEST.md',
  'wrangler.jsonc',
  'vite.config.ts',
  'scripts/run-cloudflare-isolated-build.mjs',
  'scripts/run-isolated-typecheck.mjs',
  '.env.example',
  'docs/MASTER_PLAN.md',
  'docs/PROJECT_STATE.md',
  'docs/DECISIONS.md',
  'docs/KNOWN_ISSUES.md',
  'docs/FULL_STACK_REVIEW_AND_UPGRADE_2026-08-25.md',
  'docs/ROAD_TO_100_REMEDIATION_EXECUTION_2026-08-25.md',
  'docs/STAGING_BOOKING_CHANGE_RUNBOOK_2026-08-25.md',
  'docs/FINAL_INDEPENDENT_ACCEPTANCE_AUDIT_AND_SCORE_POST_REMEDIATION_2026-08-25.md',
  'docs/PRODUCTION_LAUNCH_CLOSURE_2026-08-26.md',
  'scripts/verify-booking-staging-contract.mjs',
  'scripts/run-launch-recovery-drill.ps1',
  'scripts/run-launch-recovery-drill-interactive.ps1',
  'scripts/verify-recovery-runner-local.mjs',
]

const failures = required.filter((f) => !existsSync(f)).map((f) => `missing required file: ${f}`)

if (existsSync('package-lock.json')) failures.push('package-lock.json exists — pnpm only')

report('audit:launch', failures)
