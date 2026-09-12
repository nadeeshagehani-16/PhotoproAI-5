// Studio Bookings Page – Full CRUD with Timetable
let _studioBookingsCache = [];
let _studioBookingsStudios = [];
let _studioBookingsCustomers = [];

// ── Validation Helpers ──
function _stbTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _isValidEmail(email) {
  if (!email) return true; // optional field
  // Reject special chars like # $ % ^ & * in local part; standard RFC-ish check
  const re = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

function _validateStudioBooking(data) {
  const errors = [];
  const today = _stbTodayStr();

  // Required fields
  if (!data.studioId) errors.push('Please select a studio.');
  if (!data.customerId) errors.push('Please select a client.');
  if (!data.date) errors.push('Please select a booking date.');
  if (!data.startTime) errors.push('Please enter a start time.');
  if (!data.endTime) errors.push('Please enter an end time.');
  if (!data.purpose || !data.purpose.trim()) errors.push('Please enter a purpose for the booking.');

  // Date must be today or future
  if (data.date && data.date < today) {
    errors.push('Booking date cannot be in the past. Please select today or a future date.');
  }

  // End time must be after start time
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    errors.push('End time must be after start time.');
  }

  // Cost cannot be negative
  if (data.totalCost < 0 || isNaN(data.totalCost)) {
    errors.push('Total cost cannot be negative. Please enter 0 or a positive amount.');
  }

  return errors;
}

// Helper: reload the page we're currently on (calendar or studio-bookings)
async function _reloadActivePage() {
  if (typeof currentPage !== 'undefined' && currentPage === 'calendar' && typeof loadCalendarData === 'function') {
    await loadCalendarData();
  } else {
    await loadStudioBookings();
  }
}

async function renderStudioBookings() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Studio Bookings', 'Schedule and manage studio time slots', `<button onclick="openAddStudioBookingModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Book Studio</button>`)}
    <div class="flex gap-2 mb-4 flex-wrap">
      <button onclick="switchStudioView('table')" id="sv-table-btn" class="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white transition">Table View</button>
      <button onclick="switchStudioView('timetable')" id="sv-timetable-btn" class="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-border-light text-text-secondary hover:bg-hover-light transition">Timetable View</button>
      <button onclick="switchStudioView('slots')" id="sv-slots-btn" class="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-border-light text-text-secondary hover:bg-hover-light transition">Available Slots</button>
    </div>
    <div class="flex gap-3 mb-6 flex-wrap items-center bg-white rounded-xl border border-border-light p-3">
      <label class="text-sm font-medium text-text-secondary">Filter:</label>
      <input id="stb-filter-from" type="date" class="px-3 py-1.5 rounded-lg border border-border-light text-sm" placeholder="From" />
      <span class="text-text-secondary text-sm">to</span>
      <input id="stb-filter-to" type="date" class="px-3 py-1.5 rounded-lg border border-border-light text-sm" placeholder="To" />
      <select id="stb-filter-studio" class="px-3 py-1.5 rounded-lg border border-border-light text-sm bg-white"><option value="">All Studios</option></select>
      <button onclick="applyStbFilters()" class="btn-dark px-4 py-1.5 text-sm">Apply</button>
      <button onclick="clearStbFilters()" class="btn-ghost px-4 py-1.5 text-sm">Clear</button>
    </div>
    <div id="stb-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="stb-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadStudioBookings();
}

