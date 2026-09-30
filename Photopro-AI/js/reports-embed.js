// ── Reports & Analytics (embedded) ─────────────────────────────────────────
// Replaces the separate Reports & Analytics page: a live report section is
// auto-mounted at the bottom of every data page (KPIs + chart + PDF/CSV
// download), fed from that page's own module API. One shared component for
// all modules; the section only appears on pages listed in REGISTRY below.
(function () {
  'use strict';

  const GOLD = '#D4AF37';
  const PALETTE = ['#D4AF37', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

  // ── small helpers ──
  const kpi = (label, value, icon) => ({ label, value, icon });
  const doughnut = (label, labels, data) => ({ type: 'doughnut', label, labels, data });
  const bar = (label, labels, data) => ({ type: 'bar', label, labels, data });

  function todayStr() {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function fmtMoney(n) { return 'Rs. ' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  // matches on status OR availability so it works for equipment/studios too
  function byStatus(list, status) { return list.filter(x => (x.status || x.availability || '') === status).length; }
  function sumBy(list, fn) { return list.reduce((s, x) => s + (Number(fn(x)) || 0), 0); }
  function countBy(list, fn) { const m = {}; list.forEach(x => { const k = fn(x) || 'Other'; m[k] = (m[k] || 0) + 1; }); return m; }
  function dstr(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function _name(list, id) {
    if (!id) return '—';
    const x = (list || []).find(i => String(i._id) === String(id));
    return x ? x.name : '—';
  }
  async function fetchLists() {
    const results = await Promise.all(Array.prototype.slice.call(arguments).map(p => api.get(p)));
    return results.map(r => (r && r.data) || []);
  }

  // ── page registry: one config per data page ──
  const REGISTRY = {

    // Member 1 — Clients & Users
    clients: {
      title: 'Clients',
      fetch: () => fetchLists('/customers').then(([customers]) => customers),
      compute(list) {
        const active = byStatus(list, 'Active');
        return {
          kpis: [
            kpi('Total Clients', String(list.length), 'users'),
            kpi('Active Clients', String(active), 'user-check'),
            kpi('Total Bookings', String(sumBy(list, c => c.bookings)), 'calendar-days'),
            kpi('Lifetime Value', fmtMoney(sumBy(list, c => c.spent)), 'wallet'),
          ],
          chart: doughnut('Clients by status', ['Active', 'Inactive'], [active, list.length - active]),
          table: { head: ['Client', 'Email', 'Status', 'Bookings', 'Spent'], rows: list.slice().sort((a, b) => (b.spent || 0) - (a.spent || 0)).slice(0, 8).map(c => [c.name, c.email || '—', c.status || '—', String(c.bookings || 0), fmtMoney(c.spent)]) },
        };
      },
    },
    users: {
      title: 'Users',
      fetch: () => fetchLists('/users').then(([users]) => users),
      compute(list) {
        const roles = countBy(list, u => u.role);
        const counts = ['Admin', 'Staff', 'Customer'].map(r => roles[r] || 0);
        return {
          kpis: [
            kpi('Total Users', String(list.length), 'users'),
            kpi('Admins', String(counts[0]), 'shield'),
            kpi('Staff', String(counts[1]), 'id-card'),
            kpi('Customers', String(counts[2]), 'user'),
          ],
          chart: doughnut('Users by role', ['Admin', 'Staff', 'Customer'], counts),
          table: { head: ['Name', 'Role', 'Email', 'Active'], rows: list.slice(0, 8).map(u => [u.name, u.role || '—', u.email || '—', u.isActive === false ? 'No' : 'Yes']) },
        };
      },
    },

    // Member 2 — Equipment & Rentals
    equipment: {
      title: 'Equipment',
      fetch: () => fetchLists('/equipment').then(([eq]) => eq),
      compute(list) {
        const avail = byStatus(list, 'Available'), rented = byStatus(list, 'Rented'), maint = byStatus(list, 'Under Maintenance');
        const value = sumBy(list, e => (e.purchasePrice != null && e.purchasePrice !== '') ? e.purchasePrice : e.pricePerDay);
        return {
          kpis: [
            kpi('Total Items', String(list.length), 'camera'),
            kpi('Available', String(avail), 'check-circle'),
            kpi('Rented / Maintenance', String(rented + maint), 'wrench'),
            kpi('Fleet Value', fmtMoney(value), 'banknote'),
          ],
          chart: doughnut('Equipment availability', ['Available', 'Rented', 'Under Maintenance'], [avail, rented, maint]),
          table: { head: ['Equipment', 'Category', 'Condition', 'Per Day', 'Availability'], rows: list.slice(0, 8).map(e => [e.name, e.category || '—', e.condition || '—', fmtMoney(e.pricePerDay), e.availability || '—']) },
        };
      },
    },
    rentals: {
      title: 'Rentals',
      fetch: () => fetchLists('/rentals', '/customers', '/equipment').then(([rentals, customers, equipment]) => ({ rentals, customers, equipment })),
      compute(d) {
        const list = d.rentals;
        const cname = id => _name(d.customers, id);
        const ename = id => _name(d.equipment, id);
        return {
          kpis: [
            kpi('Total Rentals', String(list.length), 'package'),
            kpi('Active', String(byStatus(list, 'Active')), 'play'),
            kpi('Overdue', String(byStatus(list, 'Overdue')), 'alarm-clock'),
            kpi('Revenue', fmtMoney(sumBy(list, r => r.totalCost)), 'banknote'),
          ],
          chart: doughnut('Rentals by status', ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'], ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Customer', 'Equipment', 'Start', 'End', 'Cost', 'Status'], rows: list.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 8).map(r => [cname(r.customerId), ename(r.equipmentId), dstr(r.startDate), dstr(r.endDate), fmtMoney(r.totalCost), r.status || '—']) },
        };
      },
    },

    // Member 3 — Packages, Photographers (team) & Service Bookings (bookings)
    packages: {
      title: 'Packages',
      fetch: () => fetchLists('/packages').then(([pk]) => pk),
      compute(list) {
        const prices = list.map(p => Number(p.price) || 0);
        const active = list.filter(p => p.isActive !== false).length;
        const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        return {
          kpis: [
            kpi('Total Packages', String(list.length), 'package'),
            kpi('Active', String(active), 'check-circle'),
            kpi('Average Price', fmtMoney(avg), 'tag'),
            kpi('Top Price', fmtMoney(prices.length ? Math.max.apply(null, prices) : 0), 'trending-up'),
          ],
          chart: bar('Package price (Rs.)', list.slice(0, 8).map(p => p.name), prices.slice(0, 8)),
          table: { head: ['Package', 'Price', 'Status'], rows: list.slice(0, 8).map(p => [p.name, fmtMoney(p.price), p.isActive !== false ? 'Active' : 'Inactive']) },
        };
      },
    },
    team: {
      title: 'Photographers',
      fetch: () => fetchLists('/photographers').then(([ph]) => ph),
      compute(list) {
        const ratings = list.map(p => Number(p.rating) || 0);
        const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0';
        const top = list.slice().sort((a, b) => (b.projects || 0) - (a.projects || 0)).slice(0, 8);
        return {
          kpis: [
            kpi('Photographers', String(list.length), 'camera'),
            kpi('Active', String(byStatus(list, 'Active')), 'check-circle'),
            kpi('Avg Rating', avgRating + ' / 5', 'star'),
            kpi('Total Projects', String(sumBy(list, p => p.projects)), 'images'),
          ],
          chart: bar('Projects by photographer', top.map(p => p.name), top.map(p => Number(p.projects) || 0)),
          table: { head: ['Name', 'Specialization', 'Rating', 'Projects'], rows: top.map(p => [p.name, p.specialization || '—', (Number(p.rating) || 0) + '/5', String(p.projects || 0)]) },
        };
      },
    },
    bookings: {
      title: 'Service Bookings',
      fetch: () => fetchLists('/service-bookings', '/customers').then(([bookings, customers]) => ({ bookings, customers })),
      compute(d) {
        const list = d.bookings;
        const done = byStatus(list, 'Completed');
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.amount);
        return {
          kpis: [
            kpi('Total Bookings', String(list.length), 'calendar-check'),
            kpi('Pending / Confirmed', String(byStatus(list, 'Pending') + byStatus(list, 'Confirmed')), 'clock'),
            kpi('Completed', String(done), 'check-circle'),
            kpi('Revenue', fmtMoney(rev), 'banknote'),
          ],
          chart: doughnut('Bookings by status', ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Client', 'Event', 'Date', 'Amount', 'Status'], rows: list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(b => [_name(d.customers, b.customerId), b.event || '—', dstr(b.date), fmtMoney(b.amount), b.status || '—']) },
        };
      },
    },

    // Member 4 — Payments & Invoices / Deposits
    invoices: {
      title: 'Payments & Invoices',
      fetch: () => fetchLists('/payments', '/customers').then(([payments, customers]) => ({ payments, customers })),
      compute(d) {
        const list = d.payments;
        const completed = list.filter(p => p.status === 'Completed');
        const revenue = sumBy(completed, p => p.amount);
        const pending = sumBy(list.filter(p => p.status === 'Pending'), p => p.amount);
        const failed = byStatus(list, 'Failed') + byStatus(list, 'Refunded');
        const byMethod = {};
        completed.forEach(p => { const k = p.method || 'Other'; byMethod[k] = (byMethod[k] || 0) + (Number(p.amount) || 0); });
        const methods = Object.keys(byMethod);
        return {
          kpis: [
            kpi('Transactions', String(list.length), 'receipt'),
            kpi('Completed Revenue', fmtMoney(revenue), 'banknote'),
            kpi('Pending Amount', fmtMoney(pending), 'clock'),
            kpi('Failed / Refunded', String(failed), 'alert-triangle'),
          ],
          chart: bar('Completed revenue by method (Rs.)', methods, methods.map(m => byMethod[m])),
          table: { head: ['Client', 'Amount', 'Method', 'Status', 'Date'], rows: list.slice().sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 8).map(p => [_name(d.customers, p.customerId), fmtMoney(p.amount), p.method || '—', p.status || '—', dstr(p.date)]) },
        };
      },
    },
    deposits: {
      title: 'Deposits',
      fetch: () => fetchLists('/deposits', '/customers').then(([deposits, customers]) => ({ deposits, customers })),
      compute(d) {
        const list = d.deposits;
        const held = sumBy(list.filter(x => x.status === 'Held'), x => x.amount);
        const refunded = sumBy(list.filter(x => x.status === 'Refunded'), x => (x.refundAmount != null && x.refundAmount !== '') ? x.refundAmount : x.amount);
        const forfeited = sumBy(list.filter(x => x.status === 'Forfeited'), x => x.amount);
        return {
          kpis: [
            kpi('Total Deposits', String(list.length), 'shield'),
            kpi('Held Amount', fmtMoney(held), 'lock'),
            kpi('Refunded', fmtMoney(refunded), 'undo-2'),
            kpi('Forfeited', fmtMoney(forfeited), 'alert-triangle'),
          ],
          chart: doughnut('Deposits by status', ['Held', 'Refunded', 'Forfeited'], [byStatus(list, 'Held'), byStatus(list, 'Refunded'), byStatus(list, 'Forfeited')]),
          table: { head: ['Client', 'Purpose', 'Amount', 'Method', 'Status'], rows: list.slice(-8).reverse().map(x => [_name(d.customers, x.customerId), x.purpose || '—', fmtMoney(x.amount), x.paymentMethod || '—', x.status || '—']) },
        };
      },
    },

    // Member 5 — Studios & Studio Bookings
    studios: {
      title: 'Studios',
      fetch: () => fetchLists('/studios').then(([st]) => st),
      compute(list) {
        const avail = byStatus(list, 'Available'), booked = byStatus(list, 'Booked'), maint = byStatus(list, 'Under Maintenance');
        const rates = list.map(s => Number(s.pricePerHour) || 0);
        const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        return {
          kpis: [
            kpi('Total Studios', String(list.length), 'building'),
            kpi('Available', String(avail), 'check-circle'),
            kpi('Booked / Maintenance', String(booked + maint), 'clock'),
            kpi('Avg Hourly Rate', fmtMoney(avgRate), 'banknote'),
          ],
          chart: doughnut('Studio availability', ['Available', 'Booked', 'Under Maintenance'], [avail, booked, maint]),
          table: { head: ['Studio', 'Location', 'Capacity', 'Per Hour', 'Availability'], rows: list.slice(0, 8).map(s => [s.name, s.location || '—', String(s.capacity || 0), fmtMoney(s.pricePerHour), s.availability || '—']) },
        };
      },
    },
    'studio-bookings': {
      title: 'Studio Bookings',
      fetch: () => fetchLists('/studio-bookings', '/studios', '/customers').then(([bookings, studios, customers]) => ({ bookings, studios, customers })),
      compute(d) {
        const list = d.bookings;
        const rev = sumBy(list.filter(b => b.status !== 'Cancelled'), b => b.totalCost);
        return {
          kpis: [
            kpi('Total Bookings', String(list.length), 'calendar-check'),
            kpi('Pending / Confirmed', String(byStatus(list, 'Pending') + byStatus(list, 'Confirmed')), 'clock'),
            kpi('Completed', String(byStatus(list, 'Completed')), 'check-circle'),
            kpi('Revenue', fmtMoney(rev), 'banknote'),
          ],
          chart: doughnut('Bookings by status', ['Pending', 'Confirmed', 'Completed', 'Cancelled'], ['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => byStatus(list, s))),
          table: { head: ['Studio', 'Client', 'Date', 'Cost', 'Status'], rows: list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(b => [_name(d.studios, b.studioId), _name(d.customers, b.customerId), dstr(b.date), fmtMoney(b.totalCost), b.status || '—']) },
        };
      },
    },
  };

  // ── state ──
  const cache = {};    // page -> { at, data } (60s TTL so in-page re-renders don't refetch)
  const lastData = {}; // page -> last computed data (used by PDF/CSV export)
  let _deb = null;

  function isDemo() {
    try {
      const t = api && api.getToken && api.getToken();
      return !t || (typeof t === 'string' && t.indexOf('.demo') !== -1);
    } catch (e) { return true; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _toast(msg) {
    try {
      if (typeof showToast === 'function') showToast(msg);
      else if (typeof toast === 'function') toast(msg);
    } catch (e) { /* no-op */ }
  }

  // ── rendering ──
  function sectionShell(page, cfg) {
    const host = document.createElement('div');
    host.id = 'page-reports';
    host.className = 'mt-10';
    host.innerHTML =
      '<div class="flex items-end justify-between flex-wrap gap-3 mb-4">' +
        '<div>' +
          '<h2 class="text-xl font-bold text-gray-900 flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-5 h-5" style="color:#B8960F"></i>Reports &amp; Analytics</h2>' +
          '<p class="text-xs text-gray-400 mt-1">' + esc(cfg.title) + ' · live module report · ' + todayStr() + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<button onclick="PageReports.exportPDF(\'' + page + '\')" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i>Download PDF</button>' +
          '<button onclick="PageReports.exportCSV(\'' + page + '\')" class="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i>CSV</button>' +
        '</div>' +
      '</div>' +
      '<div id="page-reports-body" class="text-sm text-gray-400">Loading module data…</div>';
    return host;
  }

  function kpiCard(k) {
    return '<div class="kpi-card flex items-center gap-3">' +
      '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#FBF6E3"><i data-lucide="' + k.icon + '" class="w-5 h-5" style="color:#B8960F"></i></div>' +
      '<div class="min-w-0"><p class="text-xs text-gray-400">' + esc(k.label) + '</p><p class="text-lg font-bold text-gray-900 truncate">' + esc(k.value) + '</p></div>' +
    '</div>';
  }

  function chartConfig(data) {
    const c = data.chart;
    if (c.type === 'doughnut') {
      return { type: 'doughnut', data: { labels: c.labels, datasets: [{ data: c.data, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#ffffff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '58%' } };
    }
    return { type: 'bar', data: { labels: c.labels, datasets: [{ label: c.label, data: c.data, backgroundColor: GOLD, borderRadius: 6, maxBarThickness: 42 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 40, minRotation: 0 } } } } };
  }

  function drawChart(data) {
    if (typeof createChart !== 'function' || typeof Chart === 'undefined') return;
    try { if (typeof chartInstances !== 'undefined' && chartInstances['page-reports-chart']) chartInstances['page-reports-chart'].destroy(); } catch (e) { /* ignore */ }
    createChart('page-reports-chart', chartConfig(data));
  }

  function renderBody(page, cfg, data) {
    const body = document.getElementById('page-reports-body');
    if (!body) return;
    let tableHtml = '';
    if (data.table && data.table.rows.length) {
      tableHtml = '<p class="text-sm font-semibold text-gray-700 mb-3">Top entries</p><div class="overflow-x-auto"><table class="w-full text-xs text-left">' +
        '<thead><tr class="text-gray-400 border-b border-gray-100">' + data.table.head.map(h => '<th class="py-2 pr-3 font-medium">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
        data.table.rows.map(r => '<tr class="border-b border-gray-50">' + r.map(v => '<td class="py-2 pr-3 text-gray-600">' + esc(v) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>';
    }
    body.innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">' + data.kpis.map(kpiCard).join('') + '</div>' +
      '<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">' +
        '<div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"><p class="text-sm font-semibold text-gray-700 mb-3">' + esc(data.chart.label) + '</p><canvas id="page-reports-chart" height="150"></canvas></div>' +
        '<div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">' + (tableHtml || '<p class="text-xs text-gray-400">No rows to display.</p>') + '</div>' +
      '</div>';
    try { drawChart(data); } catch (e) { /* ignore */ }
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function renderNotice(kind, message, page) {
    const body = document.getElementById('page-reports-body');
    if (!body) return;
    const color = kind === 'demo' ? '#B45309' : '#B91C1C';
    const bg = kind === 'demo' ? '#FFFBEB' : '#FEF2F2';
    body.innerHTML = '<div class="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style="background:' + bg + ';border:1px solid ' + color + '22">' +
      '<span class="text-sm" style="color:' + color + '">' + esc(message) + '</span>' +
      (kind === 'error' ? '<button onclick="PageReports.retry(\'' + page + '\')" class="text-xs font-semibold underline">Retry</button>' : '') +
    '</div>';
  }

  // ── data loading ──
  async function load(page) {
    const cfg = REGISTRY[page];
    if (!cfg || !document.getElementById('page-reports')) return;
    if (isDemo()) { renderNotice('demo', 'Demo mode — sign in with a real account to see live analytics.', page); return; }
    const cached = cache[page];
    if (cached && Date.now() - cached.at < 60000) {
      lastData[page] = cached.data;
      renderBody(page, cfg, cached.data);
      return;
    }
    const body = document.getElementById('page-reports-body');
    if (body) body.textContent = 'Loading module data…';
    try {
      const fetched = await cfg.fetch();
      if (!document.getElementById('page-reports')) return; // navigated away meanwhile
      const data = cfg.compute(fetched);
      cache[page] = { at: Date.now(), data };
      lastData[page] = data;
      renderBody(page, cfg, data);
    } catch (err) {
      if (!document.getElementById('page-reports')) return;
      renderNotice('error', 'Could not load live report data' + (err && err.message ? ': ' + err.message : '.'), page);
    }
  }

  function mount(page) {
    const cfg = REGISTRY[page];
    const content = document.getElementById('page-content');
    if (!cfg || !content || document.getElementById('page-reports')) return;
    content.appendChild(sectionShell(page, cfg));
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    load(page);
  }

  // ── auto-mount: fires whenever a page renders into #page-content ──
  function tick() {
    let page = null;
    try { page = (typeof currentPage !== 'undefined') ? currentPage : null; } catch (e) { page = null; }
    const existing = document.getElementById('page-reports');
    if (page && REGISTRY[page]) {
      if (!existing) mount(page);
    } else if (existing) {
      existing.remove();
    }
  }
  function schedule() { clearTimeout(_deb); _deb = setTimeout(tick, 350); }

  function boot() {
    const content = document.getElementById('page-content');
    if (!content || typeof MutationObserver === 'undefined') return;
    new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ── exports ──
  function fileName(cfg, ext) {
    return 'PhotoPro-' + cfg.title.replace(/&/g, 'and').replace(/[^A-Za-z0-9]+/g, '-') + '-Report_' + todayStr() + '.' + ext;
  }

  function exportPDF(page) {
    const cfg = REGISTRY[page], data = lastData[page];
    if (!cfg || !data) { _toast('Open the report section and let it load first.'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { _toast('PDF library is still loading — try again in a moment.'); return; }
    try {
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const M = 15;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 17, 17);
      doc.text(cfg.title + ' — Reports & Analytics', M, 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
      doc.text('PhotoPro AI Studio · generated ' + new Date().toLocaleString(), M, 25);
      let y = 34;
      doc.setFontSize(11);
      data.kpis.forEach(k => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
        doc.text(String(k.label) + ':', M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(k.value), M + 55, y);
        y += 7;
      });
      const cv = document.getElementById('page-reports-chart');
      if (cv && cv.toDataURL) {
        try { doc.addImage(cv.toDataURL('image/png', 1), 'PNG', M, y + 2, 180, 70); y += 76; } catch (e) { /* ignore */ }
      }
      if (data.table && data.table.rows.length && typeof doc.autoTable === 'function') {
        doc.autoTable({ startY: y + 4, head: [data.table.head], body: data.table.rows, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.6 }, headStyles: { fillColor: [212, 175, 55], textColor: 20 } });
      }
      doc.setFontSize(8); doc.setTextColor(160, 160, 160);
      doc.text('Auto-generated by PhotoPro AI · ' + cfg.title + ' module', M, 288);
      doc.save(fileName(cfg, 'pdf'));
    } catch (e) { _toast('PDF export failed: ' + (e && e.message ? e.message : e)); }
  }

  function exportCSV(page) {
    const cfg = REGISTRY[page], data = lastData[page];
    if (!cfg || !data) { _toast('Open the report section and let it load first.'); return; }
    const rows = [];
    rows.push(['PhotoPro AI - ' + cfg.title + ' report']);
    rows.push(['Generated', new Date().toLocaleString()]);
    rows.push([]);
    (data.kpis || []).forEach(k => rows.push(['KPI', k.label, String(k.value)]));
    rows.push([]);
    if (data.chart) {
      rows.push(['Chart', data.chart.label]);
      (data.chart.labels || []).forEach((l, i) => rows.push([String(l), String((data.chart.data || [])[i])]));
      rows.push([]);
    }
    if (data.table && data.table.rows.length) {
      rows.push(data.table.head);
      data.table.rows.forEach(r => rows.push(r));
    }
    const csv = rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(cfg, 'csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    _toast('CSV downloaded.');
  }

  function retry(page) {
    delete cache[page];
    if (!document.getElementById('page-reports')) return;
    const body = document.getElementById('page-reports-body');
    if (body) body.textContent = 'Loading module data…';
    load(page);
  }

  window.PageReports = { retry: retry, exportPDF: exportPDF, exportCSV: exportCSV };
})();
