// Reports & Analytics Page – live aggregation from backend APIs
// (payments, service bookings, studio bookings, customers, packages, photographers)
let _repRange = 'month';      // 'week' | 'month' | 'year' | 'all'
let _repDemoMode = false;     // true when showing mock fallback data (backend unreachable)
let _repData = null;          // last fetched dataset (range changes re-render instantly from this)
let _repState = null;         // last computed report (used by the CSV export)
const _REP_CHART_IDS = ['revenueBarChart', 'bookingGrowthChart', 'servicesChart'];

// ── Local-date helpers (timezone-safe, avoids UTC shift of toISOString) ──
function _repKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _repTodayStr() { return _repKey(new Date()); }

// '2026-08-15' / '2026-08-15T00:00:00.000Z' -> '2026-08-15'
function _repDateKey(v) { return (v || '').toString().split('T')[0]; }

// '2026-08-15' -> 'Aug 15, 2026'
function _repFmtDate(v) {
  const s = _repDateKey(v);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return s || '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Percentage change between previous and current values ('' when not computable)
function _repTrend(current, previous) {
  if (!previous || previous <= 0) return '';
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

// Is a yyyy-mm-dd key inside [start, end]? start=null means "from the beginning"
function _repIn(dateKey, start, end) {
  if (!dateKey) return false;
  if (start && dateKey < start) return false;
  return dateKey <= end;
}

// Selected range window + the previous equal-length window (for KPI trends)
function _repRangeMeta(range) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = null;
  if (range === 'week') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  else if (range === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (range === 'year') start = new Date(now.getFullYear(), 0, 1);
  const labels = { week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' };
  let prevStart = null, prevEnd = null;
  if (start) {
    const days = Math.round((end - start) / 86400000) + 1;
    prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));
  }
  return {
    label: labels[range] || labels.month,
    start: start ? _repKey(start) : null,
    end: _repKey(end),
    prevStart: prevStart ? _repKey(prevStart) : null,
    prevEnd: prevEnd ? _repKey(prevEnd) : null,
  };
}

// Chart buckets for the selected range: daily for week/month, monthly for year/all
function _repBuckets(range) {
  const now = new Date();
  const out = [];
  if (range === 'week' || range === 'month') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = range === 'week'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push({ label: d.getDate() + ' ' + d.toLocaleDateString('en-US', { month: 'short' }), key: _repKey(d), monthly: false });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), monthly: true });
    }
  }
  return out;
}

function _repInBucket(bucket, dateKey) {
  if (!dateKey) return false;
  return bucket.monthly ? dateKey.slice(0, 7) === bucket.key : dateKey === bucket.key;
}

// Avatar with initials fallback (photographer avatars may be empty in the DB)
function _repAvatarHtml(name, avatar) {
  const n = name || '?';
  if (avatar) return `<img src="${avatar}" class="w-10 h-10 rounded-full object-cover" alt="${n}" />`;
  const initials = n.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style="background:#F4E8C1;color:#8a6d1f">${initials}</div>`;
}

// Destroy report charts already on screen (safe re-render on range change)
function _repDestroyCharts() {
  _REP_CHART_IDS.forEach(id => {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
  });
}

async function renderReports() {
  const el = document.getElementById('page-content');
  const sel = v => (_repRange === v ? ' selected' : '');
  el.innerHTML = `
    ${pageHeader('Reports & Analytics', 'Comprehensive studio performance metrics', `<div class="flex gap-2">
      <select onchange="onReportRangeChange(this.value)" class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white">
        <option value="month"${sel('month')}>This Month</option>
        <option value="week"${sel('week')}>This Week</option>
        <option value="year"${sel('year')}>This Year</option>
        <option value="all"${sel('all')}>All Time</option>
      </select>
      <button onclick="exportReportPDF()" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Download PDF</button>
      <button onclick="exportReportCSV()" class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> CSV</button>
    </div>`)}
    <div id="rep-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="rep-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadReportsData();
}

// Range selector: re-render instantly from the fetched dataset (re-fetch if none yet)
function onReportRangeChange(range) {
  _repRange = range;
  if (_repData) renderReportsData(_repData);
  else loadReportsData();
}

