// Bookings Page
// ADDED BY TEAM - Search & Filter: currently selected status tab (combined with search box)
let _bkStatusTab = 'All';

function renderBookings() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Bookings', 'Manage all photography sessions and events', `<button onclick="openAddBookingModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Booking</button>`)}
    <!-- ADDED BY TEAM - Search & Filter: search box (applied together with the status tabs) -->
    <div class="relative mb-6"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i>
      <input id="bk-search" type="text" placeholder="Search bookings by client, event, location or photographer..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition" />
    </div>
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Confirmed','Pending','In Progress','Completed','Cancelled'].map((s,i) => `<button onclick="filterBookingsByStatus('${s}')" class="bk-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table"><thead><tr><th>ID</th><th>Client</th><th>Event</th><th>Date & Time</th><th>Location</th><th>Photographer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="bk-tbody">${MOCK.bookings.map(b => bookingRow(b)).join('')}</tbody></table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary"><span id="bk-count">Showing ${MOCK.bookings.length} booking(s)</span></div>`;
  // ADDED BY TEAM - Search & Filter: wire search input to the combined filter
  const searchInput = document.getElementById('bk-search');
  if (searchInput) searchInput.addEventListener('input', () => applyBookingFilters());
  lucide.createIcons();
}

// Shared booking row markup so the main table and the filtered table always render identically
function bookingRow(b) {
  return `<tr>
    <td class="font-mono text-xs text-text-secondary">#${b.id}</td>
    <td><div class="flex items-center gap-2"><img src="${MOCK.clients.find(c=>c.id===b.clientId)?.avatar||'https://i.pravatar.cc/32'}" class="w-8 h-8 rounded-full" /><span class="font-medium text-sm">${b.client}</span></div></td>
    <td><span class="text-sm">${b.event}</span></td>
    <td><div class="text-sm">${b.date}</div><div class="text-xs text-text-secondary">${b.start} – ${b.end}</div></td>
    <td class="text-sm text-text-secondary max-w-[150px] truncate">${b.location}</td>
    <td class="text-sm">${b.photographer}</td>
    <td class="font-semibold text-sm">${formatCurrency(b.amount)}</td>
    <td>${statusBadge(b.status)}</td>
    <td>${actionBtns('booking-detail')}</td>
  </tr>`;
}

