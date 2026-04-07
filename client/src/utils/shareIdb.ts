// Helper client-side para acessar o IndexedDB do Share Target.
// O Service Worker escreve neste banco; a ShareTargetPage lê e deleta.

const DB_NAME = 'receiptv-share'
const STORE_NAME = 'pending'
const DB_VERSION = 1
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutos

export interface PendingShare {
  id: string;
  file: File;
  filename: string;
  mimeType: string;
  savedAt: string;
}

export interface ExpiredShare {
  expired: true;
  id: string;
}

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

/**
 * Retorna o share pendente mais recente.
 * - null: nenhum share encontrado
 * - { expired: true, id }: share encontrado mas expirado (> 30min)
 * - { id, file, filename, mimeType, savedAt }: share válido
 */
export async function getPendingShare(): Promise<PendingShare | ExpiredShare | null> {
  const db = await openShareDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const records = req.result as PendingShare[]
      if (!records.length) return resolve(null)

      const sorted = records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      const latest = sorted[0]
      const age = Date.now() - new Date(latest.savedAt).getTime()

      if (age > MAX_AGE_MS) return resolve({ expired: true, id: latest.id })
      resolve(latest)
    }
    req.onerror = () => reject(req.error)
  })
}

/** Remove um share pelo id. */
export async function deletePendingShare(id: string): Promise<void> {
  const db = await openShareDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
