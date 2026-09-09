// PhotoPro AI – Main Application Logic
const NAV_ITEMS = [
  { id:'dashboard', label:'Dashboard', icon:'layout-dashboard' },
  { id:'clients', label:'Clients', icon:'users' },
  { id:'users', label:'User Management', icon:'shield-check' },
  { id:'bookings', label:'Bookings', icon:'calendar-days' },
  { id:'calendar', label:'Calendar', icon:'calendar' },
  { id:'packages', label:'Packages & Services', icon:'package' },
  { id:'projects', label:'Projects', icon:'folder-kanban' },
  { id:'gallery', label:'Photo Gallery', icon:'images' },
  { id:'ai-studio', label:'AI Photo Studio', icon:'sparkles', badge:'AI' },
  { id:'invoices', label:'Invoices & Payments', icon:'receipt' },
  { id:'team', label:'Team Management', icon:'user-cog' },
  { id:'reports', label:'Reports & Analytics', icon:'bar-chart-3' },
  { id:'ai-insights', label:'AI Insights', icon:'brain', badge:'AI' },
  { id:'notifications', label:'Notifications', icon:'bell' },
  { id:'settings', label:'Settings', icon:'settings' },
  { id:'client-portal', label:'Client Portal', icon:'globe' },
];

let currentPage = 'dashboard';
const chartInstances = {};

function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => {
    const active = item.id === currentPage ? 'active' : '';
    const badge = item.badge ? `<span class="badge">${item.badge}</span>` : '';
    const notif = item.id === 'notifications' ? `<span class="badge">${MOCK.notifications.filter(n=>!n.read).length}</span>` : '';
    return `<div class="nav-item ${active}" onclick="navigate('${item.id}')"><i data-lucide="${item.icon}" class="w-[18px] h-[18px]"></i><span>${item.label}</span>${badge}${notif}</div>`;
  }).join('');
  lucide.createIcons();
}

function navigate(page, param) {
  currentPage = page;
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItems = document.querySelectorAll('#sidebar-nav .nav-item');
  const idx = NAV_ITEMS.findIndex(i => i.id === page);
  if (idx >= 0 && navItems[idx]) navItems[idx].classList.add('active');
  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) toggleSidebar();
  // Render page
  const content = document.getElementById('page-content');
  content.classList.remove('animate-fade-in');
  void content.offsetWidth;
  content.classList.add('animate-fade-in');
  // Destroy old charts
  Object.values(chartInstances).forEach(c => c.destroy());
  Object.keys(chartInstances).forEach(k => delete chartInstances[k]);
  // Route
  const routes = {
    'dashboard': renderDashboard, 'clients': renderClients, 'client-detail': renderClientDetail,
    'users': renderUsers,
    'bookings': renderBookings, 'booking-detail': renderBookingDetail, 'calendar': renderCalendar,
    'packages': renderPackages, 'projects': renderProjects, 'project-detail': renderProjectDetail,
    'gallery': renderGallery, 'ai-studio': renderAIStudio, 'invoices': renderInvoices,
    'team': renderTeam, 'reports': renderReports, 'ai-insights': renderAIInsights,
    'notifications': renderNotifications, 'settings': renderSettings, 'client-portal': renderClientPortal,
  };
  if (routes[page]) routes[page](param);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
}

// Utility functions
function statusBadge(status) {
  const cls = status.toLowerCase().replace(/\s+/g, '-');
  return `<span class="badge-status badge-${cls}"><span class="badge-dot"></span>${status}</span>`;
}

function formatCurrency(n) { return 'Rs. ' + n.toLocaleString(); }

function pageHeader(title, subtitle, actions) {
  return `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div><h1 class="text-2xl lg:text-3xl font-bold text-primary">${title}</h1>${subtitle ? `<p class="text-text-secondary mt-1">${subtitle}</p>` : ''}</div>
    ${actions ? `<div class="flex items-center gap-3">${actions}</div>` : ''}
  </div>`;
}

function kpiCards(cards) {
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">${cards.map(c => `
    <div class="kpi-card">
      <div class="flex items-center justify-between mb-3">
        <div class="w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center"><i data-lucide="${c.icon}" class="w-5 h-5 ${c.iconColor}"></i></div>
        ${c.trend ? `<span class="text-xs font-semibold ${c.trend.startsWith('+') ? 'text-success' : c.trend.startsWith('-') ? 'text-error' : 'text-text-secondary'}">${c.trend}</span>` : ''}
      </div>
      <p class="text-2xl font-bold">${c.value}</p>
      <p class="text-sm text-text-secondary mt-1">${c.label}</p>
    </div>`).join('')}</div>`;
}

function showToast(message, icon = 'check-circle') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 text-success"></i><span>${message}</span>`;
  document.body.appendChild(t);
  lucide.createIcons();
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

function createChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

// Action buttons helper
function actionBtns(viewPage, id) {
  return `<div class="flex items-center gap-1">
    <button onclick="navigate('${viewPage}')" class="btn-action" title="View"><i data-lucide="eye" class="w-4 h-4"></i></button>
    <button class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
    <button class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
  </div>`;
}

// Search & filter bar
function searchFilter(placeholder, filterOptions) {
  return `<div class="flex flex-col sm:flex-row gap-3 mb-6">
    <div class="relative flex-1"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i>
      <input type="text" placeholder="${placeholder}" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition" />
    </div>
    ${filterOptions ? `<div class="flex gap-2">${filterOptions.map(o => `<select class="px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>${o}</option></select>`).join('')}</div>` : ''}
  </div>`;
}
