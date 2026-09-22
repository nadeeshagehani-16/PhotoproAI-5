// Service Bookings Page – Full CRUD
let _svcBookingsCache = [];
let _svcCustomers = [];
let _svcPhotographers = [];
let _svcPackages = [];
// ADDED BY TEAM - Search & Filter: currently selected status tab (combined with search + event filter)
let _svcStatusTab = 'All';

// ── Validation Helpers ──
function _svcTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _validateSvcBookingForm(data) {
  const errors = [];
  const today = _svcTodayStr();

  // Required fields
  if (!data.customerId) errors.push('Please select a client.');
  if (!data.packageId) errors.push('Please select a package.');
  if (!data.photographerId) errors.push('Please select a photographer.');
  if (!data.event) errors.push('Please select an event type.');
  if (!data.date) errors.push('Please select a booking date.');
  if (!data.startTime) errors.push('Please enter a start time.');
  if (!data.endTime) errors.push('Please enter an end time.');
  if (!data.location) errors.push('Please enter a location.');
  if (data.amount === undefined || data.amount === null || isNaN(data.amount)) {
    errors.push('Amount is required and must be a valid number.');
  }

  // Date must be today or future
  if (data.date && data.date < today) {
    errors.push('Booking date cannot be in the past. Please select today or a future date.');
  }

  // End time must be after start time
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    errors.push('End time must be after start time.');
  }

  // Amount cannot be negative
  if (!isNaN(data.amount) && data.amount < 0) {
    errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  return errors;
}

function _showSvcErrors(errEl, errors, btn, btnText) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false; btn.textContent = btnText;
}

async function renderBookings() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Service Bookings', 'Manage photography session bookings and assignments', `<button onclick="openAddSvcBookingModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Booking</button>`)}
    <div id="svc-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="svc-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadSvcBookings();
}

