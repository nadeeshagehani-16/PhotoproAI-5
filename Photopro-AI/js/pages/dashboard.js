// Dashboard Page – Live data from backend APIs (service bookings, studio bookings, payments, customers)
let _dashDemoMode = false; // true when showing mock fallback data (backend unreachable)

// ── Local-date helpers (timezone-safe, avoids UTC shift of toISOString) ──
function _dashTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// '2026-08-15' / '2026-08-15T00:00:00.000Z' -> 'Aug 15, 2026'
function _dashFmtDate(d) {
  const s = (d || '').toString().split('T')[0];
  if (!s) return '—';
  const [y, m, day] = s.split('-').map(Number);
  if (!y || !m || !day) return s;
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// '14:00' -> '2:00 PM'
function _dashFmtTime(t) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return t || '—';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}

// Local yyyy-mm key of a date value ('' when invalid)
function _dashYM(d) {
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
}

// Percentage change between previous and current values ('' when not computable)
function _dashTrend(current, previous) {
  if (!previous || previous <= 0) return '';
  const pct = ((current - previous) / previous) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

// Cover images for upcoming event cards (reuses images already in the project)
const DASH_EVENT_IMAGES = {
  wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
  birthday: 'https://images.unsplash.com/photo-1537632508423-154c7bc14586?w=400&q=80',
  corporate: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=80',
  portrait: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  studio: 'https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=400&q=80',
  other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80',
};

function _dashEventImage(b) {
  if (b._type === 'studio') return DASH_EVENT_IMAGES.studio;
  const e = (b.event || '').toLowerCase();
  if (e.includes('wedding')) return DASH_EVENT_IMAGES.wedding;
  if (e.includes('birthday')) return DASH_EVENT_IMAGES.birthday;
  if (e.includes('corporate')) return DASH_EVENT_IMAGES.corporate;
  if (e.includes('portrait')) return DASH_EVENT_IMAGES.portrait;
  return DASH_EVENT_IMAGES.other;
}

async function renderDashboard() {
  const el = document.getElementById('page-content');
  const user = api.getUser();
  const firstName = user && user.name ? user.name.split(' ')[0] : null;
  el.innerHTML = `
    ${pageHeader('Dashboard', `Welcome back${firstName ? ', ' + firstName : ''}! Here's your studio overview.`, `<button onclick="navigate('bookings')" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Booking</button>`)}
    <div id="dash-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="dash-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadDashboardData();
}

// Fetch all dashboard data from the existing backend APIs.
// Re-runs on every visit, so new/updated/deleted records in any module are reflected.
async function loadDashboardData() {
  _dashDemoMode = false;
  try {
    const [sbRes, stbRes, payRes, custRes] = await Promise.all([
      api.getServiceBookings(), api.getStudioBookings(), api.getPayments(), api.getCustomers()
    ]);
    renderDashboardData({
      serviceBookings: sbRes.data || [],
      studioBookings: stbRes.data || [],
      payments: payRes.data || [],
      customers: custRes.data || [],
    });
  } catch (err) {
    // Fallback to demo data (same pattern as the payments page)
    _dashDemoMode = true;
    const fallback = {
      serviceBookings: MOCK.serviceBookings || [],
      studioBookings: MOCK.studioBookings || [],
      payments: MOCK.payments || [],
      customers: MOCK.clients || [],
    };
    const hasData = fallback.serviceBookings.length || fallback.studioBookings.length || fallback.payments.length || fallback.customers.length;
    if (hasData) {
      renderDashboardData(fallback);
    } else {
      document.getElementById('dash-loading').classList.add('hidden');
      const content = document.getElementById('dash-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadDashboardData()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderDashboardData(data) {
  const loading = document.getElementById('dash-loading');
  const content = document.getElementById('dash-content');
  if (!loading || !content) return;
  loading.classList.add('hidden');
  content.classList.remove('hidden');

  const { serviceBookings, studioBookings, payments, customers } = data;
  const todayStr = _dashTodayStr();

  // ── Unified booking list (service + studio, tagged by type) ──
  const allBookings = [
    ...serviceBookings.map(b => ({ ...b, _type: 'service' })),
    ...studioBookings.map(b => ({ ...b, _type: 'studio' })),
  ];

  // ── Upcoming bookings: today or future, not Completed/Cancelled ──
  const upcoming = allBookings
    .filter(b => {
      const d = (b.date || '').toString().split('T')[0];
      return d && d >= todayStr && b.status !== 'Completed' && b.status !== 'Cancelled';
    })
    .sort((a, b) => ((a.date || '').toString() < (b.date || '').toString() ? -1 : 1));

  // ── Payments by status ──
  const completedPayments = payments.filter(p => p.status === 'Completed');
  const pendingAmount = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + (Number(p.amount) || 0), 0);

  // ── Current / previous month keys (for KPI trends) ──
  const now = new Date();
  const curYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');

  // ── Monthly revenue (Completed payments) with month-over-month trend ──
  const revenueThisMonth = completedPayments.filter(p => _dashYM(p.date) === curYM).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const revenueLastMonth = completedPayments.filter(p => _dashYM(p.date) === prevYM).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  // ── Records created per month (createdAt) for booking/client trends ──
  const bookingsThisMonth = allBookings.filter(b => _dashYM(b.createdAt) === curYM).length;
  const bookingsLastMonth = allBookings.filter(b => _dashYM(b.createdAt) === prevYM).length;
  const clientsThisMonth = customers.filter(c => _dashYM(c.createdAt) === curYM).length;
  const clientsLastMonth = customers.filter(c => _dashYM(c.createdAt) === prevYM).length;

  // ── Active clients count ──
  const activeClients = customers.filter(c => (c.status || 'Active') === 'Active').length;

  // ── KPI cards (same layout, live values) ──
  const kpis = kpiCards([
    { icon: 'calendar-days', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', value: allBookings.length, label: 'Total Bookings', trend: _dashTrend(bookingsThisMonth, bookingsLastMonth) },
    { icon: 'camera', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', value: upcoming.length, label: 'Upcoming Shoots' },
    { icon: 'banknote', iconBg: 'bg-green-50', iconColor: 'text-green-600', value: formatCurrency(revenueThisMonth), label: 'Monthly Revenue', trend: _dashTrend(revenueThisMonth, revenueLastMonth) },
    { icon: 'clock', iconBg: 'bg-red-50', iconColor: 'text-red-500', value: formatCurrency(pendingAmount), label: 'Pending Payments' },
    { icon: 'users', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', value: activeClients, label: 'Active Clients', trend: _dashTrend(clientsThisMonth, clientsLastMonth) },
  ]);

  // ── Revenue chart series: last 8 months of Completed payments ──
  const revLabels = [], revValues = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    revValues.push(completedPayments.filter(p => _dashYM(p.date) === key).reduce((s, p) => s + (Number(p.amount) || 0), 0));
  }

  // ── Booking statistics by status (service + studio combined) ──
  const countBy = s => allBookings.filter(b => (b.status || 'Pending') === s).length;
  const stats = { confirmed: countBy('Confirmed'), pending: countBy('Pending'), completed: countBy('Completed'), cancelled: countBy('Cancelled'), inProgress: countBy('In Progress') };

  // ── Today's schedule (both booking types, sorted by start time) ──
  const todayBookings = allBookings
    .filter(b => (b.date || '').toString().split('T')[0] === todayStr)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const scheduleHtml = todayBookings.length
    ? todayBookings.map(s => `
      <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition cursor-pointer">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">${s.customerId?.name || '—'}</p>
          <p class="text-xs text-text-secondary">${s._type === 'studio' ? (s.purpose || 'Studio Booking') : (s.event || 'Service')} · ${s._type === 'studio' ? (s.studioId?.location || '—') : (s.location || '—')}</p>
        </div>
        <div class="text-right hidden sm:block">
          <p class="text-sm font-medium">${_dashFmtTime(s.startTime)} – ${_dashFmtTime(s.endTime)}</p>
          <p class="text-xs text-text-secondary">${s._type === 'studio' ? (s.studioId?.name || 'Studio') : (s.photographerId?.name || 'Unassigned')}</p>
        </div>
        ${statusBadge(s.status || 'Pending')}
      </div>`).join('')
    : '<p class="text-text-secondary text-center py-8 text-sm">No sessions scheduled for today.</p>';

  // ── Recent clients (newest first) with live booking counts, spend and last booking ──
  const custKey = b => (b.customerId && (b.customerId._id || b.customerId)) || '';
  const bookingsByCust = {}, spentByCust = {}, lastByCust = {};
  allBookings.forEach(b => {
    const id = custKey(b);
    if (!id) return;
    bookingsByCust[id] = (bookingsByCust[id] || 0) + 1;
    const d = (b.date || '').toString().split('T')[0];
    if (d && (!lastByCust[id] || d > lastByCust[id])) lastByCust[id] = d;
  });
  completedPayments.forEach(p => {
    const id = custKey(p);
    if (id) spentByCust[id] = (spentByCust[id] || 0) + (Number(p.amount) || 0);
  });
  const recentClients = [...customers]
    .sort((a, b) => ((b.createdAt || '').toString() > (a.createdAt || '').toString() ? 1 : -1))
    .slice(0, 5);

  const clientsHtml = recentClients.length
    ? recentClients.map(c => {
      const id = c._id || c.id || '';
      return `
      <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition cursor-pointer" onclick="navigate('client-detail')">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">${c.name || '—'}</p>
          <p class="text-xs text-text-secondary">${bookingsByCust[id] || 0} bookings · Last: ${lastByCust[id] ? _dashFmtDate(lastByCust[id]) : '—'}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold">${formatCurrency(spentByCust[id] || 0)}</p>
          ${statusBadge(c.status || 'Active')}
        </div>
      </div>`;
    }).join('')
    : '<p class="text-text-secondary text-center py-8 text-sm">No clients yet.</p>';

  // ── Upcoming events (next 4 upcoming bookings) ──
  const upcomingEvents = upcoming.slice(0, 4);
  const eventsHtml = upcomingEvents.length
    ? upcomingEvents.map(e => `
      <div class="card-hover rounded-xl overflow-hidden border border-border-light cursor-pointer" onclick="navigate('booking-detail')">
        <div class="h-36 overflow-hidden"><img src="${_dashEventImage(e)}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="${e._type === 'studio' ? (e.purpose || 'Studio Booking') : (e.event || 'Service')}" /></div>
        <div class="p-4">
          <p class="font-semibold text-sm">${e._type === 'studio' ? `${e.studioId?.name || 'Studio'} – ${e.purpose || 'Booking'}` : `${e.event || 'Service'} – ${e.packageId?.name || e.photographerId?.name || 'Session'}`}</p>
          <p class="text-xs text-text-secondary mt-1">${e.customerId?.name || '—'}</p>
          <div class="flex items-center gap-1.5 mt-3 text-xs text-accent font-medium"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>${_dashFmtDate(e.date)}</div>
        </div>
      </div>`).join('')
    : '<p class="text-text-secondary text-center py-8 text-sm">No upcoming events.</p>';

  // ── Demo-data banner (only when backend is unreachable) ──
  const banner = _dashDemoMode
    ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live dashboard data.</span></div>`
    : '';

  content.innerHTML = `
    ${banner}
    ${kpis}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <!-- Revenue Chart -->
      <div class="xl:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-lg">Revenue Overview</h3>
          <div class="flex gap-1 bg-surface rounded-lg p-1">
            <button class="px-3 py-1.5 text-xs font-medium rounded-md bg-white shadow-sm text-primary">Monthly</button>
            <button class="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-primary transition">Weekly</button>
            <button class="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-primary transition">Yearly</button>
          </div>
        </div>
        <div class="chart-container" style="height:280px"><canvas id="revenueChart"></canvas></div>
      </div>
      <!-- Booking Stats -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-6">Booking Statistics</h3>
        <div class="chart-container flex items-center justify-center" style="height:200px"><canvas id="bookingChart"></canvas></div>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-success"></span><span class="text-xs text-text-secondary">Confirmed (${stats.confirmed})</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-warning"></span><span class="text-xs text-text-secondary">Pending (${stats.pending})</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span><span class="text-xs text-text-secondary">Completed (${stats.completed})</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-error"></span><span class="text-xs text-text-secondary">Cancelled (${stats.cancelled})</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-purple-500"></span><span class="text-xs text-text-secondary">In Progress (${stats.inProgress})</span></div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Today's Schedule -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-lg">Today's Schedule</h3>
          <button onclick="navigate('calendar')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
        </div>
        <div class="space-y-4">${scheduleHtml}</div>
      </div>
      <!-- Recent Clients -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-lg">Recent Clients</h3>
          <button onclick="navigate('clients')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
        </div>
        <div class="space-y-4">${clientsHtml}</div>
      </div>
    </div>
    <!-- Upcoming Events -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-lg">Upcoming Events</h3>
        <button onclick="navigate('bookings')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${eventsHtml}</div>
    </div>`;
  lucide.createIcons();

  // Revenue chart (live completed payments by month)
  createChart('revenueChart', {
    type: 'line',
    data: { labels: revLabels, datasets: [{ label: 'Revenue', data: revValues, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#D4AF37', pointBorderColor: '#fff', pointBorderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: '#f3f4f6' }, ticks: { callback: v => 'Rs. ' + (v / 1000) + 'k' } }, x: { grid: { display: false } } } }
  });
  // Booking chart (live status counts from service + studio bookings)
  createChart('bookingChart', {
    type: 'doughnut',
    data: { labels: ['Confirmed', 'Pending', 'Completed', 'Cancelled', 'In Progress'], datasets: [{ data: [stats.confirmed, stats.pending, stats.completed, stats.cancelled, stats.inProgress], backgroundColor: ['#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'], borderWidth: 0, hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
  });
}