// ADDED BY TEAM - Search & Filter: status tab selection (delegates to the combined filter)
function filterBookingsByStatus(status) {
  _bkStatusTab = status;
  document.querySelectorAll('.bk-tab').forEach(t => {
    t.className = 'bk-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ' +
      (t.textContent.trim() === status ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  applyBookingFilters();
}

// ADDED BY TEAM - Search & Filter: combined filtering — search text AND active status tab applied together
function applyBookingFilters() {
  const searchEl = document.getElementById('bk-search');
  const q = (searchEl ? searchEl.value : '').toLowerCase();
  const filtered = MOCK.bookings.filter(b => {
    const matchesSearch = !q || [b.client, b.event, b.location, b.photographer, b.package].some(v => (v || '').toLowerCase().includes(q));
    const matchesStatus = _bkStatusTab === 'All' || b.status === _bkStatusTab;
    return matchesSearch && matchesStatus;
  });
  const tbody = document.getElementById('bk-tbody');
  if (tbody) tbody.innerHTML = filtered.map(b => bookingRow(b)).join('');
  const countEl = document.getElementById('bk-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} booking(s)`;
  lucide.createIcons();
}

function openAddBookingModal() {
  openModal(`<div class="p-6 max-w-3xl">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">New Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.clients.map(c=>`<option>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Event Type</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20"><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Portrait</option><option>Event</option></select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date</label><input type="date" min="${new Date().toISOString().split('T')[0]}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time</label><input type="time" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time</label><input type="time" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Location</label><input type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" placeholder="Venue name and address" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.packages.map(p=>`<option>${p.name} – ${formatCurrency(p.price)}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographer</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.team.filter(t=>t.role.includes('Photographer')).map(t=>`<option>${t.name}</option>`).join('')}</select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" placeholder="Special requirements..."></textarea></div>
      <div class="flex gap-3 pt-2"><button onclick="closeModal();showToast('Booking created successfully!')" class="btn-dark flex-1 py-2.5 text-sm">Create Booking</button><button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button></div>
    </div>
  </div>`, 'max-w-3xl');
}

// ADDED BY TEAM - Dashboard Upcoming Events: real booking detail page. Reads a "type:id"
// reference passed by the dashboard Upcoming Events cards (navigate('booking-detail', param)),
// fetches the booking from the existing service/studio booking API and renders its live
// populated data — replacing the old hardcoded MOCK.bookings[0] page. Read-only view; the
// _dash* formatting helpers come from dashboard.js (loaded earlier in index.html).
async function renderBookingDetail(param) {
  const el = document.getElementById('page-content');
  const ref = (param || '').toString();
  const sep = ref.indexOf(':');
  const type = sep > -1 ? ref.slice(0, sep) : '';
  const id = sep > -1 ? ref.slice(sep + 1) : '';
  const isStudio = type === 'studio';
  const backPage = isStudio ? 'studio-bookings' : 'bookings';
  const backLabel = isStudio ? 'Back to Studio Bookings' : 'Back to Bookings';

  if (!isStudio && type !== 'service') {
    el.innerHTML = `
      <button onclick="navigate('bookings')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Bookings</button>
      <div class="bg-white rounded-2xl p-12 shadow-card border border-border-light text-center">
        <i data-lucide="calendar-x" class="w-12 h-12 text-text-secondary mx-auto mb-3"></i>
        <p class="font-medium">No booking selected</p>
        <p class="text-sm text-text-secondary mt-1">Open an event from the dashboard Upcoming Events, or pick one from the bookings page.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  el.innerHTML = `<div class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>`;

  try {
    const res = await api.get((isStudio ? '/studio-bookings/' : '/service-bookings/') + id);
    const b = res.data;
    const client = b.customerId || {};
    const title = isStudio ? (b.studioId?.name || 'Studio Booking') : (b.event || 'Service Booking');
    const subtitle = isStudio ? (b.purpose || 'Studio session') : (b.packageId?.name || 'Photography session');
    const payment = isStudio ? (b.paymentStatus || 'Unpaid') : (b.payment || 'Pending');
    const fields = [
      { label: 'Booking Type', value: isStudio ? 'Studio Session' : 'On-location Service' },
      { label: 'Client', value: client.name || '—' },
      ...(!isStudio ? [{ label: 'Event Type', value: b.event || '—' }, { label: 'Package', value: b.packageId?.name || '—' }, { label: 'Photographer', value: b.photographerId?.name || 'Unassigned' }] : []),
      ...(isStudio ? [{ label: 'Studio', value: b.studioId?.name || '—' }, { label: 'Purpose', value: b.purpose || '—' }] : []),
      { label: 'Date', value: _dashFmtDate(b.date) },
      { label: 'Time', value: `${_dashFmtTime(b.startTime)} – ${_dashFmtTime(b.endTime)}` },
      ...(!isStudio ? [{ label: 'Location', value: b.location || '—' }] : []),
      ...(b.createdAt ? [{ label: 'Created', value: new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }] : []),
    ];

    el.innerHTML = `
      <button onclick="navigate('${backPage}')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> ${backLabel}</button>
      ${pageHeader(title, subtitle, statusBadge(b.status || 'Pending'))}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
            <h3 class="font-bold mb-4">Booking Details</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
              ${fields.map(f => `<div><p class="text-xs text-text-secondary mb-1">${f.label}</p><p class="font-semibold text-sm">${f.value}</p></div>`).join('')}
              <div><p class="text-xs text-text-secondary mb-1">${isStudio ? 'Total Cost' : 'Amount'}</p><p class="font-bold text-lg text-accent">${formatCurrency(Number(isStudio ? b.totalCost : b.amount) || 0)}</p></div>
              <div><p class="text-xs text-text-secondary mb-1">Payment</p>${statusBadge(payment)}</div>
            </div>
          </div>
          ${b.notes ? `<div class="bg-white rounded-2xl p-6 shadow-card border border-border-light"><h3 class="font-bold mb-3">Notes</h3><p class="text-sm text-text-secondary leading-relaxed">${b.notes}</p></div>` : ''}
        </div>
        <div class="space-y-6">
          <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light text-center">
            <div class="w-16 h-16 rounded-full bg-surface border border-border-light flex items-center justify-center mx-auto mb-3 text-lg font-bold text-primary">${(client.name || '?').charAt(0).toUpperCase()}</div>
            <h4 class="font-bold">${client.name || '—'}</h4>
            ${client.email ? `<p class="text-xs text-text-secondary mt-1">${client.email}</p>` : ''}
            ${client._id ? `<button onclick="navigate('client-detail', '${client._id}')" class="btn-ghost w-full py-2 text-sm mt-4">View Profile</button>` : ''}
          </div>
          <div class="bg-primary rounded-2xl p-6 text-white">
            <h4 class="font-bold mb-3">When & Where</h4>
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-4 h-4 text-accent"></i><span>${_dashFmtDate(b.date)}</span></div>
              <div class="flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4 text-accent"></i><span>${_dashFmtTime(b.startTime)} – ${_dashFmtTime(b.endTime)}</span></div>
              <div class="flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-accent"></i><span>${isStudio ? (b.studioId?.location || '—') : (b.location || '—')}</span></div>
            </div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `
      <button onclick="navigate('${backPage}')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> ${backLabel}</button>
      <div class="bg-white rounded-2xl p-12 shadow-card border border-border-light text-center">
        <i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i>
        <p class="text-error font-medium">${err.message}</p>
        <button onclick="navigate('booking-detail', '${type}:${id}')" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button>
      </div>`;
  }
  lucide.createIcons();
}
