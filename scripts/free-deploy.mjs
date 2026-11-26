import { spawnSync } from 'node:child_process'
import { validateLaunchConfig } from './launch-config.mjs'

if (process.env.HEBA_COST_MODE !== 'free') throw Error('This command requires HEBA_COST_MODE=free. It never enables a paid service.')
const errors = validateLaunchConfig(process.env)
if (errors.length) throw Error(errors.join('\n'))
const cli = process.env.npm_execpath
if (!cli) throw Error('Run through corepack pnpm deploy:free.')
const run = args => {
  const result = spawnSync(process.execPath,[cli,...args],{stdio:'inherit',env:process.env})
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run(['launch:check'])
run(['build:launch'])
run(['exec','wrangler','deploy','--dry-run','--config','dist/server/wrangler.json'])
console.log('Local configured build/dry-run passed. Existing account must remain Workers Free; this command does not change its plan. CPU limits require a test on the deployed Worker before opening bookings.')
run(['exec','wrangler','deploy','--config','dist/server/wrangler.json','--keep-vars'])
