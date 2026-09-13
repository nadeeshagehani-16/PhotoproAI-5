// Calendar Page – Dynamic Calendar with Full CRUD (Studio Bookings + Service Bookings)
let _calMonth = new Date().getMonth();
let _calYear = new Date().getFullYear();
let _calBookings = [];       // merged: studio + service bookings
let _calStudioBookings = [];
let _calServiceBookings = [];
let _calStudios = [];
let _calCustomers = [];
let _calPackages = [];
let _calFilter = 'all';      // all | studio | service
let _calDemoMode = false;    // true when using mock data (CRUD disabled)

// Check if an ID is a valid MongoDB ObjectId (24 hex chars)
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

// Local-date helper (timezone-safe, avoids UTC shift in toISOString)
function _calTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _calFormatDate(d) {
  if (!d) return '—';
  if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
  return d;
}

function _validateCalForm(type) {
  const errors = [];
  const today = _calTodayStr();
  const date = document.getElementById('cal-date').value;
  const start = document.getElementById('cal-start').value;
  const end = document.getElementById('cal-end').value;
  const cost = document.getElementById('cal-cost').value;
  const notes = document.getElementById('cal-notes').value.trim();
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!date) errors.push('Date is required.');
  else if (date < today) errors.push('Date cannot be in the past. Please select today or a future date.');

  if (!start) errors.push('Start time is required.');
  else if (!timeRe.test(start)) errors.push('Start time is invalid (use HH:MM format).');

  if (!end) errors.push('End time is required.');
  else if (!timeRe.test(end)) errors.push('End time is invalid (use HH:MM format).');

  if (start && end && end <= start) errors.push('End time must be after start time.');

  if (type === 'studio') {
    if (!document.getElementById('cal-purpose').value.trim()) errors.push('Purpose is required.');
  } else {
    if (!document.getElementById('cal-event-name').value.trim()) errors.push('Event type is required.');
    if (!document.getElementById('cal-location').value.trim()) errors.push('Location is required.');
    const pkgId = document.getElementById('cal-package').value;
    if (!pkgId || !isValidObjectId(pkgId)) errors.push('Please select a valid package.');
  }

  if (cost !== '' && (isNaN(Number(cost)) || Number(cost) < 0)) errors.push('Cost cannot be negative.');
  if (notes.length > 1000) errors.push('Notes cannot exceed 1000 characters.');

  return errors;
}

function _calShowErrors(errEl, errors, btn, label) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false;
  btn.textContent = label;
}

async function renderCalendar() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Calendar', 'Visual overview of all scheduled sessions', `
      <div class="flex gap-2">
        <button onclick="calPrevMonth()" class="btn-ghost px-3 py-2 text-sm"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
        <span id="cal-month-label" class="px-4 py-2 text-sm font-semibold bg-white rounded-xl border border-border-light"></span>
        <button onclick="calNextMonth()" class="btn-ghost px-3 py-2 text-sm"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
        <button onclick="calGoToToday()" class="btn-ghost px-4 py-2 text-sm">Today</button>
        <button onclick="openCalAddModal()" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Booking</button>
      </div>`)}
    <div class="flex gap-2 mb-6 flex-wrap items-center">
      <button onclick="calSetFilter('all')" class="cal-filter-btn px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white transition">All</button>
      <button onclick="calSetFilter('studio')" class="cal-filter-btn px-4 py-2 rounded-xl text-sm font-medium bg-white border border-border-light text-text-secondary hover:bg-hover-light transition">Studio Bookings</button>
      <button onclick="calSetFilter('service')" class="cal-filter-btn px-4 py-2 rounded-xl text-sm font-medium bg-white border border-border-light text-text-secondary hover:bg-hover-light transition">Service Bookings</button>
      <div class="flex-1"></div>
      <select id="cal-studio-filter" onchange="renderCalendarGrid()" class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white">
        <option value="">All Studios</option>
      </select>
    </div>
    <div id="cal-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="cal-grid-wrap" class="hidden">
      <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-hidden">
        <div class="cal-grid border-b border-border-light" id="cal-header"></div>
        <div class="cal-grid" id="cal-body"></div>
      </div>
      <div class="flex gap-4 mt-4 flex-wrap">
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event studio inline-block"></span><span class="text-xs text-text-secondary">Studio Booking</span></div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event wedding inline-block"></span><span class="text-xs text-text-secondary">Wedding</span></div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event birthday inline-block"></span><span class="text-xs text-text-secondary">Birthday</span></div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event corporate inline-block"></span><span class="text-xs text-text-secondary">Corporate</span></div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event portrait inline-block"></span><span class="text-xs text-text-secondary">Portrait</span></div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event other inline-block"></span><span class="text-xs text-text-secondary">Event</span></div>
      </div>
    </div>`;
  lucide.createIcons();
  await loadCalendarData();
}

