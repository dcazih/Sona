import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const listeners = new Map()
const stores = new Map()
let networkRequests = 0
const getStore = (name) => {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)
}
const cacheAPI = {
  open: async name => ({
    match: async request => getStore(name).get(request.url)?.clone(),
    put: async (request, response) => getStore(name).set(request.url, response),
    keys: async () => [...getStore(name).keys()].map(url => new Request(url)),
    delete: async request => getStore(name).delete(request.url),
  }),
  match: async (request, { cacheName }) => getStore(cacheName).get(request.url)?.clone(),
}
vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
  self: { location: { origin: 'https://sona.example' }, addEventListener: (name, fn) => listeners.set(name, fn) },
  URL, caches: cacheAPI,
  fetch: async () => { networkRequests++; return new Response('cover bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } }) },
})
async function image(url) {
  const tasks = []
  let result
  const request = new Request(url)
  Object.defineProperty(request, 'destination', { value: 'image' })
  listeners.get('fetch')({ request, waitUntil: promise => tasks.push(promise), respondWith: promise => { result = promise } })
  assert.ok(result, 'image requests must be handled')
  const response = await result
  await Promise.all(tasks)
  assert.equal(await response.text(), 'cover bytes')
}
await image('https://music.example/rest/getCoverArt?id=album&size=700')
await image('https://music.example/rest/getCoverArt?id=album&size=700')
assert.equal(networkRequests, 1, 'revisiting an authenticated cross-origin cover must not hit the network')
await image('https://photos.example/artist.jpg')
await image('https://photos.example/artist.jpg')
assert.equal(networkRequests, 2, 'external artwork must also persist without repeat network fetches')
console.log('Persistent artwork cache: cross-origin covers and external images reused successfully.')
