import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
const require=createRequire(import.meta.url)
export function sourceLoader(stubs={}){
 const cache=new Map()
 function load(file){
  file=resolve(file);if(cache.has(file))return cache.get(file).exports
  const mod={exports:{}};cache.set(file,mod)
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  vm.runInNewContext(code,{module:mod,exports:mod.exports,structuredClone,URL,URLSearchParams,FormData,File,console,setTimeout,clearTimeout,require:name=>{
   if(name in stubs)return stubs[name]
   if(name.startsWith('.')||name.startsWith('@/')){
    const base=name.startsWith('@/')?resolve('src',name.slice(2)):resolve(dirname(file),name)
    const target=[base,base+'.ts',base+'.tsx',base+'.mjs'].find(p=>existsSync(p)&&/\.(?:ts|tsx|mjs)$/.test(p))
    if(!target)throw Error('Source module missing: '+name)
    return target.endsWith('.mjs')?require(target):load(target)
   }return require(name)
  }},{filename:file})
  return mod.exports
 }return load
}
