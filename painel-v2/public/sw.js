// Service Worker do Painel Gabinete Marco Xavier
// Cache "network-first" pra HTML/dados (sempre tenta online primeiro)
// e "cache-first" pra assets estáticos (JS, CSS, imagens, fontes).

const CACHE_VERSION = 'gabinete-mx-v1'
const APP_SHELL = [
  '/',
  '/logo-azul.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignora requests POST/PUT/DELETE e qualquer coisa que não seja GET
  if (event.request.method !== 'GET') return

  // Ignora Supabase, OpenAI, TRE-SP e TSE (sempre online)
  if (
    url.host.includes('supabase') ||
    url.host.includes('openai.com') ||
    url.host.includes('tre-sp.jus.br') ||
    url.host.includes('tse.jus.br')
  ) return

  // Assets estáticos: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/i) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached ||
        fetch(event.request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy)).catch(() => {})
          return res
        }).catch(() => cached)
      )
    )
    return
  }

  // HTML / index: network-first com fallback pro cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(event.request).then((m) => m || caches.match('/')))
  )
})
