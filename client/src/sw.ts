/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Necessário para registerType: 'prompt' — o cliente envia este evento para aplicar o update
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

clientsClaim()

// Injeta o precache manifest gerado pelo vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: fallback para index.html em navegações (exceto /api)
const navigationHandler = createHandlerBoundToURL('/index.html')
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api/],
})
registerRoute(navigationRoute)

// Cache de fontes externas
registerRoute(
  /^https:\/\/fonts\./i,
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
)

// ─── Share Target ────────────────────────────────────────────────────────────
// Intercepta o POST /share-target enviado pelo sistema operacional via Web Share Target API

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

registerRoute(
  ({ url, request }) => url.pathname === '/share-target' && request.method === 'POST',
  handleShareTarget,
  'POST'
)

async function handleShareTarget({ request }: { request: Request }): Promise<Response> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.redirect('/?share_error=parse', 303)
  }

  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return Response.redirect('/?share_error=nofile', 303)
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return Response.redirect('/upload?share_error=type', 303)
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.redirect('/upload?share_error=size', 303)
  }

  try {
    await savePendingShare({ file, filename: file.name, mimeType: file.type })
  } catch {
    return Response.redirect('/upload?share_error=storage', 303)
  }

  return Response.redirect('/share-target', 303)
}

// ─── IndexedDB helpers (Service Worker) ──────────────────────────────────────

const DB_NAME = 'receiptv-share'
const STORE_NAME = 'pending'
const DB_VERSION = 1

function openShareDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function savePendingShare({ file, filename, mimeType }: { file: File; filename: string; mimeType: string }): Promise<string> {
  const db = await openShareDB()
  const id = `share-${Date.now()}`
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      id,
      file,
      filename,
      mimeType,
      savedAt: new Date().toISOString(),
    })
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}
