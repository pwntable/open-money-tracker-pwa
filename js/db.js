const DB_NAME = 'MoneyTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('synced', 'synced', { unique: false });
    }
  };

  request.onsuccess = (e) => resolve(e.target.result);
  request.onerror = (e) => reject(e.target.error);
});

const DB = {
  async addTransaction(txn) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(txn);
    return tx.complete;
  },

  async getAllTransactions() {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getUnsynced() {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.getAll(0); // 0 = false (not synced)
      request.onsuccess = () => resolve(request.result);
    });
  },

  async markSynced(id) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const itemReq = store.get(id);
    
    itemReq.onsuccess = () => {
      const item = itemReq.result;
      if (item) {
        item.synced = 1; // 1 = true
        store.put(item);
      }
    };
  },
  
  async deleteTransaction(id) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return tx.complete;
  }
};