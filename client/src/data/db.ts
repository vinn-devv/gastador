export const DB_NAME = 'gastador';
export const DB_VERSION = 1;

export type StoreName = 'settings' | 'categories' | 'cycles' | 'cycleLimits' | 'transactions' | 'goals' | 'contributions' | 'receipts';

export const DATA_STORES: StoreName[] = ['categories', 'cycles', 'cycleLimits', 'transactions', 'goals', 'contributions'];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('categories', { keyPath: 'id' });
      db.createObjectStore('cycles', { keyPath: 'id' });
      db.createObjectStore('cycleLimits', { keyPath: 'key' });
      const txs = db.createObjectStore('transactions', { keyPath: 'id' });
      txs.createIndex('date', 'date');
      db.createObjectStore('goals', { keyPath: 'id' });
      const contributions = db.createObjectStore('contributions', { keyPath: 'id' });
      contributions.createIndex('goalId', 'goalId');
      db.createObjectStore('receipts', { keyPath: 'hash' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Could not open local storage.'));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('Local storage is blocked by another open tab. Close other Gastador tabs and retry.'));
    };
  });
  return dbPromise;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function runTx<T>(stores: StoreName[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    let failed = false;
    tx.oncomplete = () => {
      if (!failed) resolve(result);
    };
    tx.onabort = () => reject(tx.error ?? new Error('Local storage transaction was aborted.'));
    tx.onerror = () => reject(tx.error);
    Promise.resolve()
      .then(() => fn(tx))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        failed = true;
        try {
          tx.abort();
        } catch {
          void 0;
        }
        reject(error);
      });
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return runTx([store], 'readonly', (tx) => requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>));
}

export async function getOne<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return runTx([store], 'readonly', (tx) => requestToPromise(tx.objectStore(store).get(key) as IDBRequest<T | undefined>));
}

export async function putOne(store: StoreName, value: unknown): Promise<void> {
  await runTx([store], 'readwrite', (tx) => requestToPromise(tx.objectStore(store).put(value)));
}

export async function deleteOne(store: StoreName, key: IDBValidKey): Promise<void> {
  await runTx([store], 'readwrite', (tx) => requestToPromise(tx.objectStore(store).delete(key)));
}

export async function resetDatabaseForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
