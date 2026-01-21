// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const API_URL = "https://script.google.com/macros/s/AKfycbzys5S2pqt1TLjs3XliiBtE14AqT4289JURWBsnJkdv457Z5udS8qAf-m1xr96YOdku/exec"; 

const API = {
  // Generate UUID
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  async save(data) {
    // 1. Prepare data
    const txn = {
      ...data,
      id: this.uuid(),
      synced: 0 // 0 = false (unsynced)
    };

    // 2. Save Local immediately
    await DB.addTransaction(txn);
    
    // 3. Try to sync if online
    if (navigator.onLine) {
      this.syncItem(txn);
    }
    
    return txn;
  },

  async syncItem(txn) {
    try {
      // Send as pure JSON text to avoid CORS preflight complications with simple requests
      // Using 'no-cors' mode is restrictive, so we use standard POST with text/plain 
      // which Apps Script can parse via JSON.parse(e.postData.contents)
      
      const payload = { action: 'add', data: txn };
      
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script specific trick for simple fire-and-forget
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Assume success if no network error (due to no-cors opacity)
      await DB.markSynced(txn.id);
      console.log("Synced:", txn.id);
      
    } catch (e) {
      console.log("Sync failed, will retry later.");
    }
  },

  async syncAllPending() {
    if (!navigator.onLine) return;
    const pending = await DB.getUnsynced();
    if (pending.length === 0) return;
    
    console.log(`Syncing ${pending.length} items...`);
    for (const txn of pending) {
      await this.syncItem(txn);
    }
  },

  async fetchRemote() {
    // Fetch latest from Google Sheets to update local cache
    // Note: In a robust app, you would merge changes. 
    // Here we just fetch to console for demonstration or complex logic.
    try {
        const response = await fetch(`${API_URL}?action=get`);
        const result = await response.json();
        return result.data;
    } catch(e) {
        console.error("Offline or API Error");
        return [];
    }
  }
};
