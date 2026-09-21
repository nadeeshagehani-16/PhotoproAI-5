// Equipment Management Page
let _equipmentCache = [];

// ADDED BY TEAM - Form Validation: validates equipment create/edit form (required fields, non-negative price, length limits)
function _validateEquipmentForm(data) {
  const errors = [];
  if (!data.name || data.name.trim().length < 2) errors.push('Name is required (min 2 characters).');
  else if (data.name.trim().length > 100) errors.push('Name cannot exceed 100 characters.');
  if (!data.category) errors.push('Category is required.');
  if (!data.brand || data.brand.trim().length < 2) errors.push('Brand is required (min 2 characters).');
  if (!data.model) errors.push('Model is required.');
  if (data.pricePerDay === undefined || data.pricePerDay === null || isNaN(data.pricePerDay)) {
    errors.push('Price per day is required and must be a valid number.');
  } else if (data.pricePerDay < 0) {
    errors.push('Price per day cannot be negative.');
  }
  if (data.serialNumber && data.serialNumber.length > 50) errors.push('Serial number cannot exceed 50 characters.');
  if (data.description && data.description.length > 500) errors.push('Description cannot exceed 500 characters.');
  if (data.specifications && data.specifications.length > 200) errors.push('Specifications cannot exceed 200 characters.');
  return errors;
}

function _showEquipmentErrors(errEl, errors, btn, label) {
  errEl.innerHTML = errors.map(e => `<div class="flex items-start gap-1.5"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i><span>${e}</span></div>`).join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false;
  btn.textContent = label;
}

async function renderEquipment() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Equipment', 'Manage camera and photography equipment inventory', `<button onclick="openAddEquipmentModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Equipment</button>`)}
    <div id="equipment-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="equipment-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadEquipment();
}

