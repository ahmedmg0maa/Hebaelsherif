import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export function verifyBracesGuard() {
  const require = createRequire(import.meta.url)
  let path = realpathSync('node_modules/vinext/package.json')
  for (const name of ['vite-plugin-commonjs','vite-plugin-dynamic-import','fast-glob','micromatch','braces']) {
    const target = createRequire(path).resolve.paths(name).map(directory => join(directory,name,'package.json')).find(existsSync)
    assert(target, `Cannot resolve installed dependency ${name}`)
    path = realpathSync(target)
  }
  const guard = readFileSync(join(dirname(path),'lib/heba-guards.js'))
  assert.equal(createHash('sha256').update(guard).digest('hex'),'7b53d3a12fb9689a051672189a5b64f9cee0446244a255b46d39b588d09394d9','Installed mitigation differs from the reviewed guard.')
  const braces = require(join(dirname(path),'index.js'))
  assert.equal(braces.compile('a/{b,c}/d'),'a/(b|c)/d')
  assert.deepEqual(braces.expand('{1..3}'),['1','2','3'])
  assert.deepEqual(braces.expand('a/{b,{c,d}}'),['a/b','a/c','a/d'])
  assert.equal(braces.stringify(braces.parse('src/{app,components}/**/*.tsx')),'src/{app,components}/**/*.tsx')
  const attack = '{'.repeat(512)+'a,b'+'}'.repeat(512)
  for (const operation of [braces.parse,braces.compile,braces.expand,braces.stringify]) assert.throws(()=>operation(attack,{maxDepth:Infinity}),/BRACES_COMPLEXITY_LIMIT/)
  const cyclic = {type:'root',nodes:[]};cyclic.nodes.push(cyclic)
  for (const operation of [braces.compile,braces.expand,braces.stringify]) assert.throws(()=>operation(cyclic),/BRACES_COMPLEXITY_LIMIT/)
  let deep={type:'text',value:'a'};for(let i=0;i<512;i++)deep={type:'root',nodes:[deep]}
  for (const operation of [braces.compile,braces.expand,braces.stringify]) assert.throws(()=>operation(deep),/BRACES_COMPLEXITY_LIMIT/)
  const broad={type:'root',nodes:Array.from({length:16385},()=>({type:'text',value:'a'}))}
  assert.throws(()=>braces.compile(broad),/BRACES_COMPLEXITY_LIMIT/)
  return {advisory:'GHSA-vfj7-8cjw-p6xm',mitigation:'Pinned local parse/compile/expand/stringify depth, cycle and node guards',scope:'Installed module from the actual vinext dependency chain; ordinary and adversarial patterns checked.'}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(verifyBracesGuard()))
