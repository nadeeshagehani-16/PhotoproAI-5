// Notifications Page — live data from /api/notifications
let _notifData = null;       // cached notification list
let _notifFilter = 'All';    // All | Unread | Bookings | Payments | Clients | System
let _notifDemoMode = false;  // true when the backend is unreachable (MOCK fallback)

// Icon per notification type
function _notifIcon(type) {
  if (type === 'booking') return 'calendar-plus';
  if (type === 'payment') return 'credit-card';
  if (type === 'client') return 'users';
  return 'bell';
}

// "3 min ago" / "2 hours ago" / "1 day ago" style relative time
function _notifTimeAgo(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) { const h = Math.floor(diff / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
  const days = Math.floor(diff / 86400);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  const months = Math.floor(days / 30);
  return months + (months === 1 ? ' month ago' : ' months ago');
}

// Normalize one notification record for rendering
function _notifNorm(n) {
  return {
    id: n._id || String(n.id),
    type: n.type || 'system',
    title: n.title || '',
    message: n.message || '',
    link: n.link || '',
    isRead: n.isRead !== undefined ? !!n.isRead : !!n.read,
    timeStr: n.createdAt ? _notifTimeAgo(n.createdAt) : (n.time || ''),
  };
}

async function renderNotifications() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div id="notif-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="notif-content" class="hidden"></div>`;
  await loadNotificationsData();
}

async function loadNotificationsData() {
  const content = document.getElementById('notif-content');
  try {
    const res = await api.getNotifications();
    _notifData = (res.data || []).map(_notifNorm);
    _notifDemoMode = false;
  } catch (err) {
    // Backend unreachable: fall back to the mock list so the page stays usable
    _notifData = (typeof MOCK !== 'undefined' ? MOCK.notifications : []).map(_notifNorm);
    _notifDemoMode = true;
  }
  if (!document.getElementById('notif-loading')) return; // user navigated away
  document.getElementById('notif-loading').classList.add('hidden');
  content.classList.remove('hidden');
  renderNotificationsList();
}

function _notifUnreadCount() {
  return (_notifData || []).filter(n => !n.isRead).length;
}

function renderNotificationsList() {
  const content = document.getElementById('notif-content');
  if (!content || _notifData === null) return;
  const unread = _notifUnreadCount();

  const filters = ['All', 'Unread', 'Bookings', 'Payments', 'Clients', 'System'];
  const typeFor = { Bookings: 'booking', Payments: 'payment', Clients: 'client', System: 'system' };
  let list = _notifData;
  if (_notifFilter === 'Unread') list = list.filter(n => !n.isRead);
  else if (_notifFilter !== 'All') list = list.filter(n => n.type === typeFor[_notifFilter]);

  content.innerHTML = `
    ${_notifDemoMode
      ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live notifications.</span></div>`
      : ''}
    ${pageHeader('Notifications', `${unread} unread notification${unread === 1 ? '' : 's'}`, `
      ${unread > 0 ? `<button onclick="markAllNotifsRead()" class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="check-check" class="w-4 h-4"></i> Mark all read</button>` : ''}
      <button onclick="loadNotificationsData()" class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh</button>`)}
    <div class="flex gap-2 mb-6 flex-wrap">
      ${filters.map(f => `<button onclick="onNotifFilter('${f}')" class="px-4 py-2 rounded-xl text-sm font-medium transition ${_notifFilter === f ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${f}${f === 'Unread' && unread ? ` (${unread})` : ''}</button>`).join('')}
    </div>
    <div class="space-y-3">
      ${list.length ? list.map(n => `
      <div class="bg-white rounded-xl p-5 shadow-card border ${n.isRead ? 'border-border-light' : 'border-accent/30 bg-accent/[0.02]'} flex gap-4 card-hover">
        <div class="w-10 h-10 rounded-xl ${n.isRead ? 'bg-surface' : 'bg-accent/10'} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${_notifIcon(n.type)}" class="w-5 h-5 ${n.isRead ? 'text-text-secondary' : 'text-accent'}"></i>
        </div>
        <div class="flex-1 min-w-0 cursor-pointer" onclick="openNotif('${n.id}')">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-sm ${n.isRead ? '' : 'text-primary'}">${n.title}</p>
            ${!n.isRead ? '<span class="w-2 h-2 rounded-full bg-accent"></span>' : ''}
          </div>
          <p class="text-sm text-text-secondary mt-1">${n.message}</p>
          <p class="text-xs text-text-secondary mt-2 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${n.timeStr || '—'}</p>
        </div>
        <div class="flex flex-col gap-1">
          ${n.link ? `<button onclick="openNotif('${n.id}', '${n.link}')" class="btn-action p-1.5" title="Open"><i data-lucide="arrow-up-right" class="w-4 h-4"></i></button>` : ''}
          ${!n.isRead ? `<button onclick="markNotifRead('${n.id}')" class="btn-action p-1.5" title="Mark as read"><i data-lucide="check" class="w-4 h-4"></i></button>` : ''}
          <button onclick="deleteNotif('${n.id}')" class="btn-action p-1.5" title="Delete"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
      </div>`).join('')
      : `<div class="text-center py-16 bg-white rounded-2xl border border-border-light">
          <i data-lucide="bell-off" class="w-12 h-12 text-text-secondary mx-auto mb-3"></i>
          <p class="font-medium">No notifications${_notifFilter !== 'All' ? ' in this filter' : ''}</p>
          <p class="text-sm text-text-secondary mt-1">New bookings, payments and clients will appear here automatically.</p>
        </div>`}
    </div>`;
  lucide.createIcons();
}

function onNotifFilter(filter) {
  _notifFilter = filter;
  renderNotificationsList();
}

// Mark one as read; optionally navigate to its linked page
async function markNotifRead(id) {
  const n = (_notifData || []).find(x => x.id === id);
  if (!n) return;
  if (!_notifDemoMode) {
    try { await api.markNotificationRead(id); } catch (e) { showToast(e.message, 'alert-circle'); return; }
  }
  n.isRead = true;
  if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  renderNotificationsList();
}

// Open a notification: mark read then jump to the related page if any
async function openNotif(id, link) {
  const n = (_notifData || []).find(x => x.id === id);
  if (n && !n.isRead) {
    if (!_notifDemoMode) { try { await api.markNotificationRead(id); } catch (e) { /* still navigate */ } }
    n.isRead = true;
    if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  }
  if (link && typeof navigate === 'function') navigate(link);
  else renderNotificationsList();
}

async function markAllNotifsRead() {
  if (!_notifDemoMode) {
    try { await api.markAllNotificationsRead(); } catch (e) { showToast(e.message, 'alert-circle'); return; }
  }
  (_notifData || []).forEach(n => { n.isRead = true; });
  if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  renderNotificationsList();
  showToast('All notifications marked as read', 'check-check');
}

async function deleteNotif(id) {
  if (!_notifDemoMode) {
    try { await api.deleteNotification(id); } catch (e) { showToast(e.message, 'alert-circle'); return; }
  }
  _notifData = (_notifData || []).filter(n => n.id !== id);
  if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  renderNotificationsList();
  showToast('Notification deleted', 'trash-2');
}
