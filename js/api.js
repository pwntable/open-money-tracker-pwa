// PASTE URL GOOGLE APPS SCRIPT KAU KAT SINI
const API_URL = "https://script.google.com/macros/s/AKfycbznwyuau5baB8Bvf8mLDe8LDGyoe4F51DwGK0c6zAf3m2zXA47IAu5-deXjckLy4ezt/exec"; 

const API = {
  // Generate UUID
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // 1. SAVE (Local & Try Sync)
  async save(data) {
    const txn = {
      ...data,
      id: this.uuid(),
      synced: 0 
    };
    await DB.addTransaction(txn);
    if (navigator.onLine) {
      this.syncItem(txn);
    }
    return txn;
  },

  // 2. UPLOAD SATU ITEM (Push)
  async syncItem(txn) {
    try {
      const payload = { action: 'add', data: txn };
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await DB.markSynced(txn.id);
      console.log("Uploaded:", txn.id);
    } catch (e) {
      console.log("Sync failed, will retry later.");
    }
  },

  // 3. UPLOAD SEMUA PENDING
  async syncAllPending() {
    if (!navigator.onLine) return;
    const pending = await DB.getUnsynced();
    if (pending.length === 0) return;
    console.log(`Uploading ${pending.length} items...`);
    for (const txn of pending) {
      await this.syncItem(txn);
    }
  },

  // 4. DOWNLOAD DARI SHEET (Pull)
  async pullFromCloud() {
    if (!navigator.onLine) return false;

    try {
      console.log("Fetching data from cloud...");
      const response = await fetch(`${API_URL}?action=get`);
      
      // Kalau response bukan JSON, dia akan error kat sini
      const json = await response.json(); 
      console.log("Cloud response:", json); // Check console kalau keluar ni

      if (json.success && json.data.length > 0) {
        for (let item of json.data) {
          item.amount = parseFloat(item.amount);
          item.synced = 1; 
          await DB.addTransaction(item);
        }
        return true; 
      }
    } catch (e) {
      console.error("Error pulling data:", e);
    }
    return false;
  }
};
