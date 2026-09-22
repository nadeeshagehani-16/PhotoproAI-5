// Deposits Page – Full CRUD with Refund/Forfeit
let _depositsCache = [];
let _depCustomers = [];
// ADDED BY TEAM - Search & Filter: currently selected status tab (combined with the search box)
let _depStatusTab = 'All';

function _depTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _showDepErrors(errEl, errors, btn, btnText) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  if (btn) { btn.disabled = false; btn.textContent = btnText; }
}

async function renderDeposits() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Security Deposits', 'Track equipment rental security deposits', `<button onclick="openAddDepositModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Record Deposit</button>`)}
    <div id="dep-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="dep-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadDeposits();
}

async function loadDeposits() {
  try {
    const [depRes, custRes] = await Promise.all([api.getDeposits(), api.getCustomers()]);
    _depositsCache = depRes.data;
    _depCustomers = custRes.data || [];
    renderDepositsTable(_depositsCache);
  } catch (err) {
    _depositsCache = MOCK.deposits || [];
    _depCustomers = MOCK.clients || [];
    if (_depositsCache.length > 0) {
      renderDepositsTable(_depositsCache);
      const content = document.getElementById('dep-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('dep-loading').classList.add('hidden');
      const content = document.getElementById('dep-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadDeposits()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function depositRow(d) {
  const did = d._id || d.id;
  const clientName = d.customerId?.name || d.customer || '—';
  const statusCls = (d.status||'').toLowerCase();
  const statusColor = statusCls==='held'?'text-blue-700 bg-blue-50':statusCls==='refunded'?'text-green-700 bg-green-50':statusCls==='forfeited'?'text-red-700 bg-red-50':'text-gray-600 bg-gray-50';
  const actions = d.status === 'Held' ? `
    <button onclick="handleRefundDeposit('${did}')" class="btn-action" title="Refund"><i data-lucide="rotate-ccw" class="w-4 h-4 text-success"></i></button>
    <button onclick="handleForfeitDeposit('${did}')" class="btn-action" title="Forfeit"><i data-lucide="x-circle" class="w-4 h-4 text-warning"></i></button>
    <button onclick="openEditDepositModal('${did}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
  ` : `<button onclick="openEditDepositModal('${did}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>`;
  return `<tr>
    <td><span class="font-semibold text-sm">${clientName}</span></td>
    <td class="font-bold text-sm">${formatCurrency(d.amount||0)}</td>
    <td class="text-sm text-text-secondary max-w-[180px] truncate">${d.purpose||'—'}</td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor}">${d.status||'—'}</span></td>
    <td class="text-sm">${d.paymentMethod||'—'}</td>
    <td class="text-sm text-text-secondary">${d.refundDate ? formatCurrency(d.refundAmount||0) + ' on ' + (d.refundDate).toString().split('T')[0] : '—'}</td>
    <td><div class="flex items-center gap-1">${actions}</div></td>
  </tr>`;
}

function renderDepositsTable(deposits) {
  document.getElementById('dep-loading').classList.add('hidden');
  const content = document.getElementById('dep-content');
  content.classList.remove('hidden');
  // Fresh render resets the active status tab to "All"
  _depStatusTab = 'All';
  const totalHeld = deposits.filter(d => d.status==='Held').reduce((s,d) => s + (d.amount||0), 0);
  const totalRefunded = deposits.filter(d => d.status==='Refunded').reduce((s,d) => s + (d.refundAmount||0), 0);
  content.innerHTML = `
    ${kpiCards([
      { label:'Total Held', value:formatCurrency(totalHeld), icon:'lock', iconBg:'bg-blue-100', iconColor:'text-blue-600' },
      { label:'Total Refunded', value:formatCurrency(totalRefunded), icon:'rotate-ccw', iconBg:'bg-green-100', iconColor:'text-green-600' },
      { label:'Total Deposits', value:deposits.length, icon:'shield', iconBg:'bg-purple-100', iconColor:'text-purple-600' },
      { label:'Forfeited', value:deposits.filter(d=>d.status==='Forfeited').length, icon:'x-circle', iconBg:'bg-red-100', iconColor:'text-red-600' },
    ])}
    <!-- ADDED BY TEAM - Search & Filter: search box (applied together with the status tabs) -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i>
        <input id="dep-search" type="text" placeholder="Search deposits by client, purpose or method..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition" />
      </div>
    </div>
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Held','Refunded','Forfeited'].map((s,i) => `<button onclick="filterDepByStatus('${s}')" class="dep-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Client</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Method</th><th>Refund</th><th>Actions</th></tr></thead>
        <tbody id="dep-tbody">${deposits.map(d => depositRow(d)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary"><span id="dep-count">Showing ${deposits.length} deposit(s)</span></div>`;
  // ADDED BY TEAM - Search & Filter: wire search input to the combined filter
  const searchInput = document.getElementById('dep-search');
  if (searchInput) searchInput.addEventListener('input', () => applyDepFilters());
  lucide.createIcons();
}

function filterDepByStatus(status) {
  _depStatusTab = status;
  document.querySelectorAll('.dep-tab').forEach(t => {
    t.className = 'dep-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ' +
      (t.textContent.trim() === status ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  applyDepFilters();
}

// ADDED BY TEAM - Search & Filter: combined filtering — search text AND active status tab applied together
function applyDepFilters() {
  const searchEl = document.getElementById('dep-search');
  const q = (searchEl ? searchEl.value : '').toLowerCase();
  const filtered = _depositsCache.filter(d => {
    const clientName = (d.customerId?.name || d.customer || '').toLowerCase();
    const purpose = (d.purpose || '').toLowerCase();
    const method = (d.paymentMethod || '').toLowerCase();
    const matchesSearch = !q || clientName.includes(q) || purpose.includes(q) || method.includes(q);
    const matchesStatus = _depStatusTab === 'All' || d.status === _depStatusTab;
    return matchesSearch && matchesStatus;
  });
  const tbody = document.getElementById('dep-tbody');
  if (tbody) tbody.innerHTML = filtered.map(d => depositRow(d)).join('');
  const countEl = document.getElementById('dep-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} deposit(s)`;
  lucide.createIcons();
}

// ── Refund Deposit ──
async function handleRefundDeposit(id) {
  const d = _depositsCache.find(x => (x._id||x.id) == id);
  if (!d) return;
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="rotate-ccw" class="w-7 h-7 text-success"></i></div>
    <h2 class="text-xl font-bold mb-2">Refund Deposit?</h2>
    <p class="text-text-secondary text-sm mb-4">Refund <strong>${formatCurrency(d.amount)}</strong> to <strong>${d.customerId?.name||'client'}</strong>?</p>
    <div><label class="block text-sm font-medium text-text-secondary mb-1">Refund Amount</label><input id="refund-amount" type="number" value="${d.amount}" min="0" max="${d.amount}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
    <div id="refund-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mt-3"></div>
    <div class="flex gap-3 mt-4">
      <button onclick="confirmRefundDeposit('${id}')" id="refund-confirm" class="flex-1 py-2.5 bg-success text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition">Confirm Refund</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function confirmRefundDeposit(id) {
  const btn = document.getElementById('refund-confirm');
  const errEl = document.getElementById('refund-error');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Processing...';
  try {
    const d = _depositsCache.find(x => (x._id||x.id) == id);
    const amount = parseFloat(document.getElementById('refund-amount').value);
    const errors = [];
    if (isNaN(amount)) errors.push('Refund amount must be a valid number.');
    else if (amount < 0) errors.push('Refund amount cannot be negative.');
    else if (d && amount > d.amount) errors.push('Refund amount cannot exceed the deposit amount.');
    if (errors.length > 0) { _showDepErrors(errEl, errors, btn, 'Confirm Refund'); return; }
    await api.updateDeposit(id, { status: 'Refunded', refundAmount: amount, refundDate: _depTodayStr() });
    closeModal(); showToast('Deposit refunded successfully!'); await loadDeposits();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Confirm Refund';
  }
}

// ── Forfeit Deposit ──
async function handleForfeitDeposit(id) {
  const d = _depositsCache.find(x => (x._id||x.id) == id);
  if (!d) return;
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="x-circle" class="w-7 h-7 text-warning"></i></div>
    <h2 class="text-xl font-bold mb-2">Forfeit Deposit?</h2>
    <p class="text-text-secondary text-sm mb-6">Forfeit <strong>${formatCurrency(d.amount)}</strong> from <strong>${d.customerId?.name||'client'}</strong>? This action cannot be reversed.</p>
    <div id="forfeit-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="confirmForfeitDeposit('${id}')" id="forfeit-confirm" class="flex-1 py-2.5 bg-warning text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition">Yes, Forfeit</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function confirmForfeitDeposit(id) {
  const btn = document.getElementById('forfeit-confirm');
  btn.disabled = true; btn.textContent = 'Processing...';
  try {
    await api.updateDeposit(id, { status: 'Forfeited', refundAmount: 0 });
    closeModal(); showToast('Deposit forfeited successfully!'); await loadDeposits();
  } catch (err) {
    document.getElementById('forfeit-error').textContent = err.message;
    document.getElementById('forfeit-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Forfeit';
  }
}

// ── Add Deposit Modal ──
function openAddDepositModal() {
  const clients = _depCustomers.length > 0 ? _depCustomers : (MOCK.clients || []);
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Record Deposit</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-dep-form" onsubmit="handleCreateDeposit(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="adp-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}">${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.) *</label><input id="adp-amount" type="number" required min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="5000" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Payment Method</label><select id="adp-method" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Credit Card</option><option>Debit Card</option><option>Bank Transfer</option><option>Cash</option><option>Online</option></select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Transaction Ref</label><input id="adp-txn" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="TXN-DEP-xxx" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Purpose</label><input id="adp-purpose" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Equipment security deposit" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="adp-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none" placeholder="Additional notes..."></textarea></div>
      <div id="adp-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="adp-submit" class="btn-dark flex-1 py-2.5 text-sm">Record Deposit</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateDeposit(e) {
  e.preventDefault();
  const errEl = document.getElementById('adp-error');
  const btn = document.getElementById('adp-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Recording...';
  try {
    const formData = {
      customerId: document.getElementById('adp-client').value,
      amount: parseFloat(document.getElementById('adp-amount').value),
      paymentMethod: document.getElementById('adp-method').value,
      transactionRef: document.getElementById('adp-txn').value.trim(),
      purpose: document.getElementById('adp-purpose').value.trim(),
      notes: document.getElementById('adp-notes').value.trim(),
      status: 'Held',
    };
    const errors = [];
    if (!formData.customerId) errors.push('Please select a client.');
    if (isNaN(formData.amount)) errors.push('Amount is required and must be a valid number.');
    else if (formData.amount < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    if (!formData.purpose) errors.push('Purpose is required.');
    if (errors.length > 0) { _showDepErrors(errEl, errors, btn, 'Record Deposit'); return; }
    await api.createDeposit(formData);
    closeModal(); showToast('Deposit recorded successfully!'); await loadDeposits();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Record Deposit';
  }
}

// ── Edit Deposit Modal ──
function openEditDepositModal(id) {
  const d = _depositsCache.find(x => (x._id||x.id) == id);
  if (!d) return;
  const clients = _depCustomers.length > 0 ? _depCustomers : (MOCK.clients || []);
  const custId = d.customerId?._id || d.customerId || '';
  const esc = (s) => (s||'').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Deposit</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-dep-form" onsubmit="handleUpdateDeposit(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client</label><select id="edp-client" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}" ${(c._id||c.id)===custId?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.)</label><input id="edp-amount" type="number" min="0" value="${d.amount||0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Purpose</label><input id="edp-purpose" type="text" value="${esc(d.purpose)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="edp-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none">${esc(d.notes)}</textarea></div>
      <div id="edp-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="edp-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateDeposit(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('edp-error');
  const btn = document.getElementById('edp-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const formData = {
      customerId: document.getElementById('edp-client').value,
      amount: parseFloat(document.getElementById('edp-amount').value),
      purpose: document.getElementById('edp-purpose').value.trim(),
      notes: document.getElementById('edp-notes').value.trim(),
    };
    const errors = [];
    if (!formData.customerId) errors.push('Please select a client.');
    if (isNaN(formData.amount)) errors.push('Amount is required and must be a valid number.');
    else if (formData.amount < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    if (!formData.purpose) errors.push('Purpose is required.');
    if (errors.length > 0) { _showDepErrors(errEl, errors, btn, 'Save Changes'); return; }
    await api.updateDeposit(id, formData);
    closeModal(); showToast('Deposit updated successfully!'); await loadDeposits();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}