async function loadSvcBookings() {
  try {
    const [bookRes, custRes, phRes, pkgRes] = await Promise.all([
      api.getServiceBookings(), api.getCustomers(), api.getPhotographers(), api.getPackages()
    ]);
    _svcBookingsCache = bookRes.data;
    _svcCustomers = custRes.data; _svcPhotographers = phRes.data; _svcPackages = pkgRes.data;
    renderSvcBookingsTable(_svcBookingsCache);
  } catch (err) {
    _svcBookingsCache = MOCK.serviceBookings || [];
    _svcCustomers = MOCK.clients || []; _svcPhotographers = MOCK.photographers || []; _svcPackages = MOCK.packages || [];
    if (_svcBookingsCache.length > 0) {
      renderSvcBookingsTable(_svcBookingsCache);
      const content = document.getElementById('svc-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('svc-loading').classList.add('hidden');
      const content = document.getElementById('svc-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadSvcBookings()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function svcBookingRow(b) {
  const pid = b._id || b.id;
  const clientName = b.customerId?.name || b.client || '—';
  const phName = b.photographerId?.name || b.photographer || '—';
  const pkgName = b.packageId?.name || b.package || '—';
  return `<tr>
    <td><span class="font-semibold text-sm">${b.event||'—'}</span></td>
    <td><span class="text-sm">${clientName}</span></td>
    <td><div class="text-sm">${b.date||'—'}</div><div class="text-xs text-text-secondary">${b.startTime||''} – ${b.endTime||''}</div></td>
    <td class="text-sm text-text-secondary max-w-[140px] truncate">${b.location||'—'}</td>
    <td class="text-sm">${phName}</td>
    <td class="text-xs text-text-secondary">${pkgName}</td>
    <td class="font-semibold text-sm">${formatCurrency(b.amount||0)}</td>
    <td>${statusBadge(b.status||'Pending')}</td>
    <td><div class="flex items-center gap-1">
      <button onclick="openEditSvcBookingModal('${pid}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteSvcBooking('${pid}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function renderSvcBookingsTable(bookings) {
  document.getElementById('svc-loading').classList.add('hidden');
  const content = document.getElementById('svc-content');
  content.classList.remove('hidden');
  // Fresh render resets the active status tab to "All"
  _svcStatusTab = 'All';
  const statusTabs = ['All','Confirmed','Pending','In Progress','Completed','Cancelled'];
  content.innerHTML = `
    <!-- ADDED BY TEAM - Search & Filter: search box + event type dropdown (applied together with the status tabs) -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i>
        <input id="svc-search" type="text" placeholder="Search bookings by client, event, location, photographer..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition" />
      </div>
      <div class="flex gap-2">
        <select id="svc-event-filter" class="px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option>All Events</option><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Portrait</option><option>Event</option><option>Fashion</option>
        </select>
      </div>
    </div>
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${statusTabs.map((s,i) => `<button onclick="filterSvcByStatus('${s}')" class="svc-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Event</th><th>Client</th><th>Date & Time</th><th>Location</th><th>Photographer</th><th>Package</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="svc-tbody">${bookings.map(b => svcBookingRow(b)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary"><span id="svc-count">Showing ${bookings.length} booking(s)</span></div>`;
  // ADDED BY TEAM - Search & Filter: wire search input and event dropdown to the combined filter
  const searchInput = document.getElementById('svc-search');
  if (searchInput) searchInput.addEventListener('input', () => applySvcFilters());
  const eventFilter = document.getElementById('svc-event-filter');
  if (eventFilter) eventFilter.addEventListener('change', () => applySvcFilters());
  lucide.createIcons();
}

function filterSvcByStatus(status) {
  _svcStatusTab = status;
  document.querySelectorAll('.svc-tab').forEach(t => {
    t.className = 'svc-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ' +
      (t.textContent.trim() === status ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  applySvcFilters();
}

// ADDED BY TEAM - Search & Filter: combined filtering — search text, event type AND active status tab applied together
function applySvcFilters() {
  const searchEl = document.getElementById('svc-search');
  const eventEl = document.getElementById('svc-event-filter');
  const q = (searchEl ? searchEl.value : '').toLowerCase();
  // Fall back to "All" options when the select has no value yet (defensive default)
  const event = eventEl && eventEl.value ? eventEl.value : 'All Events';
  const filtered = _svcBookingsCache.filter(b => {
    const clientName = b.customerId?.name || b.client || '';
    const phName = b.photographerId?.name || b.photographer || '';
    const pkgName = b.packageId?.name || b.package || '';
    const matchesSearch = !q || [b.event, clientName, b.location, phName, pkgName].some(v => (v || '').toLowerCase().includes(q));
    const matchesEvent = event === 'All Events' || b.event === event;
    const matchesStatus = _svcStatusTab === 'All' || b.status === _svcStatusTab;
    return matchesSearch && matchesEvent && matchesStatus;
  });
  const tbody = document.getElementById('svc-tbody');
  if (tbody) tbody.innerHTML = filtered.map(b => svcBookingRow(b)).join('');
  const countEl = document.getElementById('svc-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} booking(s)`;
  lucide.createIcons();
}

// ── Add Service Booking Modal ──
function openAddSvcBookingModal() {
  const clients = _svcCustomers.length ? _svcCustomers : MOCK.clients;
  const photographers = _svcPhotographers.length ? _svcPhotographers : MOCK.photographers;
  const packages = _svcPackages.length ? _svcPackages : MOCK.packages;
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">New Service Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-sb-form" onsubmit="handleCreateSvcBooking(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="asb-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}">${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Event Type *</label><select id="asb-event" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Portrait</option><option>Event</option><option>Fashion</option></select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="asb-date" type="date" required min="${_svcTodayStr()}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time *</label><input id="asb-start" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time *</label><input id="asb-end" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label><input id="asb-location" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Venue name and address" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package *</label><select id="asb-package" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${packages.map(p=>`<option value="${p._id||p.id}">${p.name} – ${formatCurrency(p.price)}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographer *</label><select id="asb-photographer" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${photographers.map(p=>`<option value="${p._id||p.id}">${p.name} (${p.specialization||''})</option>`).join('')}</select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.) *</label><input id="asb-amount" type="number" required min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="150000" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="asb-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Pending</option><option>Confirmed</option><option>In Progress</option><option>Completed</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="asb-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none" placeholder="Special requirements..."></textarea></div>
      <div id="asb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="asb-submit" class="btn-dark flex-1 py-2.5 text-sm">Create Booking</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`, 'max-w-3xl');
}

async function handleCreateSvcBooking(e) {
  e.preventDefault();
  const errEl = document.getElementById('asb-error');
  const btn = document.getElementById('asb-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Creating...';

  const formData = {
    customerId: document.getElementById('asb-client').value,
    event: document.getElementById('asb-event').value,
    date: document.getElementById('asb-date').value,
    startTime: document.getElementById('asb-start').value,
    endTime: document.getElementById('asb-end').value,
    location: document.getElementById('asb-location').value.trim(),
    packageId: document.getElementById('asb-package').value,
    photographerId: document.getElementById('asb-photographer').value,
    amount: parseFloat(document.getElementById('asb-amount').value),
    status: document.getElementById('asb-status').value,
    notes: document.getElementById('asb-notes').value.trim(),
  };

  // Frontend validation
  const errors = _validateSvcBookingForm(formData);
  if (errors.length > 0) {
    _showSvcErrors(errEl, errors, btn, 'Create Booking');
    return;
  }

  try {
    await api.createServiceBooking(formData);
    closeModal(); showToast('Service booking created successfully!'); await loadSvcBookings();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Create Booking';
  }
}

// ── Edit Service Booking Modal ──
function openEditSvcBookingModal(id) {
  const b = _svcBookingsCache.find(x => (x._id||x.id) == id);
  if (!b) return;
  const clients = _svcCustomers.length ? _svcCustomers : MOCK.clients;
  const photographers = _svcPhotographers.length ? _svcPhotographers : MOCK.photographers;
  const packages = _svcPackages.length ? _svcPackages : MOCK.packages;
  const esc = (s) => (s||'').replace(/"/g, '&quot;');
  const custId = b.customerId?._id || b.customerId || '';
  const phId = b.photographerId?._id || b.photographerId || '';
  const pkgId = b.packageId?._id || b.packageId || '';
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Service Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-sb-form" onsubmit="handleUpdateSvcBooking(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="esb-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}" ${(c._id||c.id)===custId?'selected':''}>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Event Type *</label><select id="esb-event" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Wedding','Birthday','Corporate','Portrait','Event','Fashion'].map(ev=>`<option ${b.event===ev?'selected':''}>${ev}</option>`).join('')}
        </select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="esb-date" type="date" required min="${_svcTodayStr()}" value="${(b.date||'').toString().split('T')[0]}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time *</label><input id="esb-start" type="time" required value="${b.startTime||''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time *</label><input id="esb-end" type="time" required value="${b.endTime||''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label><input id="esb-location" type="text" required value="${esc(b.location)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package *</label><select id="esb-package" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${packages.map(p=>`<option value="${p._id||p.id}" ${(p._id||p.id)===pkgId?'selected':''}>${p.name} – ${formatCurrency(p.price)}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographer *</label><select id="esb-photographer" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${photographers.map(p=>`<option value="${p._id||p.id}" ${(p._id||p.id)===phId?'selected':''}>${p.name}</option>`).join('')}</select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.) *</label><input id="esb-amount" type="number" required min="0" value="${b.amount||0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="esb-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Pending','Confirmed','In Progress','Completed','Cancelled'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="esb-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none">${esc(b.notes)}</textarea></div>
      <div id="esb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="esb-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`, 'max-w-3xl');
}

async function handleUpdateSvcBooking(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('esb-error');
  const btn = document.getElementById('esb-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';

  const formData = {
    customerId: document.getElementById('esb-client').value,
    event: document.getElementById('esb-event').value,
    date: document.getElementById('esb-date').value,
    startTime: document.getElementById('esb-start').value,
    endTime: document.getElementById('esb-end').value,
    location: document.getElementById('esb-location').value.trim(),
    packageId: document.getElementById('esb-package').value,
    photographerId: document.getElementById('esb-photographer').value,
    amount: parseFloat(document.getElementById('esb-amount').value),
    status: document.getElementById('esb-status').value,
    notes: document.getElementById('esb-notes').value.trim(),
  };

  // Frontend validation
  const errors = _validateSvcBookingForm(formData);
  if (errors.length > 0) {
    _showSvcErrors(errEl, errors, btn, 'Save Changes');
    return;
  }

  try {
    await api.updateServiceBooking(id, formData);
    closeModal(); showToast('Booking updated successfully!'); await loadSvcBookings();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Service Booking ──
function confirmDeleteSvcBooking(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Booking?</h2>
    <p class="text-text-secondary text-sm mb-6">This will permanently remove the service booking and any associated photographer assignment.</p>
    <div id="dsb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteSvcBooking('${id}')" id="dsb-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteSvcBooking(id) {
  const btn = document.getElementById('dsb-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deleteServiceBooking(id);
    closeModal(); showToast('Booking deleted successfully!'); await loadSvcBookings();
  } catch (err) {
    document.getElementById('dsb-error').textContent = err.message;
    document.getElementById('dsb-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}
