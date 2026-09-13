// Rental Management Page
let _rentalsCache = [];
let _rentalCustomers = [];
let _rentalEquipment = [];

// Local (not UTC) yyyy-mm-dd for date inputs and validation
function _rentalTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _rentalDateInputVal(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _validateRentalForm(data, isEdit = false) {
  const errors = [];
  const today = _rentalTodayStr();
  if (!data.customerId) errors.push('Please select a customer.');
  if (!data.equipmentId) errors.push('Please select equipment.');
  if (!data.startDate) errors.push('Start date is required.');
  else if (data.startDate < today) errors.push('Start date cannot be in the past. Please choose today or a future date.');
  if (!data.endDate) errors.push('End date is required.');
  else if (data.endDate < today) errors.push('End date cannot be in the past. Please choose today or a future date.');
  if (data.startDate && data.endDate && data.endDate <= data.startDate) errors.push('End date must be after the start date.');
  if (isEdit) {
    if (data.totalCost === undefined || data.totalCost === null || isNaN(data.totalCost)) {
      errors.push('Total cost is required and must be a valid number.');
    } else if (data.totalCost < 0) {
      errors.push('Total cost cannot be negative.');
    }
  }
  if (data.securityDeposit !== undefined && data.securityDeposit !== null && !isNaN(data.securityDeposit) && data.securityDeposit < 0) {
    errors.push('Security deposit cannot be negative.');
  }
  if (data.notes && data.notes.length > 1000) errors.push('Notes cannot exceed 1000 characters.');
  return errors;
}

function _showRentalErrors(errEl, errors, btn, label) {
  errEl.innerHTML = errors.map(e => `<div class="flex items-start gap-1.5"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i><span>${e}</span></div>`).join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false;
  btn.textContent = label;
}

async function renderRentals() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Rentals', 'Manage equipment rentals and returns', `<button onclick="openAddRentalModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Rental</button>`)}
    <div id="rentals-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="rentals-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadRentals();
}

