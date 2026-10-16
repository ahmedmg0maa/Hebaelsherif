// Never globally suppress registry findings. One exact advisory is accepted
// only after verifying the installed, pinned local mitigation and its behavior.
import { spawnSync } from 'node:child_process'
import { verifyBracesGuard } from './verify-braces-guard.mjs'

const result=spawnSync('corepack',['pnpm','audit','--prod','--json'],{encoding:'utf8',maxBuffer:10_000_000})
if(result.error)throw result.error
let report
try{report=JSON.parse(result.stdout)}catch{throw Error('Dependency registry audit did not return valid JSON; audit is unverified.')}
if(!report.advisories || report.error)throw Error('Dependency registry audit unavailable; refusing a clean result.')
const advisories=Object.values(report.advisories)
const unmitigated=advisories.filter(item=>item.url!=='https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' || item.module_name!=='braces')
if(unmitigated.length){console.error(JSON.stringify({status:'failed',unmitigated:unmitigated.map(item=>({module:item.module_name,severity:item.severity,url:item.url}))},null,2));process.exit(1)}
const mitigation=verifyBracesGuard()
if(result.status!==0 && !advisories.length)throw Error('Audit failed without a verified advisory result.')
console.log(JSON.stringify({status:'passed-with-verified-local-mitigation',rawRegistryFindings:advisories.length,unmitigatedFindings:0,mitigation,note:'Standard pnpm audit still reports the upstream braces version. This is a local mitigation, not an official upstream release or a blanket vulnerability waiver.'},null,2))
