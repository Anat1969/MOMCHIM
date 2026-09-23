// Minimal IndexedDB wrapper: one key/value store for app state, one for uploaded files.
const DB_NAME = "momchim";
const VERSION = 1;

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const idbGet = (store, key) => run(store, "readonly", (s) => s.get(key));
export const idbSet = (store, key, value) => run(store, "readwrite", (s) => s.put(value, key));
export const idbDelete = (store, key) => run(store, "readwrite", (s) => s.delete(key));
export const idbClear = (store) => run(store, "readwrite", (s) => s.clear());
