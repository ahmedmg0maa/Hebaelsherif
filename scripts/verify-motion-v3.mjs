import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { brandColors } from '../src/styles/tokens.ts'

// Execute the actual React component handlers with isolated hooks/DOM adapters.
// This is not browser, pixel, device, or provider acceptance.
let active
const Button = function Button() {}
const react = {
  useState(initial) {
    const context = active, index = context.cursor++
    if (!(index in context.hooks)) context.hooks[index] = initial
    return [context.hooks[index], next => { context.hooks[index] = typeof next === 'function' ? next(context.hooks[index]) : next }]
  },
  useRef(initial) {
    const context = active, index = context.cursor++
    if (!(index in context.hooks)) context.hooks[index] = { current: initial }
    return context.hooks[index]
  },
  useId() { return active.id },
  useEffect(callback) { active.effects.push(callback) },
}
const jsx = (type, props) => {
  if (props?.ref && typeof props.ref === 'object') props.ref.current = active.node
  if (typeof props?.ref === 'function') props.ref({ focus() { active.focused = props.id } })
  return { type, props: props ?? {} }
}
function load(path) {
  const imports = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/cn': { cn: (...parts) => parts.filter(Boolean).join(' ') }, '@/components/ui/Button': { Button }, 'next/image': { default: () => null } }
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in imports, `Unbound dependency ${name}`); return imports[name] }, loaded, loaded.exports)
  return loaded.exports
}
function walk(node, found = []) {
  if (Array.isArray(node)) { node.forEach(child => walk(child, found)); return found }
  if (node && typeof node === 'object' && 'props' in node) { found.push(node); walk(node.props.children, found) }
  return found
}
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node === undefined || node === null || typeof node === 'boolean' ? '' : String(node)
let count = 0
const pass = (name, check) => { check(); count++; console.log('PASS '+name) }
const { LearningTour } = load('src/components/home/LearningTour.tsx')
const content = { eyebrow: 'تعلّم', heading: 'عنوان المالكة', body: 'نص المالكة المخصص', primaryHref: '/courses', primaryLabel: 'الدورات', secondaryHref: '/resources', secondaryLabel: 'الموارد' }
const context = { hooks: [], cursor: 0, effects: [], id: 'tour-one' }
const render = () => { active = context; context.cursor = 0; context.effects = []; return LearningTour({ content }) }
const tabs = tree => walk(tree).filter(item => item.props.role === 'tab')
const action = (tree, label) => walk(tree).find(item => item.type === Button && text(item).includes(label))
let tree = render()
pass('Owner-authored heading and secondary destination are retained', () => { assert.ok(text(tree).includes(content.heading)); assert.equal(walk(tree).find(item => item.type === Button && item.props.href === '/resources').props.href, '/resources') })
pass('Three uniquely labelled keyboard tabs control one matching panel', () => { assert.equal(tabs(tree).length,3); const panel=walk(tree).find(item=>item.props.role==='tabpanel'); assert.ok(tabs(tree).every(item=>item.props['aria-controls']===panel.props.id)); assert.equal(panel.props['aria-labelledby'],tabs(tree)[0].props.id) })
tabs(tree)[1].props.onClick(); tree=render()
pass('Blank practice has two labelled inputs and cannot complete', () => { const fields=walk(tree).filter(item=>item.type==='textarea'); assert.equal(fields.length,2); assert.ok(fields.every(field=>walk(tree).some(label=>label.type==='label'&&label.props.htmlFor===field.props.id))); assert.equal(action(tree,'راجعي خطوتكِ').props.disabled,true) })
let fields=walk(tree).filter(item=>item.type==='textarea')
fields[0].props.onChange({target:{value:'أريد تنظيم يومي'}}); fields[1].props.onChange({target:{value:'سأختار مهمة واحدة غدًا'}}); tree=render()
pass('Actual input handlers enable completion only after both choices',()=>{assert.equal(action(tree,'راجعي خطوتكِ').props.disabled,false)})
action(tree,'راجعي خطوتكِ').props.onClick();tree=render()
pass('Review shows the actual in-page draft without invented account data',()=>{assert.ok(text(tree).includes('أريد تنظيم يومي'));assert.ok(text(tree).includes('سأختار مهمة واحدة غدًا'));assert.ok(text(tree).includes('لا يُرسل أو يُحفظ في حساب'))})
action(tree,'عدّلي خطوتكِ').props.onClick();tree=render()
pass('Returning to practice preserves both answers',()=>{const values=walk(tree).filter(item=>item.type==='textarea').map(item=>item.props.value);assert.deepEqual(values,['أريد تنظيم يومي','سأختار مهمة واحدة غدًا'])})
tabs(tree)[1].props.onKeyDown({key:'End',preventDefault(){}});tree=render()
pass('End moves to review and announces the matching active tab',()=>{assert.equal(tabs(tree)[2].props['aria-selected'],true)})
action(tree,'امسحي وابدئي من جديد').props.onClick();tree=render();tabs(tree)[1].props.onClick();tree=render()
pass('Explicit clearing resets both answers and the enabled state',()=>{assert.deepEqual(walk(tree).filter(item=>item.type==='textarea').map(item=>item.props.value),['','']);assert.equal(action(tree,'راجعي خطوتكِ').props.disabled,true)})
tabs(tree)[1].props.onKeyDown({key:'Home',preventDefault(){}});tree=render();tabs(tree)[0].props.onKeyDown({key:'ArrowLeft',preventDefault(){}});tree=render()
pass('RTL horizontal next key selects the second tab',()=>{assert.equal(tabs(tree)[1].props['aria-selected'],true)})