async function loadCalendarData() {
  _calDemoMode = false;
  try {
    const [stbRes, sbRes, studioRes, custRes, pkgRes] = await Promise.all([
      api.getStudioBookings(), api.getServiceBookings(), api.getStudios(), api.getCustomers(), api.getPackages()
    ]);
    _calStudioBookings = stbRes.data || [];
    _calServiceBookings = sbRes.data || [];
    _calStudios = studioRes.data || [];
    _calCustomers = custRes.data || [];
    _calPackages = pkgRes.data || [];
    // Merge into unified list
    _calBookings = [
      ..._calStudioBookings.map(b => ({ ...b, _type: 'studio', _label: b.studioId?.name || 'Studio', _eventClass: 'studio' })),
      ..._calServiceBookings.map(b => ({ ...b, _type: 'service', _label: b.event || 'Service', _eventClass: getEventClass(b.event) }))
    ];
    populateStudioFilter();
    renderCalendarGrid();
  } catch (err) {
    // Fallback to mock data
    _calDemoMode = true;
    _calStudioBookings = MOCK.studioBookings || [];
    _calServiceBookings = MOCK.serviceBookings || [];
    _calStudios = MOCK.studios || [];
    _calCustomers = MOCK.clients || [];
    _calPackages = MOCK.packages || [];
    _calBookings = [
      ..._calStudioBookings.map(b => ({ ...b, _type: 'studio', _label: b.studioId?.name || 'Studio', _eventClass: 'studio' })),
      ..._calServiceBookings.map(b => ({ ...b, _type: 'service', _label: b.event || 'Service', _eventClass: getEventClass(b.event) }))
    ];
    populateStudioFilter();
    renderCalendarGrid();
    showToast('Showing demo data. Start backend for live CRUD.', 'info');
  }
}

function getEventClass(event) {
  if (!event) return 'other';
  const e = event.toLowerCase();
  if (e.includes('wedding')) return 'wedding';
  if (e.includes('birthday')) return 'birthday';
  if (e.includes('corporate')) return 'corporate';
  if (e.includes('portrait')) return 'portrait';
  return 'other';
}

function populateStudioFilter() {
  const sel = document.getElementById('cal-studio-filter');
  if (!sel) return;
  sel.innerHTML = '<option value="">All Studios</option>' +
    _calStudios.map(s => `<option value="${s._id || s.id}">${s.name}</option>`).join('');
}

// ── Month Navigation ──
function calPrevMonth() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendarGrid();
}
function calNextMonth() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  renderCalendarGrid();
}
function calGoToToday() {
  _calMonth = new Date().getMonth();
  _calYear = new Date().getFullYear();
  renderCalendarGrid();
}

