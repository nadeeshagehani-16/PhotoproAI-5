// Clients Page – Wired to Customer CRUD API
let _clientsCache = [];

async function renderClients() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Clients', 'Manage your photography studio clients', `<button onclick="openAddClientModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Add Client</button>`)}
    <div id="clients-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="clients-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadClients();
}

async function loadClients() {
  try {
    const res = await api.getCustomers();
    _clientsCache = res.data;
    renderClientsTable(_clientsCache);
  } catch (err) {
    // Fall back to mock data for demo mode
    _clientsCache = MOCK.clients || [];
    if (_clientsCache.length > 0) {
      renderClientsTable(_clientsCache);
      const content = document.getElementById('clients-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('clients-loading').classList.add('hidden');
      const content = document.getElementById('clients-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadClients()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderClientsTable(clients) {
  document.getElementById('clients-loading').classList.add('hidden');
  const content = document.getElementById('clients-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    ${searchFilter('Search clients by name, email...', ['All Status', 'Active', 'Inactive'])}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Client</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Total Spent</th><th>Last Booking</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="clients-tbody">${clients.map(c => clientRow(c)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary">
      <span>Showing ${clients.length} client(s)</span>
    </div>`;
  // Wire search
  const searchInput = content.querySelector('input[type="text"]');
  if (searchInput) searchInput.addEventListener('input', () => filterClientsTable(searchInput.value));
  // Wire status filter
  const statusFilter = content.querySelectorAll('select')[0];
  if (statusFilter) statusFilter.addEventListener('change', () => filterClientsByStatus(statusFilter.value));
  lucide.createIcons();
}

function clientRow(c) {
  const avatar = c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=d30505&color=fff&size=36`;
  const lastBooking = c.lastBooking ? new Date(c.lastBooking).toLocaleDateString() : '—';
  return `<tr>
    <td><div class="flex items-center gap-3"><img src="${avatar}" class="w-9 h-9 rounded-full object-cover" alt="" /><span class="font-semibold text-sm">${c.name}</span></div></td>
    <td class="text-text-secondary text-sm">${c.email}</td>
    <td class="text-text-secondary text-sm">${c.phone || '—'}</td>
    <td><span class="font-semibold">${c.bookings || 0}</span></td>
    <td class="font-semibold">${formatCurrency(c.spent || 0)}</td>
    <td class="text-text-secondary text-sm">${lastBooking}</td>
    <td>${statusBadge(c.status || 'Active')}</td>
    <td><div class="flex items-center gap-1">
      <button onclick="navigate('client-detail', '${c._id}')" class="btn-action" title="View"><i data-lucide="eye" class="w-4 h-4"></i></button>
      <button onclick="openEditClientModal('${c._id}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteClient('${c._id}', '${c.name.replace(/'/g, "\\'")}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function filterClientsTable(query) {
  const q = query.toLowerCase();
  const filtered = _clientsCache.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  document.getElementById('clients-tbody').innerHTML = filtered.map(c => clientRow(c)).join('');
  lucide.createIcons();
}

function filterClientsByStatus(status) {
  const filtered = status === 'All Status' ? _clientsCache : _clientsCache.filter(c => c.status === status);
  document.getElementById('clients-tbody').innerHTML = filtered.map(c => clientRow(c)).join('');
  lucide.createIcons();
}

// ── Add Client Modal ──
function openAddClientModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add New Client</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-client-form" onsubmit="handleCreateClient(event)" class="space-y-4">
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="ac-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="John Doe" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="ac-email" type="email" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="john@email.com" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone *</label><input id="ac-phone" type="tel" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="+94 77 000 0000" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="ac-address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="123 Main St, City" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="ac-notes" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Special requirements..."></textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="ac-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="Active" selected>Active</option><option value="Inactive">Inactive</option></select></div>
      <div id="ac-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ac-submit" class="btn-dark flex-1 py-2.5 text-sm">Add Client</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateClient(e) {
  e.preventDefault();
  const errEl = document.getElementById('ac-error');
  const btn = document.getElementById('ac-submit');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Creating...';
  try {
    await api.createCustomer({
      name: document.getElementById('ac-name').value.trim(),
      email: document.getElementById('ac-email').value.trim(),
      phone: document.getElementById('ac-phone').value.trim(),
      address: document.getElementById('ac-address').value.trim(),
      notes: document.getElementById('ac-notes').value.trim(),
      status: document.getElementById('ac-status').value,
    });
    closeModal();
    showToast('Client added successfully!');
    await loadClients();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Add Client';
  }
}

// ── Edit Client Modal ──
function openEditClientModal(id) {
  const c = _clientsCache.find(x => x._id === id);
  if (!c) return;
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Client</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-client-form" onsubmit="handleUpdateClient(event, '${id}')" class="space-y-4">
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="ec-name" type="text" required value="${c.name}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="ec-email" type="email" required value="${c.email}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone *</label><input id="ec-phone" type="tel" required value="${c.phone || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="ec-address" type="text" value="${c.address || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="ec-notes" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${c.notes || ''}</textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="ec-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
        <option value="Active" ${c.status==='Active'?'selected':''}>Active</option>
        <option value="Inactive" ${c.status==='Inactive'?'selected':''}>Inactive</option>
      </select></div>
      <div id="ec-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ec-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateClient(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('ec-error');
  const btn = document.getElementById('ec-submit');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    await api.updateCustomer(id, {
      name: document.getElementById('ec-name').value.trim(),
      email: document.getElementById('ec-email').value.trim(),
      phone: document.getElementById('ec-phone').value.trim(),
      address: document.getElementById('ec-address').value.trim(),
      notes: document.getElementById('ec-notes').value.trim(),
      status: document.getElementById('ec-status').value,
    });
    closeModal();
    showToast('Client updated successfully!');
    await loadClients();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── Delete Client ──
function confirmDeleteClient(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Client?</h2>
    <p class="text-text-secondary text-sm mb-6">Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.</p>
    <div id="dc-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteClient('${id}')" id="dc-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteClient(id) {
  const errEl = document.getElementById('dc-error');
  const btn = document.getElementById('dc-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    await api.deleteCustomer(id);
    closeModal();
    showToast('Client deleted successfully!');
    await loadClients();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}

// ── Client Detail Page ──
async function renderClientDetail(id) {
  const el = document.getElementById('page-content');
  el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>`;

  // Try to get client from cache first, then from API
  let c = _clientsCache.find(x => x._id === id);
  if (!c) {
    try {
      const res = await api.getCustomer(id);
      c = res.data;
    } catch (err) {
      el.innerHTML = `<button onclick="navigate('clients')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Clients</button><div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p></div>`;
      lucide.createIcons();
      return;
    }
  }

  const avatar = c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=d30505&color=fff&size=96`;
  const lastBooking = c.lastBooking ? new Date(c.lastBooking).toLocaleDateString() : '—';

  el.innerHTML = `
    <button onclick="navigate('clients')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Clients</button>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Profile Card -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light text-center">
        <img src="${avatar}" class="w-24 h-24 rounded-full mx-auto ring-4 ring-accent/20 mb-4" alt="${c.name}" />
        <h2 class="text-xl font-bold">${c.name}</h2>
        <p class="text-text-secondary text-sm mt-1">${c.email}</p>
        <div class="mt-2">${statusBadge(c.status || 'Active')}</div>
        <div class="mt-6 space-y-3 text-left">
          <div class="flex items-center gap-3 text-sm"><i data-lucide="phone" class="w-4 h-4 text-text-secondary"></i>${c.phone || '—'}</div>
          <div class="flex items-center gap-3 text-sm"><i data-lucide="map-pin" class="w-4 h-4 text-text-secondary"></i>${c.address || '—'}</div>
          <div class="flex items-center gap-3 text-sm"><i data-lucide="mail" class="w-4 h-4 text-text-secondary"></i>${c.email}</div>
        </div>
        <div class="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border-light">
          <div><p class="text-xl font-bold">${c.bookings || 0}</p><p class="text-xs text-text-secondary">Bookings</p></div>
          <div><p class="text-xl font-bold">${formatCurrency(c.spent || 0)}</p><p class="text-xs text-text-secondary">Total Spent</p></div>
          <div><p class="text-xl font-bold">${lastBooking}</p><p class="text-xs text-text-secondary">Last Booking</p></div>
        </div>
        <div class="flex gap-2 mt-6">
          <button onclick="openEditClientModal('${c._id}')" class="btn-dark flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Edit</button>
          <button class="btn-ghost flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="mail" class="w-4 h-4"></i> Email</button>
        </div>
      </div>
      <div class="xl:col-span-2 space-y-6">
        <!-- Notes -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-3">Notes</h3>
          <p class="text-sm text-text-secondary">${c.notes || 'No notes available.'}</p>
        </div>
        <!-- Account Info -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Account Information</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><p class="text-text-secondary text-xs mb-1">Created</p><p class="font-semibold">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</p></div>
            <div><p class="text-text-secondary text-xs mb-1">Last Updated</p><p class="font-semibold">${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}</p></div>
            <div><p class="text-text-secondary text-xs mb-1">Status</p><p class="font-semibold">${c.status || 'Active'}</p></div>
            <div><p class="text-text-secondary text-xs mb-1">Customer ID</p><p class="font-mono text-xs">${c._id}</p></div>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}
