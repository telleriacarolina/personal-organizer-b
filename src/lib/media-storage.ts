export interface MediaReference {
  id: string;
  mimeType: string;
  byteSize: number;
  createdAt: number;
}

type StoredMediaRecord = MediaReference & {
  blob: Blob;
};

const DB_NAME = 'organizer-media-db';
const STORE_NAME = 'media';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open media database'));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);
        let settled = false;
        let result: T;
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => {
          settled = true;
          db.close();
          reject(request.error ?? new Error('Media storage operation failed'));
        };
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          if (settled) return;
          settled = true;
          db.close();
          reject(transaction.error ?? new Error('Media transaction failed'));
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          db.close();
          reject(transaction.error ?? new Error('Media transaction aborted'));
        };
      })
  );
}

export async function saveMediaBlob(blob: Blob): Promise<MediaReference> {
  const now = Date.now();
  const mediaRef: MediaReference = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${now}-${Math.random()}`,
    mimeType: blob.type || 'application/octet-stream',
    byteSize: blob.size,
    createdAt: now,
  };
  const record: StoredMediaRecord = { ...mediaRef, blob };
  await withStore('readwrite', (store) => store.put(record));
  return mediaRef;
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const record = await withStore<StoredMediaRecord | undefined>('readonly', (store) => store.get(id));
  if (!record || !(record.blob instanceof Blob)) return null;
  return record.blob;
}

export async function deleteMediaBlob(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function clearAllMediaBlobs(): Promise<void> {
  await withStore('readwrite', (store) => store.clear());
}

export async function removeMediaDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Could not remove media database'));
    req.onblocked = () => reject(new Error('Media database deletion blocked by an open connection'));
  });
}
