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
      synced: 0 // 0 = Belum sync
    };

    await DB.addTransaction(txn); // Simpan local dulu
    
    if (navigator.onLine) {
      this.syncItem(txn); // Terus hantar kalau ada internet
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
      
      // Update status jadi 'synced'
      await DB.markSynced(txn.id);
      console.log("Uploaded:", txn.id);
      
    } catch (e) {
      console.log("Sync failed, will retry later.");
    }
  },

  // 3. UPLOAD SEMUA PENDING (Push All)
  async syncAllPending() {
    if (!navigator.onLine) return;
    const pending = await DB.getUnsynced();
    if (pending.length === 0) return;
    
    console.log(`Uploading ${pending.length} items...`);
    for (const txn of pending) {
      await this.syncItem(txn);
    }
  },

  // 4. DOWNLOAD DARI SHEET (Pull) - INI YANG KITA TAMBAH
  async pullFromCloud() {
    if (!navigator.onLine) return false;

    try {
      console.log("Fetching data from cloud...");
      const response = await fetch(`${API_URL}?action=get`);
      const json = await response.json();

      if (json.success && json.data.length > 0) {
        // Masukkan setiap data dari cloud ke dalam local DB
        for (let item of json.data) {
          // Pastikan format nombor betul
          item.amount = parseFloat(item.amount);
          // Tandakan sebagai dah sync (sebab datang dari cloud)
          item.synced = 1; 
          
          // Save ke DB (akan overwrite kalau ID sama, atau tambah kalau baru)
          await DB.addTransaction(item);
        }
        console.log("Cloud data merged.");
        return true; // Beritahu ada data baru
      }
    } catch (e) {
      console.error("Error pulling data:", e);
    }
    return false;
  }
};
