// Client Portal Page — live client data from the existing APIs
let _cpData = null;          // { clients, svcBookings, stBookings, payments }
let _cpClientId = null;      // selected customer id
let _cpDemoMode = false;     // true when the backend is unreachable (MOCK fallback)
let _cpRating = 0;           // feedback star selection

const _CP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function _cpFmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return 'TBD';
  return _CP_MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear();
}
function _cpTodayStr() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
function _cpDateKey(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function _cpInitials(name) {
  return (name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function _cpAvatarHtml(client, size = 'w-20 h-20') {
  if (client.avatar) {
    return `<img src="${client.avatar}" class="${size} rounded-full ring-4 ring-accent/40 object-cover" alt="${client.name}" />`;
  }
  return `<div class="${size} rounded-full ring-4 ring-accent/40 flex items-center justify-center" style="background:#F4E8C1;color:#8a6d1f"><span class="text-xl font-bold">${_cpInitials(client.name)}</span></div>`;
}

async function renderClientPortal() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div id="cp-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="cp-content" class="hidden"></div>`;
  await loadPortalData();
}

async function loadPortalData() {
  const content = document.getElementById('cp-content');
  try {
    const [custRes, svcRes, stbRes, payRes] = await Promise.all([
      api.getCustomers(), api.getServiceBookings(), api.getStudioBookings(), api.getPayments(),
    ]);
    _cpData = {
      clients: custRes.data || [],
      svcBookings: svcRes.data || [],
      stBookings: stbRes.data || [],
      payments: payRes.data || [],
    };
    // Default to the customer matching the logged-in user, else the first client
    const me = api.getUser();
    const match = me && me.email
      ? _cpData.clients.find(c => (c.email || '').toLowerCase() === String(me.email).toLowerCase())
      : null;
    _cpClientId = (match || _cpData.clients[0] || {})._id || null;
    _cpDemoMode = false;
  } catch (err) {
    // Backend unreachable: demo snapshot from the mock data
    const c = (typeof MOCK !== 'undefined' ? MOCK.clients[0] : null) || { id: 'demo', name: 'Demo Client', email: 'demo@photopro.ai' };
    _cpData = {
      demoClient: c,
      clients: [c],
      svcBookings: [],
      stBookings: [],
      payments: [],
      demoBookings: (typeof MOCK !== 'undefined' ? MOCK.bookings : []).filter(b => b.clientId === c.id),
      demoInvoices: (typeof MOCK !== 'undefined' ? MOCK.invoices : []).filter(i => i.client === c.name),
      demoGallery: (typeof MOCK !== 'undefined' ? MOCK.gallery : []).slice(0, 4),
    };
    _cpClientId = c.id;
    _cpDemoMode = true;
  }
  if (!document.getElementById('cp-loading')) return; // user navigated away
  document.getElementById('cp-loading').classList.add('hidden');
  content.classList.remove('hidden');
  renderPortal();
}

function _cpSelectedClient() {
  return (_cpData.clients || []).find(c => String(c._id || c.id) === String(_cpClientId)) || _cpData.clients[0] || { name: 'Client' };
}

function _cpClientBookings(client) {
  const cid = String(client._id || client.id);
  if (_cpDemoMode) {
    return (_cpData.demoBookings || []).map(b => ({
      name: b.event + ' Photography', dateStr: b.date, startTime: b.start || '', status: b.status,
    }));
  }
  const svc = (_cpData.svcBookings || [])
    .filter(b => b.customerId && String(b.customerId._id || b.customerId) === cid)
    .map(b => ({
      name: b.event + (b.packageId && b.packageId.name ? ' — ' + b.packageId.name : ''),
      dateStr: _cpFmtDate(b.date), startTime: b.startTime || '', status: b.status,
    }));
  const stb = (_cpData.stBookings || [])
    .filter(b => b.customerId && String(b.customerId._id || b.customerId) === cid)
    .map(b => ({
      name: (b.studioId && b.studioId.name ? b.studioId.name : 'Studio') + ' — ' + b.purpose,
      dateStr: _cpFmtDate(b.date), startTime: b.startTime || '', status: b.status,
    }));
  const today = _cpTodayStr();
  return svc.concat(stb).sort((a, b) => {
    const ka = _cpDateKey(a.dateStr), kb = _cpDateKey(b.dateStr);
    const aUp = ka && ka >= today, bUp = kb && kb >= today;
    if (aUp && !bUp) return -1;
    if (!aUp && bUp) return 1;
    return aUp ? ka.localeCompare(kb) : kb.localeCompare(ka);
  });
}

function _cpClientPayments(client) {
  if (_cpDemoMode) {
    return (_cpData.demoInvoices || []).map(i => ({
      ref: i.id, amount: i.amount, status: i.status, method: '—', dateStr: 'Due: ' + i.due,
    }));
  }
  const cid = String(client._id || client.id);
  return (_cpData.payments || [])
    .filter(p => p.customerId && String(p.customerId._id || p.customerId) === cid)
    .map(p => ({
      ref: p.referenceId || p.transactionRef || 'Payment',
      amount: p.amount, status: p.status, method: p.method,
      dateStr: p.createdAt ? _cpFmtDate(p.createdAt) : '',
    }));
}

function _cpClientPackages(client) {
  if (_cpDemoMode) return [];
  const cid = String(client._id || client.id);
  const seen = new Set();
  const out = [];
  (_cpData.svcBookings || []).forEach(b => {
    if (!b.customerId || String(b.customerId._id || b.customerId) !== cid) return;
    if (!b.packageId || !b.packageId.name || seen.has(b.packageId.name)) return;
    seen.add(b.packageId.name);
    out.push({ name: b.packageId.name, price: b.packageId.price, status: b.status });
  });
  return out;
}

function renderPortal() {
  const content = document.getElementById('cp-content');
  if (!content || !_cpData) return;
  const client = _cpSelectedClient();
  const bookings = _cpClientBookings(client);
  const payments = _cpClientPayments(client);
  const packages = _cpClientPackages(client);
  const gallery = _cpData.demoGallery || [];

  const today = _cpTodayStr();
  const upcoming = bookings.filter(b => { const k = _cpDateKey(b.dateStr); return k && k >= today && ['Pending', 'Confirmed'].includes(b.status); }).length;
  const completed = bookings.filter(b => b.status === 'Completed').length;
  const invested = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + (Number(p.amount) || 0), 0);

  content.innerHTML = `
    ${_cpDemoMode
      ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to see the live client portal.</span></div>`
      : ''}
    <div class="bg-gradient-to-r from-primary via-gray-800 to-primary rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
      <div class="relative z-10 flex flex-col sm:flex-row items-center gap-6">
        ${_cpAvatarHtml(client)}
        <div class="text-center sm:text-left">
          <h1 class="text-2xl lg:text-3xl font-bold">Welcome back, ${String(client.name || '').split(' ')[0]}!</h1>
          <p class="text-white/70 mt-1">${client.email || ''}${_cpData.clients.length > 1 ? ` · Client since ${client.createdAt ? _cpFmtDate(client.createdAt) : '—'}` : ''}</p>
        </div>
        <div class="sm:ml-auto flex gap-3 flex-wrap justify-center">
          ${_cpData.clients.length > 1 ? `
          <select onchange="onPortalClientChange(this.value)" class="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-4 py-2.5 outline-none">
            ${_cpData.clients.map(c => `<option value="${c._id}" ${String(c._id) === String(_cpClientId) ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>` : ''}
          <button onclick="openContactPhotographerModal()" class="bg-accent text-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent-dark transition">Contact Photographer</button>
        </div>
      </div>
    </div>
    <!-- Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${bookings.length}</p><p class="text-sm text-text-secondary">Total Bookings</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${upcoming}</p><p class="text-sm text-text-secondary">Upcoming</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${formatCurrency(invested)}</p><p class="text-sm text-text-secondary">Total Invested</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${completed}</p><p class="text-sm text-text-secondary">Sessions Completed</p></div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Bookings -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-4">Your Bookings</h3>
        <div class="space-y-3">
          ${bookings.length ? bookings.slice(0, 6).map(b => `
          <div class="flex items-center gap-4 p-4 rounded-xl border border-border-light hover:border-accent/30 transition">
            <div class="w-12 h-12 rounded-xl ${b.status === 'Completed' ? 'bg-green-50' : 'bg-accent/10'} flex items-center justify-center flex-shrink-0"><i data-lucide="camera" class="w-5 h-5 ${b.status === 'Completed' ? 'text-green-600' : 'text-accent'}"></i></div>
            <div class="flex-1 min-w-0"><p class="font-semibold text-sm">${b.name}</p><p class="text-xs text-text-secondary">${b.dateStr}${b.startTime ? ' · ' + b.startTime : ''}</p></div>
            ${statusBadge(b.status)}
          </div>`).join('')
          : `<p class="text-sm text-text-secondary py-6 text-center">No bookings yet — booked sessions will appear here.</p>`}
        </div>
      </div>
      <!-- Invoices & Payments -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-4">Invoices & Payments</h3>
        <div class="space-y-3">
          ${payments.length ? payments.slice(0, 6).map(p => `
          <div class="flex items-center gap-4 p-4 rounded-xl border border-border-light">
            <div class="w-12 h-12 rounded-xl ${p.status === 'Completed' || p.status === 'Paid' ? 'bg-green-50' : 'bg-amber-50'} flex items-center justify-center flex-shrink-0"><i data-lucide="receipt" class="w-5 h-5 ${p.status === 'Completed' || p.status === 'Paid' ? 'text-green-600' : 'text-amber-600'}"></i></div>
            <div class="flex-1"><p class="font-semibold text-sm">${p.ref}</p><p class="text-xs text-text-secondary">${p.method}${p.dateStr ? ' · ' + p.dateStr : ''}</p></div>
            <div class="text-right"><p class="font-bold text-sm">${formatCurrency(p.amount)}</p>${statusBadge(p.status)}</div>
          </div>`).join('')
          : `<p class="text-sm text-text-secondary py-6 text-center">No payments recorded yet.</p>`}
        </div>
      </div>
    </div>
    ${packages.length ? `
    <!-- Packages -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light mb-6">
      <h3 class="font-bold text-lg mb-4">Your Packages</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${packages.map(pk => `
        <div class="p-4 rounded-xl border border-border-light flex items-center justify-between">
          <div><p class="font-semibold text-sm">${pk.name}</p><p class="text-xs text-text-secondary mt-0.5">Package</p></div>
          <div class="text-right"><p class="font-bold text-sm">${pk.price ? formatCurrency(pk.price) : '—'}</p>${statusBadge(pk.status)}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
    ${gallery.length ? `
    <!-- Gallery (demo mode only — no photo storage backend yet) -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light mb-6">
      <div class="flex items-center justify-between mb-5"><h3 class="font-bold text-lg">Your Photo Galleries</h3></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        ${gallery.map(g => `
        <div class="rounded-xl overflow-hidden group relative">
          <img src="${g.src}" class="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
            <div><p class="text-white font-semibold text-sm">${g.title}</p><p class="text-white/70 text-xs">${g.date}</p></div>
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}
    <!-- Feedback -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold text-lg mb-4">Leave Feedback</h3>
      <div class="space-y-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Rating</label>
          <div class="flex gap-1" id="cp-stars">
            ${[1, 2, 3, 4, 5].map(s => `<button type="button" onclick="_cpSetRating(${s})" class="p-1 hover:scale-110 transition"><i data-lucide="star" class="w-6 h-6 ${s <= _cpRating ? 'text-accent fill-accent' : 'text-border-light'}"></i></button>`).join('')}
          </div>
        </div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Your feedback</label><textarea id="cp-feedback" rows="4" class="w-full px-4 py-3 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" placeholder="Tell us about your experience..."></textarea></div>
        <button onclick="submitPortalFeedback()" class="btn-gold px-6 py-2.5 text-sm">Submit Feedback</button>
      </div>
    </div>`;
  lucide.createIcons();
}

function onPortalClientChange(id) {
  _cpClientId = id;
  _cpRating = 0;
  renderPortal();
}

function _cpSetRating(stars) {
  _cpRating = stars;
  renderPortal();
  const box = document.getElementById('cp-stars');
  if (box) {
    box.querySelectorAll('svg,i').forEach((ic, i) => {
      ic.className = 'w-6 h-6 ' + (i + 1 <= _cpRating ? 'text-accent fill-accent' : 'text-border-light');
    });
  }
}

// ── Contact Photographer: message lands in the Notifications feed ──
function openContactPhotographerModal() {
  const client = _cpSelectedClient();
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Contact Photographer</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form onsubmit="sendPortalMessage(event)" class="space-y-4">
      <div><label class="block text-sm font-medium text-text-secondary mb-1">From</label><input value="${client.name} (${client.email || '—'})" readonly class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-surface text-text-secondary outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Subject *</label><input id="cp-msg-subject" type="text" required maxlength="100" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="How can we help?" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Message *</label><textarea id="cp-msg-body" rows="4" required maxlength="400" class="w-full px-4 py-3 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" placeholder="Write your message..."></textarea></div>
      <div id="cp-msg-error" class="hidden text-sm text-error"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-gold px-6 py-2.5 text-sm">Send Message</button>
        <button type="button" onclick="closeModal()" class="btn-ghost px-6 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`, 'max-w-md');
}

async function sendPortalMessage(e) {
  e.preventDefault();
  const client = _cpSelectedClient();
  const subject = (document.getElementById('cp-msg-subject').value || '').trim();
  const body = (document.getElementById('cp-msg-body').value || '').trim();
  if (_cpDemoMode) {
    closeModal();
    showToast('Message sent (demo mode)');
    return;
  }
  try {
    await api.createNotification({
      type: 'client',
      title: 'Client message received',
      message: `${client.name}: ${subject} — ${body}`,
    });
    closeModal();
    if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
    showToast('Message sent to the studio!');
  } catch (err) {
    const errEl = document.getElementById('cp-msg-error');
    if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
  }
}

// ── Feedback: rating + comment lands in the Notifications feed ──
async function submitPortalFeedback() {
  const client = _cpSelectedClient();
  const text = (document.getElementById('cp-feedback').value || '').trim();
  if (!_cpRating) { showToast('Please choose a star rating first.', 'alert-circle'); return; }
  if (_cpDemoMode) {
    _cpRating = 0;
    document.getElementById('cp-feedback').value = '';
    renderPortal();
    showToast('Thank you for your feedback!');
    return;
  }
  try {
    await api.createNotification({
      type: 'client',
      title: 'Client feedback received',
      message: `${client.name} rated ${_cpRating}/5${text ? ' — ' + text : ''}`,
    });
    _cpRating = 0;
    document.getElementById('cp-feedback').value = '';
    renderPortal();
    if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
    showToast('Thank you for your feedback!');
  } catch (err) {
    showToast(err.message, 'alert-circle');
  }
}