function calSetFilter(f) {
  _calFilter = f;
  document.querySelectorAll('.cal-filter-btn').forEach(btn => {
    const isActive = btn.textContent.trim().toLowerCase().includes(f === 'all' ? 'all' : f === 'studio' ? 'studio' : 'service');
    btn.className = 'cal-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition ' +
      (isActive ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light');
  });
  renderCalendarGrid();
}

// ── Render Calendar Grid ──
function renderCalendarGrid() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const label = document.getElementById('cal-month-label');
  if (label) label.textContent = `${monthNames[_calMonth]} ${_calYear}`;

  // Header
  const header = document.getElementById('cal-header');
  if (header) header.innerHTML = days.map(d => `<div class="bg-surface py-3 px-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">${d}</div>`).join('');

  // Calculate grid
  const firstDay = new Date(_calYear, _calMonth, 1).getDay();
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const daysInPrev = new Date(_calYear, _calMonth, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const studioFilter = document.getElementById('cal-studio-filter')?.value || '';

  let html = '';
  for (let i = 0; i < totalCells; i++) {
    let day, month, year, isCurrentMonth;
    if (i < firstDay) {
      day = daysInPrev - firstDay + 1 + i;
      month = _calMonth - 1; year = _calYear;
      if (month < 0) { month = 11; year--; }
      isCurrentMonth = false;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      month = _calMonth + 1; year = _calYear;
      if (month > 11) { month = 0; year++; }
      isCurrentMonth = false;
    } else {
      day = i - firstDay + 1;
      month = _calMonth; year = _calYear;
      isCurrentMonth = true;
    }

    const isToday = day === todayDate && month === todayMonth && year === todayYear;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Find events for this date
    let events = _calBookings.filter(b => {
      const bDate = (b.date || '').split('T')[0];
      if (bDate !== dateStr) return false;
      if (_calFilter === 'studio' && b._type !== 'studio') return false;
      if (_calFilter === 'service' && b._type !== 'service') return false;
      if (studioFilter && b._type === 'studio') {
        const sid = b.studioId?._id || b.studioId || '';
        if (sid !== studioFilter) return false;
      }
      return true;
    });

    const dayNumHtml = isCurrentMonth
      ? `<p class="text-xs font-semibold mb-1 ${isToday ? 'text-accent' : 'text-text-secondary'}">${day}</p>`
      : `<p class="text-xs font-semibold mb-1 text-gray-300">${day}</p>`;

    const eventsHtml = events.slice(0, 3).map(ev => {
      const bid = ev._id || ev.id;
      const title = ev._type === 'studio'
        ? `${ev.studioId?.name || 'Studio'} – ${ev.purpose || 'Booking'}`
        : `${ev.event || 'Service'} – ${ev.customerId?.name || ''}`;
      return `<div class="cal-event ${ev._eventClass}" onclick="calViewEvent('${bid}','${ev._type}')" title="${title}">${title}</div>`;
    }).join('');

    const moreHtml = events.length > 3 ? `<div class="text-xs text-accent font-semibold cursor-pointer mt-0.5" onclick="calShowDayEvents('${dateStr}')">+${events.length - 3} more</div>` : '';

    html += `<div class="cal-cell ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'opacity-30' : ''}" onclick="openCalAddModalForDate('${dateStr}')">
      ${dayNumHtml}${eventsHtml}${moreHtml}
    </div>`;
  }

  const body = document.getElementById('cal-body');
  if (body) body.innerHTML = html;

  // Show grid, hide loader
  const loading = document.getElementById('cal-loading');
  const gridWrap = document.getElementById('cal-grid-wrap');
  if (loading) loading.classList.add('hidden');
  if (gridWrap) gridWrap.classList.remove('hidden');
  lucide.createIcons();
}

// ── Add Booking Modal (from calendar) ──
function openCalAddModal() {
  const dateStr = `${_calYear}-${String(_calMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  openCalAddModalForDate(dateStr);
}

function openCalAddModalForDate(dateStr) {
  if (_calDemoMode) {
    showToast('Demo mode – start the backend server to create bookings.', 'alert-circle');
    return;
  }
  const studios = _calStudios.length ? _calStudios : MOCK.studios;
  const clients = _calCustomers.length ? _calCustomers : MOCK.clients;
  const packages = _calPackages.length ? _calPackages : MOCK.packages;
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="cal-add-form" onsubmit="handleCalCreate(event)" class="space-y-4">
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Booking Type *</label>
        <select id="cal-type" required onchange="toggleCalTypeFields()" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option value="studio">Studio Booking</option>
          <option value="service">Service Booking</option>
        </select>
      </div>
      <div id="cal-studio-field"><label class="block text-sm font-medium text-text-secondary mb-1">Studio *</label>
        <select id="cal-studio" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${studios.map(s => `<option value="${s._id || s.id}">${s.name} – ${formatCurrency(s.pricePerHour || 0)}/hr</option>`).join('')}
        </select>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label>
        <select id="cal-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${clients.map(c => `<option value="${c._id || c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label>
          <input id="cal-date" type="date" required min="${_calTodayStr()}" value="${dateStr}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" />
        </div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time *</label>
          <input id="cal-start" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" />
        </div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time *</label>
          <input id="cal-end" type="time" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" />
        </div>
      </div>
      <div id="cal-purpose-field"><label class="block text-sm font-medium text-text-secondary mb-1">Purpose *</label>
        <input id="cal-purpose" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Wedding album shoot" />
      </div>
      <div id="cal-event-field" class="hidden"><label class="block text-sm font-medium text-text-secondary mb-1">Event Type *</label>
        <input id="cal-event-name" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Wedding, Portrait, Corporate..." />
      </div>
      <div id="cal-package-field" class="hidden"><label class="block text-sm font-medium text-text-secondary mb-1">Package *</label>
        <select id="cal-package" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${packages.map(p => `<option value="${p._id || p.id}">${p.name} – ${formatCurrency(p.price || 0)}</option>`).join('')}
        </select>
      </div>
      <div id="cal-location-field" class="hidden"><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label>
        <input id="cal-location" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="Event location" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Total Cost (Rs.)</label>
          <input id="cal-cost" type="number" min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="0" />
        </div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label>
          <select id="cal-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
            <option>Pending</option><option>Confirmed</option><option>Completed</option>
          </select>
        </div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
        <textarea id="cal-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none" placeholder="Special requirements..."></textarea>
      </div>
      <div id="cal-add-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="cal-add-submit" class="btn-dark flex-1 py-2.5 text-sm">Create Booking</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

function toggleCalTypeFields() {
  const type = document.getElementById('cal-type').value;
  const isStudio = type === 'studio';
  document.getElementById('cal-studio-field').classList.toggle('hidden', !isStudio);
  document.getElementById('cal-purpose-field').classList.toggle('hidden', !isStudio);
  document.getElementById('cal-event-field').classList.toggle('hidden', isStudio);
  document.getElementById('cal-package-field').classList.toggle('hidden', isStudio);
  document.getElementById('cal-location-field').classList.toggle('hidden', isStudio);
}

async function handleCalCreate(e) {
  e.preventDefault();
  const errEl = document.getElementById('cal-add-error');
  const btn = document.getElementById('cal-add-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Creating...';
  const type = document.getElementById('cal-type').value;

  // Comprehensive validation
  const errors = _validateCalForm(type);
  if (errors.length > 0) { _calShowErrors(errEl, errors, btn, 'Create Booking'); return; }

  // Validate IDs are valid MongoDB ObjectIds
  const clientId = document.getElementById('cal-client').value;
  const studioId = type === 'studio' ? document.getElementById('cal-studio').value : null;
  if (!isValidObjectId(clientId)) {
    errEl.textContent = 'Invalid client selected. Please ensure the backend server is running and refresh the page.';
    errEl.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Create Booking'; return;
  }
  if (studioId && !isValidObjectId(studioId)) {
    errEl.textContent = 'Invalid studio selected. Please ensure the backend server is running and refresh the page.';
    errEl.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Create Booking'; return;
  }

  try {
    if (type === 'studio') {
      await api.createStudioBooking({
        studioId: document.getElementById('cal-studio').value,
        customerId: document.getElementById('cal-client').value,
        date: document.getElementById('cal-date').value,
        startTime: document.getElementById('cal-start').value,
        endTime: document.getElementById('cal-end').value,
        purpose: document.getElementById('cal-purpose').value.trim(),
        totalCost: parseFloat(document.getElementById('cal-cost').value) || 0,
        status: document.getElementById('cal-status').value,
        notes: document.getElementById('cal-notes').value.trim(),
      });
    } else {
      await api.createServiceBooking({
        customerId: document.getElementById('cal-client').value,
        date: document.getElementById('cal-date').value,
        startTime: document.getElementById('cal-start').value,
        endTime: document.getElementById('cal-end').value,
        event: document.getElementById('cal-event-name').value.trim(),
        location: document.getElementById('cal-location').value.trim(),
        amount: parseFloat(document.getElementById('cal-cost').value) || 0,
        status: document.getElementById('cal-status').value,
        notes: document.getElementById('cal-notes').value.trim(),
        packageId: document.getElementById('cal-package').value,
      });
    }
    closeModal(); showToast('Booking created!');
    await loadCalendarData();
  } catch (err) {
    const msg = err.message === 'Invalid ID format' ? 'Invalid data. Please refresh the page and try again.' : err.message;
    errEl.textContent = msg; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Create Booking';
  }
}

// ── View / Edit / Delete from Calendar ──
function calViewEvent(id, type) {
  event.stopPropagation();
  const b = _calBookings.find(x => (x._id || x.id) == id);
  if (!b) return;

  if (type === 'studio') {
    openCalViewStudioBooking(id);
  } else {
    openCalViewServiceBooking(id);
  }
}

function openCalViewStudioBooking(id) {
  const b = _calStudioBookings.find(x => (x._id || x.id) == id);
  if (!b) return;
  const studioName = b.studioId?.name || '—';
  const clientName = b.customerId?.name || '—';
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Studio Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-4">
        <div><span class="text-text-secondary">Studio:</span><br><span class="font-semibold">${studioName}</span></div>
        <div><span class="text-text-secondary">Client:</span><br><span class="font-semibold">${clientName}</span></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><span class="text-text-secondary">Date:</span><br><span class="font-semibold">${_calFormatDate(b.date)}</span></div>
        <div><span class="text-text-secondary">Start:</span><br><span class="font-semibold">${b.startTime || '—'}</span></div>
        <div><span class="text-text-secondary">End:</span><br><span class="font-semibold">${b.endTime || '—'}</span></div>
      </div>
      <div><span class="text-text-secondary">Purpose:</span><br><span class="font-semibold">${b.purpose || '—'}</span></div>
      <div class="grid grid-cols-2 gap-4">
        <div><span class="text-text-secondary">Cost:</span><br><span class="font-semibold">${formatCurrency(b.totalCost || 0)}</span></div>
        <div>${statusBadge(b.status || 'Pending')}</div>
      </div>
      <div><span class="text-text-secondary">Payment:</span> <span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${b.paymentStatus === 'Paid' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}">${b.paymentStatus || 'Unpaid'}</span></div>
      ${b.notes ? `<div><span class="text-text-secondary">Notes:</span><br><span>${b.notes}</span></div>` : ''}
    </div>
    <div class="flex gap-3 pt-4 mt-4 border-t border-border-light">
      ${_calDemoMode ? '<p class="text-sm text-amber-600 flex-1 py-2.5">Demo mode – start backend server to edit/delete.</p>' : `
      <button onclick="closeModal(); openEditStudioBookingModal('${id}')" class="btn-dark flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Edit</button>
      <button onclick="closeModal(); confirmCalDeleteStudio('${id}')" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2"><i data-lucide="trash-2" class="w-4 h-4"></i> Delete</button>`}
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Close</button>
    </div>
  </div>`);
}

function openCalViewServiceBooking(id) {
  const b = _calServiceBookings.find(x => (x._id || x.id) == id);
  if (!b) return;
  const clientName = b.customerId?.name || '—';
  const pkgName = b.packageId?.name || '—';
  const phName = b.photographerId?.name || '—';
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Service Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-4">
        <div><span class="text-text-secondary">Client:</span><br><span class="font-semibold">${clientName}</span></div>
        <div><span class="text-text-secondary">Event:</span><br><span class="font-semibold">${b.event || '—'}</span></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><span class="text-text-secondary">Date:</span><br><span class="font-semibold">${_calFormatDate(b.date)}</span></div>
        <div><span class="text-text-secondary">Start:</span><br><span class="font-semibold">${b.startTime || '—'}</span></div>
        <div><span class="text-text-secondary">End:</span><br><span class="font-semibold">${b.endTime || '—'}</span></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><span class="text-text-secondary">Package:</span><br><span class="font-semibold">${pkgName}</span></div>
        <div><span class="text-text-secondary">Photographer:</span><br><span class="font-semibold">${phName}</span></div>
      </div>
      <div><span class="text-text-secondary">Location:</span><br><span class="font-semibold">${b.location || '—'}</span></div>
      <div class="grid grid-cols-2 gap-4">
        <div><span class="text-text-secondary">Amount:</span><br><span class="font-semibold">${formatCurrency(b.amount || 0)}</span></div>
        <div>${statusBadge(b.status || 'Pending')}</div>
      </div>
      <div><span class="text-text-secondary">Payment:</span> <span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${b.payment === 'Paid' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}">${b.payment || 'Pending'}</span></div>
      ${b.notes ? `<div><span class="text-text-secondary">Notes:</span><br><span>${b.notes}</span></div>` : ''}
    </div>
    <div class="flex gap-3 pt-4 mt-4 border-t border-border-light">
      ${_calDemoMode ? '<p class="text-sm text-amber-600 flex-1 py-2.5">Demo mode – start backend server to edit/delete.</p>' : `
      <button onclick="closeModal(); openEditCalServiceBooking('${id}')" class="btn-dark flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Edit</button>
      <button onclick="closeModal(); confirmCalDeleteService('${id}')" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2"><i data-lucide="trash-2" class="w-4 h-4"></i> Delete</button>`}
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Close</button>
    </div>
  </div>`);
}

// ── Edit Service Booking from Calendar ──
function openEditCalServiceBooking(id) {
  const b = _calServiceBookings.find(x => (x._id || x.id) == id);
  if (!b) return;
  const clients = _calCustomers.length ? _calCustomers : MOCK.clients;
  const custId = b.customerId?._id || b.customerId || '';
  const esc = (s) => (s || '').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Service Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="cal-edit-sb-form" onsubmit="handleCalUpdateService(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client *</label><select id="cesb-client" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white">${clients.map(c => `<option value="${c._id || c.id}" ${(c._id || c.id) === custId ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Event *</label><input id="cesb-event" type="text" required value="${esc(b.event)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date *</label><input id="cesb-date" type="date" required min="${_calTodayStr()}" value="${(b.date || '').split('T')[0]}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start *</label><input id="cesb-start" type="time" required value="${b.startTime || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End *</label><input id="cesb-end" type="time" required value="${b.endTime || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label><input id="cesb-location" type="text" required value="${esc(b.location)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Amount (Rs.)</label><input id="cesb-amount" type="number" min="0" value="${b.amount || 0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="cesb-status" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white">${['Pending','Confirmed','In Progress','Completed','Cancelled'].map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id="cesb-notes" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm resize-none">${esc(b.notes)}</textarea></div>
      <div id="cesb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="cesb-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCalUpdateService(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('cesb-error');
  const btn = document.getElementById('cesb-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await api.updateServiceBooking(id, {
      customerId: document.getElementById('cesb-client').value,
      event: document.getElementById('cesb-event').value.trim(),
      date: document.getElementById('cesb-date').value,
      startTime: document.getElementById('cesb-start').value,
      endTime: document.getElementById('cesb-end').value,
      location: document.getElementById('cesb-location').value.trim(),
      amount: parseFloat(document.getElementById('cesb-amount').value) || 0,
      status: document.getElementById('cesb-status').value,
      notes: document.getElementById('cesb-notes').value.trim(),
    });
    closeModal(); showToast('Service booking updated!');
    await loadCalendarData();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Confirmations ──
function confirmCalDeleteStudio(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Studio Booking?</h2>
    <p class="text-text-secondary text-sm mb-6">This will permanently remove this studio booking.</p>
    <div id="calds-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleCalDeleteStudio('${id}')" id="calds-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleCalDeleteStudio(id) {
  const btn = document.getElementById('calds-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deleteStudioBooking(id);
    closeModal(); showToast('Studio booking deleted!');
    await loadCalendarData();
  } catch (err) {
    document.getElementById('calds-error').textContent = err.message;
    document.getElementById('calds-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}

function confirmCalDeleteService(id) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Service Booking?</h2>
    <p class="text-text-secondary text-sm mb-6">This will permanently remove this service booking.</p>
    <div id="caldb-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleCalDeleteService('${id}')" id="caldb-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleCalDeleteService(id) {
  const btn = document.getElementById('caldb-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deleteServiceBooking(id);
    closeModal(); showToast('Service booking deleted!');
    await loadCalendarData();
  } catch (err) {
    document.getElementById('caldb-error').textContent = err.message;
    document.getElementById('caldb-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}

// ── Day Events Popup (when "+N more" clicked) ──
function calShowDayEvents(dateStr) {
  event.stopPropagation();
  const dayBookings = _calBookings.filter(b => {
    const bDate = (b.date || '').split('T')[0];
    return bDate === dateStr;
  });
  const html = dayBookings.map(b => {
    const title = b._type === 'studio'
      ? `${b.studioId?.name || 'Studio'} – ${b.purpose || 'Booking'}`
      : `${b.event || 'Service'} – ${b.customerId?.name || ''}`;
    return `<div class="flex items-center justify-between p-3 rounded-xl border border-border-light hover:bg-hover-light cursor-pointer mb-2" onclick="closeModal(); calViewEvent('${b._id || b.id}','${b._type}')">
      <div class="flex items-center gap-3">
        <span class="cal-event ${b._eventClass}" style="display:inline-block; min-width:60px; text-align:center;">${b._type === 'studio' ? 'Studio' : b.event}</span>
        <div><p class="text-sm font-semibold">${title}</p><p class="text-xs text-text-secondary">${b.startTime || ''} – ${b.endTime || ''}</p></div>
      </div>
      ${statusBadge(b.status || 'Pending')}
    </div>`;
  }).join('');
  openModal(`<div class="p-6 max-w-lg">
    <div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold">Bookings on ${dateStr}</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    ${html || '<p class="text-text-secondary text-center py-6">No bookings on this day.</p>'}
  </div>`);
}