async function loadStudioBookings() {
  try {
    const [bookRes, studioRes, custRes] = await Promise.all([
      api.getStudioBookings(), api.getStudios(), api.getCustomers()
    ]);
    _studioBookingsCache = bookRes.data;
    _studioBookingsStudios = studioRes.data;
    _studioBookingsCustomers = custRes.data;
    // Populate studio filter dropdown
    const studioSelect = document.getElementById('stb-filter-studio');
    if (studioSelect) {
      studioSelect.innerHTML = '<option value="">All Studios</option>' +
        _studioBookingsStudios.map(s => `<option value="${s._id || s.id}">${s.name}</option>`).join('');
    }
    renderStudioBookingsTable(_studioBookingsCache);
  } catch (err) {
    _studioBookingsCache = MOCK.studioBookings || [];
    _studioBookingsStudios = MOCK.studios || [];
    _studioBookingsCustomers = MOCK.clients || [];
    const studioSelect = document.getElementById('stb-filter-studio');
    if (studioSelect) {
      studioSelect.innerHTML = '<option value="">All Studios</option>' +
        _studioBookingsStudios.map(s => `<option value="${s._id || s.id}">${s.name}</option>`).join('');
    }
    if (_studioBookingsCache.length > 0) {
      renderStudioBookingsTable(_studioBookingsCache);
      const content = document.getElementById('stb-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('stb-loading').classList.add('hidden');
      const content = document.getElementById('stb-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadStudioBookings()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function studioBookingRow(b) {
  const bid = b._id || b.id;
  const studioName = b.studioId?.name || b.studio || '—';
  const clientName = b.customerId?.name || b.client || '—';
  return `<tr>
    <td><span class="font-semibold text-sm">${studioName}</span></td>
    <td><span class="text-sm">${clientName}</span></td>
    <td><div class="text-sm">${formatDateForInput(b.date)||'\u2014'}</div><div class="text-xs text-text-secondary">${b.startTime||''} \u2013 ${b.endTime||''}</div></td>
    <td class="text-sm text-text-secondary max-w-[160px] truncate">${b.purpose||'—'}</td>
    <td class="font-semibold text-sm">${formatCurrency(b.totalCost||0)}</td>
    <td>${statusBadge(b.status||'Pending')}</td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${b.paymentStatus==='Paid'?'text-green-700 bg-green-50':'text-amber-700 bg-amber-50'}">${b.paymentStatus||'Unpaid'}</span></td>
    <td><div class="flex items-center gap-1">
      <button onclick="openEditStudioBookingModal('${bid}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteStudioBooking('${bid}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function renderStudioBookingsTable(bookings) {
  document.getElementById('stb-loading').classList.add('hidden');
  const content = document.getElementById('stb-content');
  content.classList.remove('hidden');
  const totalCost = bookings.filter(b=>b.status!=='Cancelled').reduce((s,b) => s + (b.totalCost||0), 0);
  content.innerHTML = `
    ${kpiCards([
      { label:'Total Bookings', value:bookings.length, icon:'calendar-days', iconBg:'bg-blue-100', iconColor:'text-blue-600' },
      { label:'Confirmed', value:bookings.filter(b=>b.status==='Confirmed').length, icon:'check-circle', iconBg:'bg-green-100', iconColor:'text-green-600' },
      { label:'Revenue', value:formatCurrency(totalCost), icon:'trending-up', iconBg:'bg-purple-100', iconColor:'text-purple-600' },
      { label:'Pending', value:bookings.filter(b=>b.status==='Pending').length, icon:'clock', iconBg:'bg-amber-100', iconColor:'text-amber-600' },
    ])}
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Confirmed','Pending','Completed','Cancelled'].map((s,i) => `<button onclick="filterStbByStatus('${s}')" class="stb-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Studio</th><th>Client</th><th>Date & Time</th><th>Purpose</th><th>Cost</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
        <tbody id="stb-tbody">${bookings.map(b => studioBookingRow(b)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary"><span>Showing ${bookings.length} booking(s)</span></div>`;
  lucide.createIcons();
}

function filterStbByStatus(status) {
  document.querySelectorAll('.stb-tab').forEach(t => {
    t.className = 'stb-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ' +
      (t.textContent.trim() === status ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  const filtered = status === 'All' ? _studioBookingsCache : _studioBookingsCache.filter(b => b.status === status);
  document.getElementById('stb-tbody').innerHTML = filtered.map(b => studioBookingRow(b)).join('');
  lucide.createIcons();
}

// ── Date & Studio Filters ──
function applyStbFilters() {
  const from = document.getElementById('stb-filter-from')?.value || '';
  const to = document.getElementById('stb-filter-to')?.value || '';
  const studioId = document.getElementById('stb-filter-studio')?.value || '';
  let filtered = _studioBookingsCache;
  if (from) {
    filtered = filtered.filter(b => {
      const bDate = (b.date || '').split('T')[0];
      return bDate >= from;
    });
  }
  if (to) {
    filtered = filtered.filter(b => {
      const bDate = (b.date || '').split('T')[0];
      return bDate <= to;
    });
  }
  if (studioId) {
    filtered = filtered.filter(b => {
      const sid = b.studioId?._id || b.studioId || '';
      return sid === studioId;
    });
  }
  renderStudioBookingsTable(filtered);
}

function clearStbFilters() {
  const from = document.getElementById('stb-filter-from');
  const to = document.getElementById('stb-filter-to');
  const studio = document.getElementById('stb-filter-studio');
  if (from) from.value = '';
  if (to) to.value = '';
  if (studio) studio.value = '';
  renderStudioBookingsTable(_studioBookingsCache);
}

// Helper: format MongoDB ISO date to yyyy-MM-dd for date input
function formatDateForInput(d) {
  if (!d) return '';
  if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
  return d;
}

// ── Timetable / Slots View ──
function switchStudioView(view) {
  const btns = { table: 'sv-table-btn', timetable: 'sv-timetable-btn', slots: 'sv-slots-btn' };
  const activeCls = 'px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white transition';
  const inactiveCls = 'px-4 py-2 rounded-xl text-sm font-medium bg-white border border-border-light text-text-secondary hover:bg-hover-light transition';
  Object.entries(btns).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.className = k === view ? activeCls : inactiveCls;
  });
  if (view === 'timetable') renderTimetable();
  else if (view === 'slots') renderAvailableSlots();
  else renderStudioBookingsTable(_studioBookingsCache);
}

function renderTimetable() {
  const studios = _studioBookingsStudios.length ? _studioBookingsStudios : MOCK.studios;
  const content = document.getElementById('stb-content');
  const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
  content.innerHTML = `
    <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-x-auto">
      <div class="p-4 border-b border-border-light flex items-center gap-3">
        <label class="text-sm font-medium text-text-secondary">Studio:</label>
        <select id="tt-studio-select" onchange="renderTimetable()" class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${studios.map((s,i)=>`<option value="${s._id||s.id}" ${i===0?'selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <table class="w-full text-sm">
        <thead><tr class="bg-surface">
          <th class="px-4 py-3 text-left font-semibold text-text-secondary border-b border-border-light w-24">Time</th>
          <th class="px-4 py-3 text-left font-semibold text-text-secondary border-b border-border-light">Details</th>
        </tr></thead>
        <tbody>${hours.map(h => {
          const hNum = parseInt(h);
          const bookings = _studioBookingsCache.filter(b => {
            const sh = parseInt((b.startTime||'').split(':')[0]);
            const eh = parseInt((b.endTime||'').split(':')[0]);
            return hNum >= sh && hNum < eh;
          });
          const isActive = bookings.length > 0;
          return `<tr class="${isActive ? 'bg-blue-50' : ''} border-b border-border-light">
            <td class="px-4 py-4 font-mono text-text-secondary font-semibold">${h}</td>
            <td class="px-4 py-4">${isActive ? bookings.map(b => {
              const clientName = b.customerId?.name || b.client || '—';
              const statusColor = b.status==='Confirmed'?'bg-green-100 text-green-700':b.status==='Pending'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600';
              return `<div class="flex items-center gap-3 py-1">
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${statusColor}">${b.status}</span>
                <span class="font-medium">${clientName}</span>
                <span class="text-text-secondary text-xs">${b.purpose||''}</span>
              </div>`;
            }).join('') : '<span class="text-text-secondary text-xs">— Free —</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  lucide.createIcons();
}

// ── Available Time Slots View ──
async function renderAvailableSlots() {
  const studios = _studioBookingsStudios.length ? _studioBookingsStudios : MOCK.studios;
  const content = document.getElementById('stb-content');
  content.classList.remove('hidden');
  document.getElementById('stb-loading').classList.add('hidden');
  const today = new Date().toISOString().split('T')[0];
  content.innerHTML = `
    <div class="bg-white rounded-2xl shadow-card border border-border-light p-6">
      <div class="flex items-center gap-4 mb-6 flex-wrap">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio</label>
          <select id="slots-studio" class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white">
            ${studios.map(s => `<option value="${s._id || s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date</label>
          <input id="slots-date" type="date" value="${today}" min="${today}" class="px-4 py-2 rounded-xl border border-border-light text-sm" />
        </div>
        <div class="flex items-end"><button onclick="loadAvailableSlots()" class="btn-dark px-6 py-2 text-sm">Check Availability</button></div>
      </div>
      <div id="slots-loading" class="hidden flex items-center justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
      <div id="slots-result"></div>
    </div>`;
  lucide.createIcons();
  await loadAvailableSlots();
}

async function loadAvailableSlots() {
  const studioId = document.getElementById('slots-studio')?.value;
  const date = document.getElementById('slots-date')?.value;
  if (!studioId || !date) return;
  const loading = document.getElementById('slots-loading');
  const result = document.getElementById('slots-result');
  loading.classList.remove('hidden');
  result.innerHTML = '';
  try {
    const res = await api.getAvailableSlots(studioId, date);
    const slots = res.data.availableSlots || [];
    const booked = res.data.bookedSlots || [];
    const available = slots.filter(s => s.available).length;
    const total = slots.length;
    result.innerHTML = `
      <div class="flex gap-4 mb-4">
        <div class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block"></span><span class="text-sm text-text-secondary">Available (${available})</span></div>
        <div class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block"></span><span class="text-sm text-text-secondary">Booked (${total - available})</span></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        ${slots.map(s => `
          <div class="p-3 rounded-xl border text-center text-sm font-medium ${s.available ? 'bg-green-50 border-green-200 text-green-700 cursor-pointer hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-400 line-through cursor-not-allowed'}"
            ${s.available ? `onclick="openAddStudioBookingModalForSlot('${studioId}','${date}','${s.start}','${s.end}')"` : ''}>
            ${s.start} – ${s.end}
          </div>`).join('')}
      </div>
      ${booked.length ? `<div class="mt-4"><h4 class="text-sm font-semibold text-text-secondary mb-2">Current Bookings:</h4>
        ${booked.map(b => `<div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-amber-50 border border-amber-200 mb-2 text-sm">
          <span class="px-2 py-0.5 rounded text-xs font-semibold ${b.status==='Confirmed'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}">${b.status}</span>
          <span class="font-medium">${b.startTime} – ${b.endTime}</span>
        </div>`).join('')}</div>` : ''}`;
  } catch (err) {
    result.innerHTML = `<p class="text-sm text-error">${err.message}</p>`;
  }
  loading.classList.add('hidden');
}

function openAddStudioBookingModalForSlot(studioId, date, start, end) {
  openAddStudioBookingModal();
  // Pre-fill the form with the selected slot
  setTimeout(() => {
    const studioEl = document.getElementById('astb-studio');
    const dateEl = document.getElementById('astb-date');
    const startEl = document.getElementById('astb-start');
    const endEl = document.getElementById('astb-end');
    if (studioEl) studioEl.value = studioId;
    if (dateEl) dateEl.value = date;
    if (startEl) startEl.value = start;
    if (endEl) endEl.value = end;
  }, 100);
}

// ── Add Studio Booking Modal ──
function openAddStudioBookingModal() {
  const studios = _studioBookingsStudios.length ? _studioBookingsStudios : MOCK.studios;
  const clients = _studioBookingsCustomers.length ? _studioBookingsCustomers : MOCK.clients;
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Book Studio</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-stb-form" onsubmit="handleCreateStudioBooking(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio *</label><select id="astb-studio" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${studios.map(s=>`<option value="${s._id||s.id}">${s.name} – ${formatCurrency(s.pricePerHour||0)}/hr</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="astb-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}">${c.name}</option>`).join('')}</select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="astb-date" type="date" required min="${_stbTodayStr()}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time *</label><input id="astb-start" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time *</label><input id="astb-end" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Purpose *</label><input id="astb-purpose" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Wedding album shoot" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Total Cost (Rs.)</label><input id="astb-cost" type="number" min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Auto-calculated" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="astb-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Pending</option><option>Confirmed</option><option>Completed</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="astb-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none" placeholder="Special requirements..."></textarea></div>
      <div id="astb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="astb-submit" class="btn-dark flex-1 py-2.5 text-sm">Book Studio</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateStudioBooking(e) {
  e.preventDefault();
  const errEl = document.getElementById('astb-error');
  const btn = document.getElementById('astb-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Booking...';

  const formData = {
    studioId: document.getElementById('astb-studio').value,
    customerId: document.getElementById('astb-client').value,
    date: document.getElementById('astb-date').value,
    startTime: document.getElementById('astb-start').value,
    endTime: document.getElementById('astb-end').value,
    purpose: document.getElementById('astb-purpose').value.trim(),
    totalCost: parseFloat(document.getElementById('astb-cost').value) || 0,
    status: document.getElementById('astb-status').value,
    notes: document.getElementById('astb-notes').value.trim(),
  };

  // Frontend validation
  const errors = _validateStudioBooking(formData);
  if (errors.length > 0) {
    errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
    errEl.classList.remove('hidden');
    lucide.createIcons();
    btn.disabled = false; btn.textContent = 'Book Studio'; return;
  }

  try {
    await api.createStudioBooking(formData);
    closeModal(); showToast('Studio booked successfully!'); await _reloadActivePage();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Book Studio';
  }
}

// ── Edit Studio Booking Modal ──
function openEditStudioBookingModal(id) {
  let b = _studioBookingsCache.find(x => (x._id||x.id) == id);
  // Fallback: check calendar's data if studio-bookings cache is empty
  if (!b && typeof _calStudioBookings !== 'undefined') {
    b = _calStudioBookings.find(x => (x._id||x.id) == id);
  }
  if (!b) return;
  const studios = _studioBookingsStudios.length ? _studioBookingsStudios : (typeof _calStudios !== 'undefined' && _calStudios.length ? _calStudios : MOCK.studios);
  const clients = _studioBookingsCustomers.length ? _studioBookingsCustomers : (typeof _calCustomers !== 'undefined' && _calCustomers.length ? _calCustomers : MOCK.clients);
  const studioId = b.studioId?._id || b.studioId || '';
  const custId = b.customerId?._id || b.customerId || '';
  const esc = (s) => (s||'').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Studio Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-stb-form" onsubmit="handleUpdateStudioBooking(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio *</label><select id="estb-studio" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${studios.map(s=>`<option value="${s._id||s.id}" ${(s._id||s.id)===studioId?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="estb-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">${clients.map(c=>`<option value="${c._id||c.id}" ${(c._id||c.id)===custId?'selected':''}>${c.name}</option>`).join('')}</select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="estb-date" type="date" required min="${_stbTodayStr()}" value="${formatDateForInput(b.date)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time *</label><input id="estb-start" type="time" required value="${b.startTime||''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time *</label><input id="estb-end" type="time" required value="${b.endTime||''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Purpose</label><input id="estb-purpose" type="text" value="${esc(b.purpose)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Total Cost (Rs.)</label><input id="estb-cost" type="number" min="0" value="${b.totalCost||0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="estb-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Pending','Confirmed','Completed','Cancelled'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Payment Status</label><select id="estb-payment" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
        ${['Unpaid','Paid','Refunded'].map(s=>`<option ${b.paymentStatus===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="estb-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none">${esc(b.notes)}</textarea></div>
      <div id="estb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="estb-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateStudioBooking(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('estb-error');
  const btn = document.getElementById('estb-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';

  const formData = {
    studioId: document.getElementById('estb-studio').value,
    customerId: document.getElementById('estb-client').value,
    date: document.getElementById('estb-date').value,
    startTime: document.getElementById('estb-start').value,
    endTime: document.getElementById('estb-end').value,
    purpose: document.getElementById('estb-purpose').value.trim(),
    totalCost: parseFloat(document.getElementById('estb-cost').value) || 0,
    status: document.getElementById('estb-status').value,
    paymentStatus: document.getElementById('estb-payment').value,
    notes: document.getElementById('estb-notes').value.trim(),
  };

  // Frontend validation
  const errors = _validateStudioBooking(formData);
  if (errors.length > 0) {
    errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
    errEl.classList.remove('hidden');
    lucide.createIcons();
    btn.disabled = false; btn.textContent = 'Save Changes'; return;
  }

  try {
    await api.updateStudioBooking(id, formData);
    closeModal(); showToast('Studio booking updated successfully!'); await _reloadActivePage();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Studio Booking ──
function confirmDeleteStudioBooking(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Cancel & Delete Booking?</h2>
    <p class="text-text-secondary text-sm mb-6">This will permanently remove this studio booking and free the time slot.</p>
    <div id="dstb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteStudioBooking('${id}')" id="dstb-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteStudioBooking(id) {
  const btn = document.getElementById('dstb-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deleteStudioBooking(id);
    closeModal(); showToast('Studio booking cancelled successfully!'); await _reloadActivePage();
  } catch (err) {
    document.getElementById('dstb-error').textContent = err.message;
    document.getElementById('dstb-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}
