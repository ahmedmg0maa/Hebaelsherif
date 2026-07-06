import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'

function run(label, args, env = process.env) {
  console.log(`\n[check] ${label}`)
  const result = spawnSync(npmCmd, ['run', ...args], { stdio: 'inherit', env, shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('type-check', ['type-check'])
run('lint', ['lint'])
run('build', ['build'], { ...process.env, NEXT_TELEMETRY_DISABLED: '1' })
console.log('\n[check] all checks passed')
