// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker Registered'));
}

// Global State
let transactions = [];

window.addEventListener('load', async () => {
  renderDate();
  
  // 1. Load data dari handphone (Local)
  await loadTransactions();
  
  // 2. Check connection status
  const connectionStatus = document.getElementById('connection-status');
  
  // 3. Sync data (Upload pending & Download baru)
  if (navigator.onLine) {
    if(connectionStatus) connectionStatus.innerText = "Syncing with cloud...";
    
    // Upload yang pending dulu
    await API.syncAllPending();
    
    // Download yang baru dari Google Sheet
    const hasNewData = await API.pullFromCloud();
    
    if (hasNewData) {
      await loadTransactions(); // Refresh list kalau ada data baru
      showToast("Data Updated from Cloud!");
      if(connectionStatus) connectionStatus.innerText = "All caught up.";
    } else {
      if(connectionStatus) connectionStatus.innerText = "Online. No new data.";
    }
  } else {
    if(connectionStatus) connectionStatus.innerText = "Offline Mode";
  }

  // Listen bila internet connect balik
  window.addEventListener('online', () => {
    API.syncAllPending();
    API.pullFromCloud().then(res => { if(res) loadTransactions(); });
  });
});

// --- FUNCTION PENTING YANG HILANG TADI ---
async function loadTransactions() {
  // Ambil semua data dari database
  transactions = await DB.getAllTransactions();
  
  // Susun ikut tarikh (Paling baru kat atas)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Update paparan
  renderList();
  renderDashboard();
}

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
  
  // Kalau masuk page list, render semula untuk pastikan fresh
  if (id === 'list') renderList();
};

// --- FORM HANDLING ---
window.handleSave = async (e, type) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  data.type = type;
  data.amount = parseFloat(data.amount);
  
  // Save guna API
  await API.save(data);
  
  e.target.reset();
  renderDate();
  showToast("Saved!");
  
  await loadTransactions();
  goToPage('main');
};

// --- RENDERERS ---
function renderList() {
  const container = document.getElementById('list-container');
  if (!container) return; // Safety check
  
  container.innerHTML = "";
  
  if (transactions.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;margin-top:50px">No records found.</p>';
    return;
  }

  transactions.forEach(t => {
    const isIncome = t.type === 'Income';
    const colorClass = isIncome ? 'amt-in' : 'amt-out';
    const sign = isIncome ? '+' : '-';
    // Kalau synced=1 (true), tak payah tunjuk text. Kalau 0 (false), tunjuk "Pending"
    const syncStatus = t.synced ? '' : '<span style="color:orange; font-size:11px; font-weight:normal;">(Syncing...)</span>';

    const html = `
      <div class="card">
        <div class="txn-item">
          <div class="txn-left">
            <div class="txn-cat">${t.category} ${syncStatus}</div>
            <div class="txn-meta">${t.date} • ${t.platform}</div>
            <div class="txn-meta" style="font-style:italic; font-size:0.75rem">${t.desc || ''}</div>
          </div>
          <div class="txn-right">
            <div class="txn-amt ${colorClass}">${sign} RM${parseFloat(t.amount).toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += html;
  });
}

function renderDashboard() {
  const totalInc = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExp = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const bal = totalInc - totalExp;

  const balEl = document.getElementById('dash-balance');
  const incEl = document.getElementById('dash-inc');
  const expEl = document.getElementById('dash-exp');

  if(balEl) balEl.innerText = `RM ${bal.toFixed(2)}`;
  if(incEl) incEl.innerText = `RM ${totalInc.toFixed(2)}`;
  if(expEl) expEl.innerText = `RM ${totalExp.toFixed(2)}`;
}

window.showToast = (msg) => {
  const x = document.getElementById("toast");
  if (!x) return;
  x.innerText = msg;
  x.className = "show";
  setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}
