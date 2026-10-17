import { spawn } from 'node:child_process'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'

const pnpmCli = process.env.npm_execpath
if (!pnpmCli) throw new Error('pnpm CLI path is unavailable')

const port = process.env.HEBA_PREVIEW_PORT || '3102'
const host = '127.0.0.1'
const blocked = {
  ...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map((name) => [name, ''])),
  NEXT_PUBLIC_SITE_URL: `http://${host}:${port}`,
  SUPABASE_SECRET_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  OWNER_ADMIN_EMAIL: '',
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
  SENTRY_AUTH_TOKEN: '',
  PROTECTED_UPLOAD_SCAN_URL: '',
  PROTECTED_UPLOAD_SCAN_TOKEN: '',
  HEBA_DEPLOYMENT_ENV: 'preview',
  HEBA_COST_MODE: 'free',
  STAGING_ACCESS_USER: '',
  STAGING_ACCESS_PASSWORD: '',
  PORT: port,
  HOSTNAME: host,
}

const child = spawn(process.execPath, [pnpmCli, 'start'], {
  cwd: process.cwd(),
  env: { ...process.env, ...blocked },
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`Unable to start the isolated preview: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
