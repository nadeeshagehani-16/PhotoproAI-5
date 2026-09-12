// Payments Page – Full CRUD
let _paymentsCache = [];
let _payCustomers = [];

// ── Validation Helpers ──
function _payTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _validatePaymentForm(data) {
  const errors = [];
  const today = _payTodayStr();

  // Required fields
  if (!data.customerId) errors.push('Please select a client.');
  if (data.amount === undefined || data.amount === null || isNaN(data.amount)) {
    errors.push('Amount is required and must be a valid number.');
  }
  if (!data.method) errors.push('Please select a payment method.');
  if (!data.type) errors.push('Please select a payment type.');
  if (!data.date) errors.push('Please select a payment date.');

  // Date must be today or future
  if (data.date && data.date < today) {
    errors.push('Date cannot be in the past. Please select today or a future date.');
  }

  // Amount cannot be negative
  if (!isNaN(data.amount) && data.amount < 0) {
    errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  return errors;
}

function _showPayErrors(errEl, errors, btn, btnText) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false; btn.textContent = btnText;
}

async function renderInvoices() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Payments & Invoices', 'Track all financial transactions', `<button onclick="openAddPaymentModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Record Payment</button>`)}
    <div id="pay-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="pay-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadPayments();
}

async function loadPayments() {
  try {
    const [payRes, custRes] = await Promise.all([api.getPayments(), api.getCustomers()]);
    _paymentsCache = payRes.data;
    _payCustomers = custRes.data || [];
    renderPaymentsTable(_paymentsCache);
  } catch (err) {
    _paymentsCache = MOCK.payments || [];
    _payCustomers = MOCK.clients || [];
    if (_paymentsCache.length > 0) {
      renderPaymentsTable(_paymentsCache);
      const content = document.getElementById('pay-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('pay-loading').classList.add('hidden');
      const content = document.getElementById('pay-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadPayments()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function paymentRow(p) {
  const pid = p._id || p.id;
  const clientName = p.customerId?.name || p.customer || '—';
  const statusCls = (p.status||'').toLowerCase();
  const statusColor = statusCls==='completed'?'text-success bg-green-50':statusCls==='pending'?'text-warning bg-amber-50':statusCls==='failed'?'text-error bg-red-50':'text-gray-600 bg-gray-50';
  return `<tr>
    <td><span class="font-mono text-xs text-text-secondary">${p.referenceId||'—'}</span></td>
    <td><span class="font-semibold text-sm">${clientName}</span></td>
    <td class="font-bold text-sm">${formatCurrency(p.amount||0)}</td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">${p.method||'—'}</span></td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">${p.type||'—'}</span></td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor}">${p.status||'—'}</span></td>
    <td class="text-sm text-text-secondary">${(p.date||'').toString().split('T')[0] || '—'}</td>
    <td><div class="flex items-center gap-1">
      <button onclick="openEditPaymentModal('${pid}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeletePayment('${pid}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function renderPaymentsTable(payments) {
  document.getElementById('pay-loading').classList.add('hidden');
  const content = document.getElementById('pay-content');
  content.classList.remove('hidden');
  const totalPaid = payments.filter(p => p.status==='Completed').reduce((s,p) => s + (p.amount||0), 0);
  const totalPending = payments.filter(p => p.status==='Pending').reduce((s,p) => s + (p.amount||0), 0);
  content.innerHTML = `
    ${kpiCards([
      { label:'Total Revenue', value:formatCurrency(totalPaid), icon:'trending-up', iconBg:'bg-green-100', iconColor:'text-green-600', trend:'+'+Math.round(totalPaid/1000)+'k' },
      { label:'Pending Payments', value:formatCurrency(totalPending), icon:'clock', iconBg:'bg-amber-100', iconColor:'text-amber-600' },
      { label:'Transactions', value:payments.length, icon:'receipt', iconBg:'bg-blue-100', iconColor:'text-blue-600' },
      { label:'Completed', value:payments.filter(p=>p.status==='Completed').length, icon:'check-circle', iconBg:'bg-emerald-100', iconColor:'text-emerald-600' },
    ])}
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Completed','Pending','Failed'].map((s,i) => `<button onclick="filterPayByStatus('${s}')" class="pay-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    ${searchFilter('Search by client name or reference ID...')}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Reference</th><th>Client</th><th>Amount</th><th>Method</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody id="pay-tbody">${payments.map(p => paymentRow(p)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary"><span>Showing ${payments.length} payment(s)</span></div>`;
  const searchInput = content.querySelector('input[type="text"]');
  if (searchInput) searchInput.addEventListener('input', () => filterPaySearch(searchInput.value));
  lucide.createIcons();
}

function filterPayByStatus(status) {
  document.querySelectorAll('.pay-tab').forEach(t => {
    t.className = 'pay-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ' +
      (t.textContent.trim() === status ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  const filtered = status === 'All' ? _paymentsCache : _paymentsCache.filter(p => p.status === status);
  document.getElementById('pay-tbody').innerHTML = filtered.map(p => paymentRow(p)).join('');
  lucide.createIcons();
}

function filterPaySearch(q) {
  q = q.toLowerCase();
  const filtered = _paymentsCache.filter(p => {
    const name = (p.customerId?.name || p.customer || '').toLowerCase();
    const ref = (p.referenceId||'').toLowerCase();
    return name.includes(q) || ref.includes(q);
  });
  document.getElementById('pay-tbody').innerHTML = filtered.map(p => paymentRow(p)).join('');
  lucide.createIcons();
}

// ── Add Payment Modal ──
function openAddPaymentModal() {
  const clients = _payCustomers.length > 0 ? _payCustomers : (MOCK.clients || []);
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Record Payment</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-pay-form" onsubmit="handleCreatePayment(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="apy-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}">${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.) *</label><input id="apy-amount" type="number" required min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="150000" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Method *</label><select id="apy-method" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Credit Card</option><option>Debit Card</option><option>Bank Transfer</option><option>Cash</option><option>Online</option></select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Type *</label><select id="apy-type" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Booking</option><option>Rental</option><option>Studio</option><option>Package</option><option>Other</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Reference ID</label><input id="apy-ref" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="INV-011" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Transaction Ref</label><input id="apy-txn" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="TXN-2026-xxx" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="apy-date" type="date" required min="${_payTodayStr()}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="apy-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Completed</option><option>Pending</option><option>Failed</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="apy-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none" placeholder="Payment notes..."></textarea></div>
      <div id="apy-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="apy-submit" class="btn-dark flex-1 py-2.5 text-sm">Record Payment</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreatePayment(e) {
  e.preventDefault();
  const errEl = document.getElementById('apy-error');
  const btn = document.getElementById('apy-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Recording...';
  try {
    const formData = {
      customerId: document.getElementById('apy-client').value,
      amount: parseFloat(document.getElementById('apy-amount').value),
      method: document.getElementById('apy-method').value,
      type: document.getElementById('apy-type').value,
      referenceId: document.getElementById('apy-ref').value.trim(),
      transactionRef: document.getElementById('apy-txn').value.trim(),
      date: document.getElementById('apy-date').value,
      status: document.getElementById('apy-status').value,
      notes: document.getElementById('apy-notes').value.trim(),
    };
    const errors = _validatePaymentForm(formData);
    if (errors.length > 0) { _showPayErrors(errEl, errors, btn, 'Record Payment'); return; }
    await api.createPayment(formData);
    closeModal(); showToast('Payment recorded successfully!'); await loadPayments();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Record Payment';
  }
}

// ── Edit Payment Modal ──
function openEditPaymentModal(id) {
  const p = _paymentsCache.find(x => (x._id||x.id) == id);
  if (!p) return;
  const clients = _payCustomers.length > 0 ? _payCustomers : (MOCK.clients || []);
  const custId = p.customerId?._id || p.customerId || '';
  const esc = (s) => (s||'').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Payment</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-pay-form" onsubmit="handleUpdatePayment(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="epy-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}" ${(c._id||c.id)===custId?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.) *</label><input id="epy-amount" type="number" required min="0" value="${p.amount||0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Method</label><select id="epy-method" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Credit Card','Debit Card','Bank Transfer','Cash','Online'].map(m=>`<option ${p.method===m?'selected':''}>${m}</option>`).join('')}
        </select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="epy-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Pending','Completed','Failed','Refunded'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Reference ID</label><input id="epy-ref" type="text" value="${esc(p.referenceId)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Transaction Ref</label><input id="epy-txn" type="text" value="${esc(p.transactionRef)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="epy-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none">${esc(p.notes)}</textarea></div>
      <div id="epy-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="epy-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdatePayment(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('epy-error');
  const btn = document.getElementById('epy-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const formData = {
      customerId: document.getElementById('epy-client').value,
      amount: parseFloat(document.getElementById('epy-amount').value),
      method: document.getElementById('epy-method').value,
      status: document.getElementById('epy-status').value,
      referenceId: document.getElementById('epy-ref').value.trim(),
      transactionRef: document.getElementById('epy-txn').value.trim(),
      notes: document.getElementById('epy-notes').value.trim(),
    };
    const errors = [];
    if (!formData.customerId) errors.push('Please select a client.');
    if (isNaN(formData.amount)) errors.push('Amount is required and must be a valid number.');
    else if (formData.amount < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    if (errors.length > 0) { _showPayErrors(errEl, errors, btn, 'Save Changes'); return; }
    await api.updatePayment(id, formData);
    closeModal(); showToast('Payment updated successfully!'); await loadPayments();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Payment ──
function confirmDeletePayment(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Payment Record?</h2>
    <p class="text-text-secondary text-sm mb-6">This will permanently remove this payment record from the system.</p>
    <div id="dpy-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeletePayment('${id}')" id="dpy-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeletePayment(id) {
  const btn = document.getElementById('dpy-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deletePayment(id);
    closeModal(); showToast('Payment deleted successfully!'); await loadPayments();
  } catch (err) {
    document.getElementById('dpy-error').textContent = err.message;
    document.getElementById('dpy-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}
