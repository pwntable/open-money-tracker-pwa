// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker Registered'));
}

// Global State
let transactions = [];

window.addEventListener('load', async () => {
  renderDate();
  
  // 1. Load apa yang ada dalam handphone dulu (supaya laju)
  await loadTransactions();
  
  // 2. Check internet & Upload data yang pending (kalau ada)
  API.syncAllPending();
  
  // 3. DOWNLOAD data baru dari Google Sheet
  const connectionStatus = document.getElementById('connection-status');
  if(connectionStatus) connectionStatus.innerText = "Syncing...";
  
  const hasNewData = await API.pullFromCloud();
  
  if (hasNewData) {
    // Kalau ada data baru dari cloud, refresh list semula
    await loadTransactions();
    showToast("Data Updated from Cloud!");
    if(connectionStatus) connectionStatus.innerText = "All caught up.";
  } else {
    if(connectionStatus) connectionStatus.innerText = "Offline / No changes.";
  }

  // Listen for online status
  window.addEventListener('online', () => {
    API.syncAllPending();
    API.pullFromCloud().then(res => { if(res) loadTransactions(); });
  });
});

function renderDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => input.value = today);
}

// --- UI NAVIGATION ---
window.goToPage = (id) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  const navMap = { 'dashboard': 'nav-stats', 'list': 'nav-list' };
  const navId = navMap[id] || 'nav-record';
  document.getElementById(navId).classList.add('active');
};

// --- FORM HANDLING ---
window.handleSave = async (e, type) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  data.type = type;
  data.amount = parseFloat(data.amount);
  
  // Save using our Offline-First API
  await API.save(data);
  
  e.target.reset();
  renderDate(); // reset date
  showToast("Saved!");
  
  await loadTransactions();
  goToPage('main');
};

// --- RENDERERS ---
function renderList() {
  const container = document.getElementById('list-container');
  container.innerHTML = "";
  
  if (transactions.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;margin-top:20px">No records found.</p>';
    return;
  }

  transactions.forEach(t => {
    const isIncome = t.type === 'Income';
    const colorClass = isIncome ? 'amt-in' : 'amt-out';
    const sign = isIncome ? '+' : '-';
    const syncStatus = t.synced ? '' : '<span style="color:orange; font-size:12px;">(Pending Sync)</span>';

    const html = `
      <div class="card">
        <div class="txn-item">
          <div class="txn-left">
            <div class="txn-cat">${t.category} ${syncStatus}</div>
            <div class="txn-meta">${t.date} • ${t.platform}</div>
            <div class="txn-meta" style="font-style:italic">${t.desc || ''}</div>
          </div>
          <div class="txn-right">
            <div class="txn-amt ${colorClass}">${sign} RM${t.amount.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += html;
  });
}

function renderDashboard() {
  const totalInc = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExp = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const bal = totalInc - totalExp;

  document.getElementById('dash-balance').innerText = `RM ${bal.toFixed(2)}`;
  document.getElementById('dash-inc').innerText = `RM ${totalInc.toFixed(2)}`;
  document.getElementById('dash-exp').innerText = `RM ${totalExp.toFixed(2)}`;
}

window.showToast = (msg) => {
  const x = document.getElementById("toast");
  x.innerText = msg;
  x.className = "show";
  setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}
