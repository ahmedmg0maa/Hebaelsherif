// Run with local server configuration. Reports names and file paths only.
import {readdirSync,readFileSync} from 'node:fs'
const protectedNames=['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','SENTRY_AUTH_TOKEN','PROTECTED_UPLOAD_SCAN_TOKEN','STAGING_ACCESS_PASSWORD']
const values=protectedNames.filter(n=>process.env[n]?.trim()).map(n=>[n,Buffer.from(process.env[n].trim())])
if(!values.length)throw Error('Supply server environment locally so the build check can compare actual secret values.')
const findings=[]
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())walk(path);else{const data=readFileSync(path);for(const [name,value] of values)if(data.includes(value))findings.push({name,path})}}}
walk('dist')
if(findings.length){for(const {name,path} of findings)console.error(`Server credential ${name} is present in ${path}`);process.exitCode=1}
else console.log(`Build secret isolation passed: ${values.length} configured server credentials absent from all dist files.`)