async function loadEquipment() {
  try {
    const res = await api.getEquipment();
    _equipmentCache = res.data;
    renderEquipmentTable(_equipmentCache);
  } catch (err) {
    // Fall back to mock data for demo mode
    _equipmentCache = MOCK.equipment || [];
    if (_equipmentCache.length > 0) {
      renderEquipmentTable(_equipmentCache);
      const content = document.getElementById('equipment-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('equipment-loading').classList.add('hidden');
      const content = document.getElementById('equipment-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadEquipment()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function equipmentRow(e) {
  const image = e.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=111111&color=fff&size=36`;
  return `<tr>
    <td><div class="flex items-center gap-3"><img src="${image}" class="w-9 h-9 rounded-lg object-cover" alt="" /><div><span class="font-semibold text-sm block">${e.name}</span><span class="text-xs text-text-secondary">${e.brand} ${e.model}</span></div></div></td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">${e.category}</span></td>
    <td class="font-semibold text-sm">${formatCurrency(e.pricePerDay)}</td>
    <td class="text-text-secondary text-sm">${e.condition || 'Good'}</td>
    <td class="text-text-secondary text-xs font-mono">${e.serialNumber || '—'}</td>
    <td>${statusBadge(e.availability || 'Available')}</td>
    <td><div class="flex items-center gap-1">
      <button onclick="openEditEquipmentModal('${e._id}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteEquipment('${e._id}', '${e.name.replace(/'/g, "\\'")}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function renderEquipmentTable(equipment) {
  document.getElementById('equipment-loading').classList.add('hidden');
  const content = document.getElementById('equipment-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <!-- ADDED BY TEAM - Search & Filter: search box + category and availability dropdowns (applied together) -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i>
        <input id="equipment-search" type="text" placeholder="Search equipment by name, brand, model or serial no..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition" />
      </div>
      <div class="flex gap-2">
        <select id="equipment-category-filter" class="px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option>All Categories</option><option>Camera</option><option>Lens</option><option>Lighting</option><option>Tripod</option><option>Audio</option><option>Accessory</option>
        </select>
        <select id="equipment-availability-filter" class="px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option>All Status</option><option>Available</option><option>Rented</option><option>Under Maintenance</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Equipment</th><th>Category</th><th>Price/Day</th><th>Condition</th><th>Serial No.</th><th>Availability</th><th>Actions</th></tr></thead>
        <tbody id="equipment-tbody">${equipment.map(e => equipmentRow(e)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary">
      <span id="equipment-count">Showing ${equipment.length} item(s)</span>
    </div>`;
  // ADDED BY TEAM - Search & Filter: wire search input and both dropdowns to the combined filter
  const searchInput = document.getElementById('equipment-search');
  if (searchInput) searchInput.addEventListener('input', applyEquipmentFilters);
  const categorySel = document.getElementById('equipment-category-filter');
  if (categorySel) categorySel.addEventListener('change', applyEquipmentFilters);
  const availSel = document.getElementById('equipment-availability-filter');
  if (availSel) availSel.addEventListener('change', applyEquipmentFilters);
  lucide.createIcons();
}

// ADDED BY TEAM - Search & Filter: combined filtering — search text, category AND availability applied together
function applyEquipmentFilters() {
  const searchEl = document.getElementById('equipment-search');
  const catEl = document.getElementById('equipment-category-filter');
  const availEl = document.getElementById('equipment-availability-filter');
  const q = (searchEl ? searchEl.value : '').toLowerCase();
  // Fall back to "All" options when the selects have no value yet (defensive defaults)
  const category = catEl && catEl.value ? catEl.value : 'All Categories';
  const status = availEl && availEl.value ? availEl.value : 'All Status';
  let filtered = _equipmentCache;
  if (q) filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(q) || (e.brand || '').toLowerCase().includes(q) || (e.model || '').toLowerCase().includes(q) || (e.serialNumber || '').toLowerCase().includes(q));
  if (category !== 'All Categories') filtered = filtered.filter(e => e.category === category);
  if (status !== 'All Status') filtered = filtered.filter(e => e.availability === status);
  const tbody = document.getElementById('equipment-tbody');
  if (tbody) tbody.innerHTML = filtered.map(e => equipmentRow(e)).join('');
  const countEl = document.getElementById('equipment-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} item(s)`;
  lucide.createIcons();
}

function filterEquipmentTable(query) { applyEquipmentFilters(); }

// ── Add Equipment Modal ──
function openAddEquipmentModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add Equipment</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-equipment-form" onsubmit="handleCreateEquipment(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Name *</label><input id="ae-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Canon EOS R5" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Category *</label><select id="ae-category" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="Camera">Camera</option><option value="Lens">Lens</option><option value="Lighting">Lighting</option><option value="Tripod">Tripod</option><option value="Audio">Audio</option><option value="Accessory">Accessory</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Brand *</label><input id="ae-brand" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Canon" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Model *</label><input id="ae-model" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="EOS R5" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price Per Day *</label><input id="ae-price" type="number" required min="0" step="0.01" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="5000" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Serial Number</label><input id="ae-serial" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="CN-2024-001" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Condition</label><select id="ae-condition" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="New">New</option><option value="Good" selected>Good</option><option value="Fair">Fair</option><option value="Needs Repair">Needs Repair</option></select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="ae-availability" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="Available" selected>Available</option><option value="Rented">Rented</option><option value="Under Maintenance">Under Maintenance</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="ae-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Full-frame mirrorless camera..."></textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Specifications</label><input id="ae-specs" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="45MP, 8K video, IBIS" /></div>
      <div id="ae-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ae-submit" class="btn-dark flex-1 py-2.5 text-sm">Add Equipment</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateEquipment(e) {
  e.preventDefault();
  const errEl = document.getElementById('ae-error');
  const btn = document.getElementById('ae-submit');
  errEl.classList.add('hidden');
  const data = {
    name: document.getElementById('ae-name').value.trim(),
    category: document.getElementById('ae-category').value,
    brand: document.getElementById('ae-brand').value.trim(),
    model: document.getElementById('ae-model').value.trim(),
    pricePerDay: parseFloat(document.getElementById('ae-price').value),
    serialNumber: document.getElementById('ae-serial').value.trim(),
    condition: document.getElementById('ae-condition').value,
    availability: document.getElementById('ae-availability').value,
    description: document.getElementById('ae-description').value.trim(),
    specifications: document.getElementById('ae-specs').value.trim(),
  };
  const errors = _validateEquipmentForm(data);
  if (errors.length > 0) { _showEquipmentErrors(errEl, errors, btn, 'Add Equipment'); return; }
  btn.disabled = true;
  btn.textContent = 'Creating...';
  try {
    await api.createEquipment(data);
    closeModal();
    showToast('Equipment added successfully!');
    await loadEquipment();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Add Equipment';
  }
}

// ── Edit Equipment Modal ──
function openEditEquipmentModal(id) {
  const e = _equipmentCache.find(x => x._id === id);
  if (!e) return;
  const esc = (s) => (s || '').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Equipment</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-equipment-form" onsubmit="handleUpdateEquipment(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Name *</label><input id="ee-name" type="text" required value="${esc(e.name)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Category *</label><select id="ee-category" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Camera','Lens','Lighting','Tripod','Audio','Accessory'].map(c => `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Brand *</label><input id="ee-brand" type="text" required value="${esc(e.brand)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Model *</label><input id="ee-model" type="text" required value="${esc(e.model)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price Per Day *</label><input id="ee-price" type="number" required min="0" step="0.01" value="${e.pricePerDay}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Serial Number</label><input id="ee-serial" type="text" value="${esc(e.serialNumber)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Condition</label><select id="ee-condition" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['New','Good','Fair','Needs Repair'].map(c => `<option value="${c}" ${e.condition===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="ee-availability" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Available','Rented','Under Maintenance'].map(a => `<option value="${a}" ${e.availability===a?'selected':''}>${a}</option>`).join('')}
        </select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="ee-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${esc(e.description)}</textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Specifications</label><input id="ee-specs" type="text" value="${esc(e.specifications)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div id="ee-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ee-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateEquipment(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('ee-error');
  const btn = document.getElementById('ee-submit');
  errEl.classList.add('hidden');
  const data = {
    name: document.getElementById('ee-name').value.trim(),
    category: document.getElementById('ee-category').value,
    brand: document.getElementById('ee-brand').value.trim(),
    model: document.getElementById('ee-model').value.trim(),
    pricePerDay: parseFloat(document.getElementById('ee-price').value),
    serialNumber: document.getElementById('ee-serial').value.trim(),
    condition: document.getElementById('ee-condition').value,
    availability: document.getElementById('ee-availability').value,
    description: document.getElementById('ee-description').value.trim(),
    specifications: document.getElementById('ee-specs').value.trim(),
  };
  const errors = _validateEquipmentForm(data);
  if (errors.length > 0) { _showEquipmentErrors(errEl, errors, btn, 'Save Changes'); return; }
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    await api.updateEquipment(id, data);
    closeModal();
    showToast('Equipment updated successfully!');
    await loadEquipment();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── Delete Equipment ──
function confirmDeleteEquipment(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Equipment?</h2>
    <p class="text-text-secondary text-sm mb-6">Are you sure you want to delete <strong>${name}</strong>? Rental history referencing this item may be affected. This action cannot be undone.</p>
    <div id="de-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteEquipment('${id}')" id="de-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteEquipment(id) {
  const errEl = document.getElementById('de-error');
  const btn = document.getElementById('de-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    await api.deleteEquipment(id);
    closeModal();
    showToast('Equipment deleted successfully!');
    await loadEquipment();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}
