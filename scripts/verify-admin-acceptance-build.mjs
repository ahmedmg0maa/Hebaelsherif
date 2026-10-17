// Infrastructure-only: actual restricted source mirror + frozen build + staging
// gate, with NO provider configuration. Never reports Auth/Storage acceptance.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {ORIGIN} from './lib/admin-acceptance-config.mjs'
import {startAcceptanceApplication} from './lib/admin-acceptance-runtime.mjs'
const runtime=await startAcceptanceApplication({origin:ORIGIN,url:'',key:'',secret:''},'synthetic@example.invalid',randomUUID())
try{
 assert.equal((await fetch(ORIGIN+'/auth/admin',{redirect:'manual'})).status,401)
 assert.equal((await fetch(ORIGIN+'/auth/admin',{headers:{Authorization:'Basic '+runtime.basic}})).status,200)
 assert(Object.values(runtime.manifest.node).some(row=>row.exportedName==='ownerPasswordLogin'))
 console.log('PASS restricted acceptance mirror, frozen Next build, real staging gate and Auth page; provider integration NOT RUN')
}finally{await runtime.stop()}