// Fetch all report data from the existing backend APIs (JWT attached by api.js).
// Re-runs on every visit, so new/updated/deleted records in any module are reflected.
async function loadReportsData() {
  _repDemoMode = false;
  const loading = document.getElementById('rep-loading');
  const content = document.getElementById('rep-content');
  if (loading) loading.classList.remove('hidden');
  if (content) content.classList.add('hidden');
  try {
    const [payRes, sbRes, stbRes, custRes, pkgRes, phRes] = await Promise.all([
      api.getPayments(), api.getServiceBookings(), api.getStudioBookings(),
      api.getCustomers(), api.getPackages(), api.getPhotographers()
    ]);
    _repData = {
      payments: payRes.data || [],
      serviceBookings: sbRes.data || [],
      studioBookings: stbRes.data || [],
      customers: custRes.data || [],
      packages: pkgRes.data || [],
      photographers: phRes.data || [],
    };
    renderReportsData(_repData);
  } catch (err) {
    // Fallback to demo data (same pattern as the dashboard page)
    _repDemoMode = true;
    const fallback = {
      payments: MOCK.payments || [],
      serviceBookings: MOCK.serviceBookings || [],
      studioBookings: MOCK.studioBookings || [],
      customers: MOCK.clients || [],
      packages: MOCK.packages || [],
      photographers: MOCK.photographers || [],
    };
    const hasData = fallback.payments.length || fallback.serviceBookings.length || fallback.studioBookings.length || fallback.customers.length;
    if (hasData) {
      _repData = fallback;
      renderReportsData(fallback);
    } else {
      if (loading) loading.classList.add('hidden');
      if (content) {
        content.classList.remove('hidden');
        content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadReportsData()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
        lucide.createIcons();
      }
    }
  }
}

