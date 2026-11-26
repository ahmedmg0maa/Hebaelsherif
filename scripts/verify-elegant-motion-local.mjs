import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Execute the actual preference and light handlers with isolated DOM adapters.
// This does not certify browser layout, appearance or physical devices.
let current, groups = 0
const react = {
  useRef: () => ({ current: current.node }),
  useEffect: callback => current.effects.push(callback),
  useSyncExternalStore(subscribe, snapshot) { current.subscription = subscribe; current.snapshot = snapshot; return snapshot() },
}
const jsx = (type, props) => ({ type, props })
function load(path, extras = {}) {
  const imports = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, ...extras }
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', source)(name => { assert.ok(name in imports); return imports[name] }, loaded, loaded.exports)
  return loaded.exports
}
function fixture({ reduced = false, fine = true } = {}) {
  const hostEvents = new Map(), windowEvents = new Map(), pointerEvents = new Map(), mediaEvents = new Map(), frames = new Map()
  let sequence = 0
  const host = { getBoundingClientRect: () => ({ left: 10, top: 20 }), addEventListener: (n, f) => hostEvents.set(n, f), removeEventListener: n => hostEvents.delete(n) }
  const node = { closest: () => host, style: {} }
  const media = { matches: reduced, addEventListener: (n, f) => mediaEvents.set(n, f), removeEventListener: n => mediaEvents.delete(n) }
  const pointer = { matches: fine, addEventListener: (n, f) => pointerEvents.set(n, f), removeEventListener: n => pointerEvents.delete(n) }
  globalThis.window = { matchMedia: query => query.includes('pointer') ? pointer : media, addEventListener: (n, f) => windowEvents.set(n, f), removeEventListener: n => windowEvents.delete(n), dispatchEvent: event => windowEvents.get(event.type)?.(event) }
  globalThis.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence }
  globalThis.cancelAnimationFrame = id => frames.delete(id)
  current = { effects: [], node }
  return { node, media, hostEvents, windowEvents, pointerEvents, mediaEvents, frames, context: current }
}
function pass(label, fn) { fn(); groups++; console.log(`PASS ${label}`) }
const preferences = load('src/components/motion/MotionToggle.tsx')
pass('Device motion changes are observed and unsubscribed without a manual override', () => {
  const f = fixture(); assert.equal(preferences.useReducedMotion(), false)
  let updates = 0; const unsubscribe = f.context.subscription(() => updates++)
  f.media.matches = true; f.mediaEvents.get('change')()
  assert.equal(f.context.snapshot(), true); assert.equal(updates, 1)
  unsubscribe(); assert.equal(f.mediaEvents.size, 0)
})
pass('Retiring the old page setting preserves the theme and unrelated local data', () => {
  const f = fixture(), data = new Map([['heba-motion', 'reduced'], ['heba-theme', 'dark'], ['draft', 'keep']])
  globalThis.document = { documentElement: { dataset: { motion: 'reduced' } } }
  globalThis.localStorage = { removeItem: key => data.delete(key) }
  preferences.MotionPreferenceController(); f.context.effects[0]()
  assert.equal(document.documentElement.dataset.motion, 'system'); assert.ok(!data.has('heba-motion')); assert.equal(data.get('heba-theme'), 'dark'); assert.equal(data.get('draft'), 'keep')
})
function light(props) {
  const f = fixture(props)
  const { HeroLight } = load('src/components/motion/HeroLight.tsx', { './MotionToggle': { useReducedMotion: () => props?.reduced ?? false } })
  const rendered = HeroLight(); const cleanup = f.context.effects[0]()
  assert.equal(rendered.props['aria-hidden'], true)
  return { ...f, cleanup }
}
pass('Reduced-motion and coarse-pointer devices allocate no pointer listeners', () => {
  for (const props of [{ reduced: true }, { fine: false }]) { const f = light(props); assert.equal(f.hostEvents.size, 0); assert.equal(f.frames.size, 0) }
})
pass('Fine-pointer movement is batched once per frame using the latest position', () => {
  const f = light(); f.hostEvents.get('pointermove')({ clientX: 100, clientY: 200, pointerType: 'mouse' }); f.hostEvents.get('pointermove')({ clientX: 120, clientY: 220, pointerType: 'mouse' })
  assert.equal(f.frames.size, 1); const callback = [...f.frames.values()][0]; f.frames.clear(); callback()
  assert.equal(f.node.style.transform, 'translate3d(-98px,-8px,0)'); assert.equal(f.node.style.opacity, '1')
  f.cleanup()
})
pass('Touch input is ignored and scrolling cancels pending light work', () => {
  const f = light(); f.hostEvents.get('pointermove')({ pointerType: 'touch' }); assert.equal(f.frames.size, 0)
  f.hostEvents.get('pointermove')({ clientX: 60, clientY: 50, pointerType: 'mouse' }); assert.equal(f.frames.size, 1)
  f.windowEvents.get('scroll')(); assert.equal(f.frames.size, 0); assert.equal(f.node.style.opacity, '0'); f.cleanup()
})
pass('Unmount removes every listener and scheduled frame', () => {
  const f = light(); f.hostEvents.get('pointermove')({ clientX: 20, clientY: 30, pointerType: 'mouse' }); f.cleanup()
  for (const values of [f.hostEvents, f.windowEvents, f.pointerEvents, f.frames]) assert.equal(values.size, 0)
})
console.log(`verify:elegant-motion passed — ${groups} actual-handler groups; no browser/device acceptance.`)