async function loadRentals() {
  try {
    // Load rentals plus customer/equipment lists for the create form
    const [rentalsRes, customersRes, equipmentRes] = await Promise.all([
      api.getRentals(),
      api.getCustomers().catch(() => ({ data: [] })),
      api.getEquipment().catch(() => ({ data: [] })),
    ]);
    _rentalsCache = rentalsRes.data;
    _rentalCustomers = customersRes.data;
    _rentalEquipment = equipmentRes.data;
    renderRentalsTable(_rentalsCache);
  } catch (err) {
    // Fall back to mock data for demo mode
    _rentalsCache = MOCK.rentals || [];
    _rentalCustomers = MOCK.clients || [];
    _rentalEquipment = MOCK.equipment || [];
    if (_rentalsCache.length > 0) {
      renderRentalsTable(_rentalsCache);
      const content = document.getElementById('rentals-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('rentals-loading').classList.add('hidden');
      const content = document.getElementById('rentals-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadRentals()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function rentalRow(r) {
  const customer = r.customerId ? (typeof r.customerId === 'object' ? r.customerId.name : 'Customer') : '—';
  const equipment = r.equipmentId ? (typeof r.equipmentId === 'object' ? `${r.equipmentId.name}` : 'Equipment') : '—';
  return `<tr>
    <td><div class="text-sm font-medium">${customer}</div><div class="text-xs text-text-secondary">${r.customerId && typeof r.customerId === 'object' ? r.customerId.email || '' : ''}</div></td>
    <td><span class="text-sm font-medium">${equipment}</span></td>
    <td><div class="text-sm">${formatDate(r.startDate)}</div><div class="text-xs text-text-secondary">to ${formatDate(r.endDate)}</div></td>
    <td class="font-semibold text-sm">${formatCurrency(r.totalCost)}</td>
    <td class="text-text-secondary text-sm">${formatCurrency(r.securityDeposit || 0)}</td>
    <td>${statusBadge(r.status)}</td>
    <td>${statusBadge(r.paymentStatus || 'Unpaid')}</td>
    <td><div class="flex items-center gap-1">
      ${r.status === 'Active' || r.status === 'Pending' ? `<button onclick="handleReturnRental('${r._id}')" class="btn-action" title="Mark Returned"><i data-lucide="undo-2" class="w-4 h-4 text-success"></i></button>` : ''}
      ${r.status !== 'Cancelled' && r.status !== 'Returned' ? `<button onclick="handleCancelRental('${r._id}')" class="btn-action" title="Cancel Rental"><i data-lucide="x-circle" class="w-4 h-4 text-warning"></i></button>` : ''}
      <button onclick="openEditRentalModal('${r._id}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteRental('${r._id}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function renderRentalsTable(rentals) {
  document.getElementById('rentals-loading').classList.add('hidden');
  const content = document.getElementById('rentals-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    ${searchFilter('Search rentals by customer, equipment...', ['All Status', 'Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'])}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Customer</th><th>Equipment</th><th>Rental Period</th><th>Total Cost</th><th>Deposit</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
        <tbody id="rentals-tbody">${rentals.map(r => rentalRow(r)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary">
      <span>Showing ${rentals.length} rental(s)</span>
    </div>`;
  // Wire search
  const searchInput = content.querySelector('input[type="text"]');
  if (searchInput) searchInput.addEventListener('input', () => filterRentalsTable(searchInput.value));
  // Wire status filter
  const statusFilter = content.querySelectorAll('select')[0];
  if (statusFilter) statusFilter.addEventListener('change', () => filterRentalsByStatus(statusFilter.value));
  lucide.createIcons();
}

function filterRentalsTable(query) {
  const q = query.toLowerCase();
  const filtered = _rentalsCache.filter(r => {
    const customer = r.customerId && typeof r.customerId === 'object' ? r.customerId.name : '';
    const equipment = r.equipmentId && typeof r.equipmentId === 'object' ? r.equipmentId.name : '';
    return customer.toLowerCase().includes(q) || equipment.toLowerCase().includes(q);
  });
  document.getElementById('rentals-tbody').innerHTML = filtered.map(r => rentalRow(r)).join('');
  lucide.createIcons();
}

function filterRentalsByStatus(status) {
  const filtered = status === 'All Status' ? _rentalsCache : _rentalsCache.filter(r => r.status === status);
  document.getElementById('rentals-tbody').innerHTML = filtered.map(r => rentalRow(r)).join('');
  lucide.createIcons();
}

// Calculate total cost based on equipment price and rental days
function calculateRentalCost() {
  const equipmentId = document.getElementById('ar-equipment') ? document.getElementById('ar-equipment').value : null;
  const start = document.getElementById('ar-start') ? document.getElementById('ar-start').value : null;
  const end = document.getElementById('ar-end') ? document.getElementById('ar-end').value : null;
  const costEl = document.getElementById('ar-cost-display');
  if (!equipmentId || !start || !end || !costEl) return;
  const equipment = _rentalEquipment.find(e => e._id === equipmentId);
  if (!equipment) return;
  const days = Math.max(0, Math.ceil((new Date(end) - new Date(start)) / 86400000));
  const total = days * equipment.pricePerDay;
  costEl.textContent = days > 0 ? `${days} day(s) × ${formatCurrency(equipment.pricePerDay)} = ${formatCurrency(total)}` : '—';
}

// ── Add Rental Modal ──
function openAddRentalModal() {
  const customerOptions = _rentalCustomers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
  const equipmentOptions = _rentalEquipment.filter(e => e.availability !== 'Under Maintenance').map(e => `<option value="${e._id}">${e.name} (${e.brand} ${e.model}) – ${formatCurrency(e.pricePerDay)}/day</option>`).join('');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">New Rental</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-rental-form" onsubmit="handleCreateRental(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Customer *</label><select id="ar-customer" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="">Select customer</option>${customerOptions}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Equipment *</label><select id="ar-equipment" required onchange="calculateRentalCost()" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="">Select equipment</option>${equipmentOptions}</select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Date *</label><input id="ar-start" type="date" required min="${_rentalTodayStr()}" onchange="calculateRentalCost()" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Date *</label><input id="ar-end" type="date" required min="${_rentalTodayStr()}" onchange="calculateRentalCost()" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="bg-surface rounded-xl p-3 text-sm"><span class="text-text-secondary">Estimated cost: </span><span id="ar-cost-display" class="font-semibold">—</span></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Security Deposit</label><input id="ar-deposit" type="number" min="0" step="0.01" value="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Payment Status</label><select id="ar-payment" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="Unpaid" selected>Unpaid</option><option value="Paid">Paid</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="ar-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Rental notes..."></textarea></div>
      <div id="ar-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ar-submit" class="btn-dark flex-1 py-2.5 text-sm">Create Rental</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateRental(e) {
  e.preventDefault();
  const errEl = document.getElementById('ar-error');
  const btn = document.getElementById('ar-submit');
  errEl.classList.add('hidden');

  const customerId = document.getElementById('ar-customer').value;
  const equipmentId = document.getElementById('ar-equipment').value;
  const startDate = document.getElementById('ar-start').value;
  const endDate = document.getElementById('ar-end').value;
  const securityDeposit = parseFloat(document.getElementById('ar-deposit').value) || 0;

  const equipment = _rentalEquipment.find(x => x._id === equipmentId);
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000);
  const totalCost = days * (equipment ? equipment.pricePerDay : 0);

  const errors = _validateRentalForm({ customerId, equipmentId, startDate, endDate, securityDeposit, notes: document.getElementById('ar-notes').value.trim() });
  if (errors.length > 0) { _showRentalErrors(errEl, errors, btn, 'Create Rental'); return; }

  btn.disabled = true;
  btn.textContent = 'Creating...';
  try {
    await api.createRental({
      customerId,
      equipmentId,
      startDate,
      endDate,
      totalCost,
      securityDeposit,
      paymentStatus: document.getElementById('ar-payment').value,
      notes: document.getElementById('ar-notes').value.trim(),
      status: 'Pending',
    });
    closeModal();
    showToast('Rental created successfully!');
    await loadRentals();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Create Rental';
  }
}

// ── Edit Rental Modal ──
function openEditRentalModal(id) {
  const r = _rentalsCache.find(x => x._id === id);
  if (!r) return;
  const startVal = _rentalDateInputVal(r.startDate);
  const endVal = _rentalDateInputVal(r.endDate);
  const todayStr = _rentalTodayStr();
  const customerIdVal = r.customerId && typeof r.customerId === 'object' ? r.customerId._id : r.customerId;
  const equipmentIdVal = r.equipmentId && typeof r.equipmentId === 'object' ? r.equipmentId._id : r.equipmentId;
  const customerOptions = _rentalCustomers.map(c => `<option value="${c._id}" ${c._id === customerIdVal ? 'selected' : ''}>${c.name}</option>`).join('');
  const equipmentOptions = _rentalEquipment.map(e => `<option value="${e._id}" ${e._id === equipmentIdVal ? 'selected' : ''}>${e.name} (${e.brand} ${e.model})</option>`).join('');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Rental</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-rental-form" onsubmit="handleUpdateRental(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Customer *</label><select id="er-customer" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${customerOptions}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Equipment *</label><select id="er-equipment" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${equipmentOptions}</select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Date *</label><input id="er-start" type="date" required min="${todayStr}" value="${startVal}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Date *</label><input id="er-end" type="date" required min="${todayStr}" value="${endVal}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Total Cost *</label><input id="er-cost" type="number" required min="0" step="0.01" value="${r.totalCost}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Deposit</label><input id="er-deposit" type="number" min="0" step="0.01" value="${r.securityDeposit || 0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="er-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Pending','Active','Returned','Overdue','Cancelled'].map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Payment Status</label><select id="er-payment" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
        ${['Unpaid','Paid','Refunded'].map(p => `<option value="${p}" ${r.paymentStatus===p?'selected':''}>${p}</option>`).join('')}
      </select></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="er-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${r.notes || ''}</textarea></div>
      <div id="er-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="er-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateRental(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('er-error');
  const btn = document.getElementById('er-submit');
  errEl.classList.add('hidden');

  const data = {
    customerId: document.getElementById('er-customer').value,
    equipmentId: document.getElementById('er-equipment').value,
    startDate: document.getElementById('er-start').value,
    endDate: document.getElementById('er-end').value,
    totalCost: parseFloat(document.getElementById('er-cost').value),
    securityDeposit: parseFloat(document.getElementById('er-deposit').value) || 0,
    status: document.getElementById('er-status').value,
    paymentStatus: document.getElementById('er-payment').value,
    notes: document.getElementById('er-notes').value.trim(),
  };

  const errors = _validateRentalForm(data, true);
  if (errors.length > 0) { _showRentalErrors(errEl, errors, btn, 'Save Changes'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    await api.updateRental(id, data);
    closeModal();
    showToast('Rental updated successfully!');
    await loadRentals();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── Return Rental ──
async function handleReturnRental(id) {
  const r = _rentalsCache.find(x => x._id === id);
  if (!r) return;
  try {
    await api.updateRental(id, {
      status: 'Returned',
      returnDate: new Date().toISOString(),
      // Restore equipment availability
      equipmentId: r.equipmentId && typeof r.equipmentId === 'object' ? r.equipmentId._id : r.equipmentId,
    });
    // Also set the equipment back to Available
    const equipmentId = r.equipmentId && typeof r.equipmentId === 'object' ? r.equipmentId._id : r.equipmentId;
    try { await api.updateEquipment(equipmentId, { availability: 'Available' }); } catch (e) { /* non-blocking */ }
    showToast('Rental marked as returned!');
    await loadRentals();
  } catch (err) {
    showToast(err.message, 'alert-circle');
  }
}

// ── Cancel Rental ──
async function handleCancelRental(id) {
  try {
    await api.updateRental(id, { status: 'Cancelled' });
    showToast('Rental cancelled!');
    await loadRentals();
  } catch (err) {
    showToast(err.message, 'alert-circle');
  }
}

// ── Delete Rental ──
function confirmDeleteRental(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Rental?</h2>
    <p class="text-text-secondary text-sm mb-6">Are you sure you want to permanently delete this rental record? Consider cancelling instead to keep the history.</p>
    <div id="dr-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteRental('${id}')" id="dr-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteRental(id) {
  const errEl = document.getElementById('dr-error');
  const btn = document.getElementById('dr-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    await api.deleteRental(id);
    closeModal();
    showToast('Rental deleted successfully!');
    await loadRentals();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}
