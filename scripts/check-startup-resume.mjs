import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const code = html.match(/<script>\s*(\(function\(\)\{[\s\S]*?)<\/script>/)[1]
assert.match(html, /#sona-startup\{[^}]*height:100lvh/)

for (const restoredPage of [true, false]) {
  const documentEvents = {}, windowEvents = {}, timers = []
  const classes = new Set(['sona-booting'])
  let removed = false, faded = false
  const cover = { remove: () => { removed = true }, style: {}, classList: { add: () => { faded = true } } }
  const document = {
    documentElement: { dataset: {}, classList: { remove: name => classes.delete(name) } },
    getElementById: () => cover,
    addEventListener: (name, fn) => { documentEvents[name] = fn },
    visibilityState: 'visible',
  }
  runInNewContext(code, { document, window: { addEventListener: (name, fn) => { windowEvents[name] = fn } },
    Date, setTimeout: fn => timers.push(fn), clearTimeout: () => {}, requestAnimationFrame: fn => timers.push(fn) })
  if (restoredPage) windowEvents.pageshow({ persisted: true })
  else { documentEvents['sona:ready'](); documentEvents.visibilitychange() }
  assert.equal(removed, true)
  assert.equal(faded, false, 'Warm resume must not replay the splash fade')
  assert.equal(classes.has('sona-booting'), false)
  while (timers.length) timers.shift()()
  assert.equal(faded, false)
}
console.log('Startup uses the stable full viewport; restored/ready resumes remove the boot cover without replaying it.')