function renderReportsData(data) {
  const loading = document.getElementById('rep-loading');
  const content = document.getElementById('rep-content');
  if (!loading || !content) return;
  loading.classList.add('hidden');
  content.classList.remove('hidden');
  _repDestroyCharts();

  const meta = _repRangeMeta(_repRange);
  const { payments, serviceBookings, studioBookings, customers, packages, photographers } = data;
  const allBookings = [
    ...serviceBookings.map(b => ({ ...b, _type: 'service' })),
    ...studioBookings.map(b => ({ ...b, _type: 'studio' })),
  ];
  const sum = arr => arr.reduce((s, x) => s + (Number(x) || 0), 0);

  // ── KPI cards (live values for the selected range, trends vs previous period) ──
  const completed = payments.filter(p => p.status === 'Completed');
  const revenueCur = sum(completed.filter(p => _repIn(_repDateKey(p.date), meta.start, meta.end)).map(p => p.amount));
  const revenuePrev = meta.prevStart ? sum(completed.filter(p => _repIn(_repDateKey(p.date), meta.prevStart, meta.prevEnd)).map(p => p.amount)) : 0;
  const bookingsCur = allBookings.filter(b => _repIn(_repDateKey(b.date), meta.start, meta.end)).length;
  const bookingsPrev = meta.prevStart ? allBookings.filter(b => _repIn(_repDateKey(b.date), meta.prevStart, meta.prevEnd)).length : 0;
  const newClientsCur = customers.filter(c => _repIn(_repDateKey(c.createdAt), meta.start, meta.end)).length;
  const newClientsPrev = meta.prevStart ? customers.filter(c => _repIn(_repDateKey(c.createdAt), meta.prevStart, meta.prevEnd)).length : 0;
  const pendingAmount = sum(payments.filter(p => p.status === 'Pending').map(p => p.amount));

  const kpis = kpiCards([
    { icon: 'trending-up', iconBg: 'bg-green-50', iconColor: 'text-green-600', value: formatCurrency(revenueCur), label: 'Total Revenue (' + meta.label + ')', trend: _repTrend(revenueCur, revenuePrev) },
    { icon: 'calendar-days', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', value: String(bookingsCur), label: 'Total Bookings (' + meta.label + ')', trend: _repTrend(bookingsCur, bookingsPrev) },
    { icon: 'users', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', value: String(customers.length), label: 'Total Clients', trend: _repTrend(newClientsCur, newClientsPrev) },
    { icon: 'clock', iconBg: 'bg-red-50', iconColor: 'text-red-500', value: formatCurrency(pendingAmount), label: 'Pending Payments' },
  ]);

  // ── Revenue + booking growth series (range-aware buckets) ──
  const buckets = _repBuckets(_repRange);
  const revValues = buckets.map(bk => sum(completed.filter(p => _repInBucket(bk, _repDateKey(p.date))).map(p => p.amount)));
  const growthValues = buckets.map(bk => allBookings.filter(b => _repInBucket(bk, _repDateKey(b.createdAt || b.date))).length);
  const revTotal = sum(revValues);
  const growthTotal = sum(growthValues);

  // ── Popular services (service bookings by event, selected range) ──
  const svcCounts = {};
  serviceBookings.filter(b => _repIn(_repDateKey(b.date), meta.start, meta.end)).forEach(b => {
    const k = (b.event || 'Other').toString().trim() || 'Other';
    svcCounts[k] = (svcCounts[k] || 0) + 1;
  });
  const svcRows = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Photographer performance (sessions from service bookings, selected range) ──
  const phById = {};
  photographers.forEach(p => { phById[p._id] = p; });
  const phSessions = {};
  serviceBookings.filter(b => _repIn(_repDateKey(b.date), meta.start, meta.end)).forEach(b => {
    const pid = b.photographerId && (b.photographerId._id || b.photographerId);
    if (!pid) return;
    phSessions[pid] = (phSessions[pid] || 0) + 1;
    if (b.photographerId && b.photographerId.name && !phById[pid]) phById[pid] = { name: b.photographerId.name, avatar: '' };
  });
  const phRows = Object.entries(phSessions)
    .map(([id, count]) => ({ name: (phById[id] && phById[id].name) || 'Unassigned', avatar: (phById[id] && phById[id].avatar) || '', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const phMax = phRows.length ? phRows[0].count : 1;

  // ── Package performance (service bookings by package, selected range) ──
  const pkgAgg = {};
  serviceBookings.filter(b => _repIn(_repDateKey(b.date), meta.start, meta.end)).forEach(b => {
    const pid = b.packageId && (b.packageId._id || b.packageId);
    if (!pid) return;
    if (!pkgAgg[pid]) pkgAgg[pid] = { count: 0, revenue: 0 };
    pkgAgg[pid].count += 1;
    pkgAgg[pid].revenue += Number(b.amount) || 0;
  });
  const pkgRows = packages.map(p => ({
    name: p.name,
    count: (pkgAgg[p._id] || {}).count || 0,
    revenue: (pkgAgg[p._id] || {}).revenue || 0,
  }));

  // ── Demo-data banner (only when backend is unreachable) ──
  const banner = _repDemoMode
    ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live report data.</span></div>`
    : '';

  const svcChartHtml = svcRows.length
    ? '<div class="chart-container" style="height:250px"><canvas id="servicesChart"></canvas></div>'
    : '<p class="text-text-secondary text-center py-16 text-sm">No service bookings in this period.</p>';

  const phHtml = phRows.length
    ? phRows.map(p => `
      <div class="flex items-center gap-4">
        ${_repAvatarHtml(p.name, p.avatar)}
        <div class="flex-1"><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium">${p.name}</span><span class="text-sm font-semibold">${p.count} session${p.count === 1 ? '' : 's'}</span></div><div class="w-full h-2 bg-surface rounded-full"><div class="h-full bg-accent rounded-full" style="width:${Math.round(p.count / phMax * 100)}%"></div></div></div>
      </div>`).join('')
    : '<p class="text-text-secondary text-center py-8 text-sm">No assignments in this period.</p>';

  content.innerHTML = `
    ${banner}
    ${kpis}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-4"><h3 class="font-bold">Revenue – ${meta.label}</h3><span class="text-sm text-text-secondary font-medium">${formatCurrency(revTotal)} total</span></div>
        <div class="chart-container" style="height:250px"><canvas id="revenueBarChart"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-4"><h3 class="font-bold">Booking Growth</h3><span class="text-sm text-text-secondary font-medium">${growthTotal} bookings</span></div>
        <div class="chart-container" style="height:250px"><canvas id="bookingGrowthChart"></canvas></div>
      </div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Popular Services</h3>
        ${svcChartHtml}
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Photographer Performance</h3>
        <div class="space-y-4">${phHtml}</div>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold mb-4">Package Performance</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${pkgRows.map(p => `<div class="p-4 rounded-xl bg-surface text-center"><p class="text-2xl font-bold">${p.count}</p><p class="text-sm font-medium mt-1">${p.name}</p><p class="text-xs text-text-secondary">${formatCurrency(p.revenue)} total</p></div>`).join('')}
      </div>
    </div>`;
  lucide.createIcons();

  // Revenue bar chart (Completed payments per bucket)
  createChart('revenueBarChart', {
    type: 'bar',
    data: { labels: buckets.map(b => b.label), datasets: [{ label: 'Revenue', data: revValues, backgroundColor: 'rgba(212,175,55,0.7)', borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { callback: v => 'Rs. ' + (v >= 1000 ? (v / 1000) + 'k' : v) } }, x: { grid: { display: false } } } }
  });
  // Booking growth line chart (service + studio bookings created per bucket)
  createChart('bookingGrowthChart', {
    type: 'line',
    data: { labels: buckets.map(b => b.label), datasets: [{ label: 'Bookings', data: growthValues, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } }
  });
  // Popular services polar chart
  if (svcRows.length) {
    createChart('servicesChart', {
      type: 'polarArea',
      data: { labels: svcRows.map(r => r[0]), datasets: [{ data: svcRows.map(r => r[1]), backgroundColor: ['rgba(239,68,68,0.7)', 'rgba(34,197,94,0.7)', 'rgba(59,130,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(168,85,247,0.7)'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' } } } }
    });
  }

  // Snapshot for the CSV export
  _repState = {
    range: _repRange,
    label: meta.label,
    generatedAt: new Date().toLocaleString(),
    demoMode: _repDemoMode,
    kpis: [
      { label: 'Total Revenue (' + meta.label + ')', value: formatCurrency(revenueCur) },
      { label: 'Total Bookings (' + meta.label + ')', value: String(bookingsCur) },
      { label: 'Total Clients', value: String(customers.length) },
      { label: 'Pending Payments', value: formatCurrency(pendingAmount) },
    ],
    revenueBuckets: buckets.map((b, i) => ({ label: b.label, value: revValues[i] })),
    growthBuckets: buckets.map((b, i) => ({ label: b.label, value: growthValues[i] })),
    services: svcRows,
    photographers: phRows.map(r => ({ name: r.name, sessions: r.count })),
    packages: pkgRows,
  };
}

// Export the current report as a CSV download
function exportReportCSV() {
  if (!_repState) { showToast('Report is still loading — try again in a moment.', 'alert-circle'); return; }
  const s = _repState;
  const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [];
  const line = arr => rows.push(arr.map(esc).join(','));
  line(['PhotoPro AI — Reports & Analytics']);
  line(['Range', s.label]);
  line(['Generated', s.generatedAt]);
  if (s.demoMode) line(['Note', 'Demo data — backend unreachable']);
  rows.push('');
  line(['Summary']);
  line(['Metric', 'Value']);
  s.kpis.forEach(k => line([k.label, k.value]));
  rows.push('');
  line(['Revenue by Period']);
  line(['Period', 'Revenue (Rs.)']);
  s.revenueBuckets.forEach(b => line([b.label, b.value]));
  rows.push('');
  line(['Booking Growth']);
  line(['Period', 'Bookings']);
  s.growthBuckets.forEach(b => line([b.label, b.value]));
  rows.push('');
  line(['Popular Services']);
  line(['Service', 'Bookings']);
  s.services.forEach(r => line([r[0], r[1]]));
  rows.push('');
  line(['Photographer Performance']);
  line(['Photographer', 'Sessions']);
  s.photographers.forEach(r => line([r.name, r.sessions]));
  rows.push('');
  line(['Package Performance']);
  line(['Package', 'Bookings', 'Revenue (Rs.)']);
  s.packages.forEach(p => line([p.name, p.count, p.revenue]));
  const csv = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const rangeSlug = { week: 'ThisWeek', month: 'ThisMonth', year: 'ThisYear', all: 'AllTime' }[_repRange] || _repRange;
  a.download = 'PhotoPro-Report_' + rangeSlug + '_' + _repTodayStr() + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
  showToast('Report exported as CSV');
}

// Grab a rendered Chart.js canvas as a PNG image for the PDF (null when unavailable)
function _repChartImage(id) {
  try {
    const c = document.getElementById(id);
    if (!c || typeof c.toDataURL !== 'function') return null;
    const url = c.toDataURL('image/png', 1.0);
    if (!url || url.length < 100 || url.indexOf('data:image') !== 0) return null;
    return { url, w: c.width || 600, h: c.height || 250 };
  } catch (e) { return null; }
}

// Export the current report as a formatted PDF (KPI summary, charts and tables)
function exportReportPDF() {
  if (!_repState) { showToast('Report is still loading — try again in a moment.', 'alert-circle'); return; }
  const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPDFCtor) { showToast('PDF library is still loading — try again in a moment.', 'alert-circle'); return; }
  const s = _repState;
  const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  const CONTENT_W = W - M * 2;
  let y = 0;

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(17, 24, 39);
  doc.text('PhotoPro AI - Reports & Analytics', M, 19);
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(M, 23, W - M, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Range: ' + s.label + '   |   Generated: ' + s.generatedAt + (s.demoMode ? '   |   Demo data (backend unreachable)' : ''), M, 29);

  // ── KPI summary boxes ──
  const boxW = (CONTENT_W - 3 * 3) / 4;
  s.kpis.forEach((k, i) => {
    const x = M + i * (boxW + 3);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, 34, boxW, 20, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(doc.splitTextToSize(k.label, boxW - 4), x + 2, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(String(k.value), x + 2, 50);
  });

  // ── Charts (captured from the live canvases on screen) ──
  y = 62;
  const imgRev = _repChartImage('revenueBarChart');
  const imgGrowth = _repChartImage('bookingGrowthChart');
  const imgSvc = _repChartImage('servicesChart');
  const drawImg = (img, x, top, w) => {
    if (!img) return 0;
    const h = Math.min(w * (img.h / img.w), 85);
    try { doc.addImage(img.url, 'PNG', x, top, w, h); } catch (e) { return 0; }
    return h;
  };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Revenue & Bookings', M, y);
  y += 3;
  const half = (CONTENT_W - 4) / 2;
  const hA = drawImg(imgRev, M, y, half);
  const hB = drawImg(imgGrowth, M + half + 4, y, half);
  y += Math.max(hA, hB, 6) + 9;
  if (imgSvc) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Popular Services', M, y);
    y += 3;
    const hC = drawImg(imgSvc, M, y, half);
    y += Math.max(hC, 6) + 9;
  }

  // ── Tables ──
  const hasAutoTable = typeof doc.autoTable === 'function';
  const num = v => Number(v || 0).toLocaleString();
  const table = (title, head, body) => {
    if (!body.length) return;
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(title, M, y);
    y += 2.5;
    if (hasAutoTable) {
      doc.autoTable({
        head: [head], body, startY: y, margin: { left: M, right: M },
        styles: { fontSize: 8, cellPadding: 1.6, textColor: [31, 41, 55], lineColor: [229, 231, 235], lineWidth: 0.1 },
        headStyles: { fillColor: [212, 175, 55], textColor: [17, 24, 39], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 249, 244] },
      });
      y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 9;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      body.forEach(row => { y += 4.5; doc.text(row.join('   |   '), M, y); });
      y += 4;
    }
  };
  table('Revenue & Bookings by Period', ['Period', 'Revenue (Rs.)', 'Bookings'],
    s.revenueBuckets.map((b, i) => [b.label, num(b.value), String((s.growthBuckets[i] || {}).value || 0)]));
  table('Popular Services', ['Service', 'Bookings'], s.services.map(r => [r[0], String(r[1])]));
  table('Photographer Performance', ['Photographer', 'Sessions'], s.photographers.map(r => [r.name, String(r.sessions)]));
  table('Package Performance', ['Package', 'Bookings', 'Revenue (Rs.)'], s.packages.map(p => [p.name, String(p.count), num(p.revenue)]));

  // ── Footer with page numbers ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('PhotoPro AI - Generated report   |   Page ' + i + ' of ' + pages, M, 292);
  }

  const rangeSlug = { week: 'ThisWeek', month: 'ThisMonth', year: 'ThisYear', all: 'AllTime' }[s.range] || s.range;
  doc.save('PhotoPro-Report_' + rangeSlug + '_' + _repTodayStr() + '.pdf');
  showToast('Report downloaded as PDF');
}