const { Reveal } = load('src/components/ui/Reveal.tsx')
function revealCase({ top=1000, reduced=false, manual=false, missing=false, broken=false }={}) {
  const classes=new Set(), listeners=new Map(), timers=[]
  const node={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},getBoundingClientRect:()=>({top}),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
  const media={matches:reduced,addEventListener:(name,fn)=>listeners.set('media-'+name,fn),removeEventListener:name=>listeners.delete('media-'+name)}
  let callback, options, disconnected=false, created=0
  globalThis.window={innerHeight:800,matchMedia:()=>media,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
  globalThis.document={documentElement:{dataset:{motion:manual?'reduced':'system'}}}
  globalThis.IntersectionObserver=missing?undefined:class {constructor(fn,settings){if(broken)throw Error('Unsupported');created++;callback=fn;options=settings}observe(){}disconnect(){disconnected=true}}
  const current={hooks:[],cursor:0,effects:[],id:'reveal',node};active=current;const result=Reveal({children:'محتوى ظاهر'})
  const cleanup=current.effects[0]()
  return {classes,listeners,timers,result,callback,options,created,cleanup,isDisconnected:()=>disconnected}
}
pass('Above-fold and missing-observer content never becomes hidden',()=>{for(const props of [{top:100},{missing:true},{reduced:true},{manual:true}]){const r=revealCase(props);assert.ok(!r.classes.has('reveal-pending'));assert.equal(r.created,0)}})
pass('Below-fold observer uses a zero threshold so tall sections can enter',()=>{const r=revealCase();assert.equal(r.options.threshold,0);assert.ok(r.classes.has('reveal-pending'));r.callback([{isIntersecting:false}]);r.timers[0]();assert.ok(r.classes.has('reveal-pending'));r.callback([{isIntersecting:true}]);assert.ok(!r.classes.has('reveal-pending'));assert.ok(r.isDisconnected());r.cleanup()})
pass('Broken/unresponsive observers fail open to readable content',()=>{const broken=revealCase({broken:true});assert.ok(!broken.classes.has('reveal-pending'));const r=revealCase();r.timers[0]();assert.ok(!r.classes.has('reveal-pending'));r.cleanup()})
pass('Keyboard focus and manual reduced motion immediately reveal content',()=>{const r=revealCase();r.listeners.get('focusin')();assert.ok(!r.classes.has('reveal-pending'));r.cleanup();const next=revealCase();document.documentElement.dataset.motion='reduced';next.listeners.get('heba-motion-change')();assert.ok(!next.classes.has('reveal-pending'));next.cleanup()})
const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
pass('Body text remains readable even where the 5% path crosses the cream canvas',()=>{for(const background of [brandColors.ivory,brandColors.softWhite]){const mix='#'+[1,3,5].map(i=>Math.round(parseInt(background.slice(i,i+2),16)*.95+parseInt(brandColors.deepTeal.slice(i,i+2),16)*.05).toString(16).padStart(2,'0')).join('');const [low,high]=[luminance(mix),luminance(brandColors.textSoft)].sort((a,b)=>a-b);assert.ok((high+.05)/(low+.05)>=4.5)}})
pass('Two native path assets use one 5% group with real filled geometry',()=>{for(const path of ['public/brand/journey-light-v4.svg','public/brand/journey-dark-v4.svg']){const svg=readFileSync(path,'utf8');assert.match(svg,/opacity="\.05"/);assert.match(svg,/<path[^>]+stroke="none"/);assert.ok(!svg.includes('<script'))}})
pass('Motion policy and local-only practice are explicit',()=>{const css=readFileSync('src/app/globals.css','utf8');assert.ok(css.includes('html[data-motion="reduced"]'));assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));assert.ok(css.includes('.back-to-top[hidden] {display:none}'));const tour=readFileSync('src/components/home/LearningTour.tsx','utf8');for(const token of ['fetch(','localStorage','sessionStorage','supabase'])assert.ok(!tour.includes(token));assert.ok(!readFileSync('src/components/home/Hero.tsx','utf8').includes('تعرّفي على هبة'))})
console.log(`verify:motion-v3 passed — ${count} isolated component/contrast/fallback groups. Not browser or hardware acceptance.`)
