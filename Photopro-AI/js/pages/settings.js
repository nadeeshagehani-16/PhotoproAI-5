// Settings Page — live profile (auth API) + studio settings (settings API)
let _setDemoMode = false;   // true when the backend is unreachable
let _setUser = null;        // fresh user document from /auth/me
let _setSettings = null;    // studio settings document from /settings
let _setCounts = null;      // record counts for the Backup card

// Notification preference keys shown as toggles
const _SET_NOTIF_KEYS = [
  ['newBookings', 'New bookings'],
  ['paymentReceived', 'Payment received'],
  ['paymentOverdue', 'Payment overdue'],
  ['clientMessages', 'Client messages'],
  ['projectUpdates', 'Project updates'],
  ['aiComplete', 'AI processing complete'],
  ['teamNotifications', 'Team notifications'],
  ['marketingEmails', 'Marketing emails'],
];

// Default settings shape used by the demo fallback
function _setDefaultSettings() {
  return {
    studioName: '', website: '', address: '', description: '',
    notifications: { newBookings: true, paymentReceived: true, paymentOverdue: true, clientMessages: true, projectUpdates: true, aiComplete: true, teamNotifications: false, marketingEmails: false },
    payments: { currency: 'Rs.', invoicePrefix: 'INV-', dueDays: 14 },
    ai: { enhancementLevel: 'Medium', autoSaveEdits: true, outputFormat: 'JPEG (High Quality)' },
  };
}

async function renderSettings() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div id="settings-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="settings-content" class="hidden"></div>`;
  await loadSettingsData();
}

async function loadSettingsData() {
  const content = document.getElementById('settings-content');
  try {
    const [meRes, setRes] = await Promise.all([api.getMe(), api.getSettings()]);
    _setUser = meRes.data || api.getUser();
    _setSettings = setRes.data || _setDefaultSettings();
    _setDemoMode = false;

    // Record counts for the Backup card — each is best-effort
    const safeCount = p => p.then(r => (r.data || []).length).catch(() => null);
    const [cust, svc, stb, pay, pho] = await Promise.all([
      safeCount(api.getCustomers()), safeCount(api.getServiceBookings()), safeCount(api.getStudioBookings()),
      safeCount(api.getPayments()), safeCount(api.getPhotographers()),
    ]);
    _setCounts = { customers: cust, bookings: (svc || 0) + (stb || 0), payments: pay, photographers: pho };
  } catch (err) {
    // Backend unreachable: editable demo state, saves disabled
    _setUser = api.getUser() || { name: '', email: '', phone: '', address: '', avatar: '' };
    _setSettings = _setDefaultSettings();
    _setCounts = null;
    _setDemoMode = true;
  }
  if (!document.getElementById('settings-loading')) return; // user navigated away
  document.getElementById('settings-loading').classList.add('hidden');
  content.classList.remove('hidden');
  renderSettingsForm();
}

function _setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v === undefined || v === null ? '' : v; }

function renderSettingsForm() {
  const content = document.getElementById('settings-content');
  if (!content || !_setUser || !_setSettings) return;
  const u = _setUser, s = _setSettings, n = s.notifications || {}, p = s.payments || {}, a = s.ai || {};
  const tabs = ['Profile', 'Studio', 'Account', 'Notifications', 'Payments', 'AI Settings', 'Security', 'Backup'];

  content.innerHTML = `
    ${_setDemoMode
      ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to save real changes.</span></div>`
      : ''}
    ${pageHeader('Settings', 'Manage your studio account and preferences')}
    <div class="flex gap-2 mb-8 overflow-x-auto pb-2">${tabs.map((t, i) => `<button class="settings-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i === 0 ? 'bg-primary text-white' : 'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}" onclick="switchSettingsTab(this)">${t}</button>`).join('')}</div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <!-- Profile -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Personal Information</h3>
          <div class="flex items-center gap-5 mb-6">
            <div class="relative">
              <img id="set-img-preview" src="${u.avatar || ''}" class="w-20 h-20 rounded-full object-cover ring-4 ring-accent/20 ${u.avatar ? '' : 'hidden'}" alt="Profile photo" />
              <div id="set-img-placeholder" class="w-20 h-20 rounded-full flex items-center justify-center ring-4 ring-accent/20 ${u.avatar ? 'hidden' : ''}" style="background:#F4E8C1;color:#8a6d1f"><span class="text-xl font-bold">${_setInitials(u.name)}</span></div>
            </div>
            <div>
              <label for="set-image" class="btn-dark px-4 py-2 text-sm cursor-pointer inline-flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> Upload Photo</label>
              <input id="set-image" type="file" accept="image/*" class="hidden" onchange="_setImageSelected()" />
              <input type="hidden" id="set-avatar" value="${u.avatar || ''}" />
              <button type="button" id="set-img-remove" onclick="_setRemoveImage()" class="block text-xs text-error font-medium hover:underline mt-2 ${u.avatar ? '' : 'hidden'}">Remove photo</button>
              <p class="text-xs text-text-secondary mt-2">JPG, PNG, WebP · Max 5MB</p>
              <div id="set-img-error" class="hidden text-xs text-error mt-1"></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="p-name" type="text" value="${u.name || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Email</label><input id="p-email" type="email" value="${u.email || ''}" readonly class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-surface text-text-secondary outline-none" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input id="p-phone" type="tel" value="${u.phone || ''}" placeholder="+94 77 123 4567" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="p-address" type="text" value="${u.address || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
          </div>
          <p class="text-xs text-text-secondary mt-3">Email is your login identity and cannot be changed here.</p>
        </div>
        <!-- Studio -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Studio Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio Name</label><input id="st-name" type="text" value="${s.studioName || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Website</label><input id="st-website" type="url" value="${s.website || ''}" placeholder="https://example.com" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="st-address" type="text" value="${s.address || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="st-desc" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none">${s.description || ''}</textarea></div>
          </div>
        </div>
        <!-- Notification preferences -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Notification Preferences</h3>
          <div class="space-y-4">
            ${_SET_NOTIF_KEYS.map(([key, label]) => `
            <div class="flex items-center justify-between">
              <span class="text-sm">${label}</span>
              <label class="relative inline-flex items-center cursor-pointer"><input id="nt-${key}" type="checkbox" ${n[key] ? 'checked' : ''} class="sr-only peer" /><div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div></label>
            </div>`).join('')}
          </div>
        </div>
        <!-- Payments -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Payments & Invoices</h3>
          <div class="grid grid-cols-3 gap-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Currency</label><input id="pay-currency" type="text" value="${p.currency || 'Rs.'}" maxlength="10" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Invoice Prefix</label><input id="pay-prefix" type="text" value="${p.invoicePrefix || 'INV-'}" maxlength="10" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Due Days</label><input id="pay-due" type="number" min="0" max="365" value="${p.dueDays !== undefined ? p.dueDays : 14}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
          </div>
        </div>
        <div class="flex gap-3"><button onclick="saveSettingsForm()" class="btn-gold px-8 py-3 text-sm">Save Changes</button><button onclick="renderSettingsForm()" class="btn-ghost px-6 py-3 text-sm">Reset</button></div>
      </div>
      <div class="space-y-6">
        <!-- Security -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Security</h3>
          <div class="space-y-3">
            <button onclick="openChangePasswordModal()" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition text-left"><i data-lucide="lock" class="w-5 h-5 text-text-secondary"></i><div><p class="text-sm font-medium">Change Password</p><p class="text-xs text-text-secondary">Keep your account secure</p></div></button>
            <div class="w-full flex items-center gap-3 p-3 text-left"><i data-lucide="monitor" class="w-5 h-5 text-text-secondary"></i><div><p class="text-sm font-medium">Active Sessions</p><p class="text-xs text-text-secondary">This device — current session</p></div></div>
          </div>
        </div>
        <!-- AI Settings -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">AI Settings</h3>
          <div class="space-y-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Default Enhancement Level</label><select id="ai-level" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none">${['Medium', 'Low', 'High'].map(o => `<option ${a.enhancementLevel === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
            <div class="flex items-center justify-between"><label class="text-sm font-medium text-text-secondary" for="ai-autosave">Auto-save AI Edits</label><label class="relative inline-flex items-center cursor-pointer"><input id="ai-autosave" type="checkbox" ${a.autoSaveEdits ? 'checked' : ''} class="sr-only peer" /><div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div></label></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Output Format</label><select id="ai-format" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none">${['JPEG (High Quality)', 'PNG', 'TIFF'].map(o => `<option ${a.outputFormat === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          </div>
        </div>
        <!-- Backup -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Backup & Data</h3>
          <div class="space-y-2 text-sm mb-4">
            <div class="flex justify-between"><span class="text-text-secondary">Clients</span><span class="font-semibold">${_setCounts && _setCounts.customers !== null ? _setCounts.customers : '—'}</span></div>
            <div class="flex justify-between"><span class="text-text-secondary">Bookings</span><span class="font-semibold">${_setCounts && _setCounts.bookings ? _setCounts.bookings : '—'}</span></div>
            <div class="flex justify-between"><span class="text-text-secondary">Payments</span><span class="font-semibold">${_setCounts && _setCounts.payments !== null ? _setCounts.payments : '—'}</span></div>
            <div class="flex justify-between"><span class="text-text-secondary">Photographers</span><span class="font-semibold">${_setCounts && _setCounts.photographers !== null ? _setCounts.photographers : '—'}</span></div>
          </div>
          <button onclick="downloadSettingsBackup()" class="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="cloud-upload" class="w-4 h-4"></i> Download Settings Backup</button>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}

function switchSettingsTab(el) {
  document.querySelectorAll('.settings-tab').forEach(t => t.className = t.className.replace(/bg-primary text-white/g, 'bg-white border border-border-light text-text-secondary hover:bg-hover-light'));
  el.className = el.className.replace(/bg-white border border-border-light text-text-secondary hover:bg-hover-light/g, 'bg-primary text-white');
}

// ── Avatar uploader (same compressed-data-URL approach as the photographer page) ──
function _setInitials(name) {
  return (name || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function _setCompressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const max = 400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
    img.src = url;
  });
}

function _setRefreshPreview() {
  const val = ((document.getElementById('set-avatar') || {}).value || '').trim();
  const img = document.getElementById('set-img-preview');
  const ph = document.getElementById('set-img-placeholder');
  const rm = document.getElementById('set-img-remove');
  if (img) { if (val) { img.src = val; img.classList.remove('hidden'); } else { img.classList.add('hidden'); } }
  if (ph) ph.classList.toggle('hidden', !!val);
  if (rm) rm.classList.toggle('hidden', !val);
}

async function _setImageSelected() {
  const input = document.getElementById('set-image');
  const errEl = document.getElementById('set-img-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (!file.type || file.type.indexOf('image/') !== 0) {
    if (errEl) { errEl.textContent = 'Please choose an image file (JPG, PNG, WebP...).'; errEl.classList.remove('hidden'); }
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (errEl) { errEl.textContent = 'Image is too large — please choose a file under 5 MB.'; errEl.classList.remove('hidden'); }
    input.value = '';
    return;
  }
  try {
    document.getElementById('set-avatar').value = await _setCompressImage(file);
    _setRefreshPreview();
  } catch (e) {
    if (errEl) { errEl.textContent = 'Could not read that image — try a different file.'; errEl.classList.remove('hidden'); }
    input.value = '';
  }
}

function _setRemoveImage() {
  const hidden = document.getElementById('set-avatar');
  if (hidden) hidden.value = '';
  const input = document.getElementById('set-image');
  if (input) input.value = '';
  _setRefreshPreview();
}

// ── Save: profile via /auth/profile + studio settings via /settings ──
async function saveSettingsForm() {
  if (_setDemoMode) { showToast('Demo mode — start the backend server to save changes.', 'alert-circle'); return; }

  const name = (document.getElementById('p-name').value || '').trim();
  const errs = [];
  if (!name) errs.push('Name is required.');
  else if (name.length < 2 || name.length > 100) errs.push('Name must be between 2 and 100 characters.');
  const dueDays = parseInt(document.getElementById('pay-due').value, 10);
  if (isNaN(dueDays) || dueDays < 0 || dueDays > 365) errs.push('Due days must be between 0 and 365.');
  if (errs.length) { showToast(errs.join(' '), 'alert-circle'); return; }

  const notifications = {};
  _SET_NOTIF_KEYS.forEach(([key]) => {
    const el = document.getElementById('nt-' + key);
    notifications[key] = !!(el && el.checked);
  });

  const profileBody = {
    name,
    phone: (document.getElementById('p-phone').value || '').trim(),
    address: (document.getElementById('p-address').value || '').trim(),
    avatar: (document.getElementById('set-avatar').value || '').trim(),
  };
  const settingsBody = {
    studioName: (document.getElementById('st-name').value || '').trim(),
    website: (document.getElementById('st-website').value || '').trim(),
    address: (document.getElementById('st-address').value || '').trim(),
    description: (document.getElementById('st-desc').value || '').trim(),
    notifications,
    payments: {
      currency: (document.getElementById('pay-currency').value || 'Rs.').trim(),
      invoicePrefix: (document.getElementById('pay-prefix').value || 'INV-').trim(),
      dueDays,
    },
    ai: {
      enhancementLevel: document.getElementById('ai-level').value,
      autoSaveEdits: !!document.getElementById('ai-autosave').checked,
      outputFormat: document.getElementById('ai-format').value,
    },
  };

  try {
    const [profileRes, setRes] = await Promise.all([
      api.updateProfile(profileBody),
      api.updateSettings(settingsBody),
    ]);
    _setUser = profileRes.data || _setUser;
    _setSettings = setRes.data || _setSettings;
    // Keep the stored session user in sync so the sidebar greets the new name
    api.setUser(_setUser);
    const userEls = document.querySelectorAll('#app-shell .text-sm.font-semibold, #app-shell .text-sm.font-medium.truncate');
    userEls.forEach(el2 => { if (el2.closest('.p-4.border-t') || el2.closest('.border-l')) el2.textContent = _setUser.name; });
    showToast('Settings saved successfully!');
    renderSettingsForm();
  } catch (err) {
    showToast(err.message, 'alert-circle');
  }
}

// ── Change Password modal ──
function openChangePasswordModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Change Password</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form onsubmit="handleChangePassword(event)" class="space-y-4">
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Current Password *</label><input id="cp-current" type="password" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">New Password *</label><input id="cp-new" type="password" required minlength="6" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Confirm New Password *</label><input id="cp-confirm" type="password" required minlength="6" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div id="cp-error" class="hidden text-sm text-error"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-gold px-6 py-2.5 text-sm">Update Password</button>
        <button type="button" onclick="closeModal()" class="btn-ghost px-6 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`, 'max-w-md');
}

async function handleChangePassword(e) {
  e.preventDefault();
  if (_setDemoMode) { showToast('Demo mode — start the backend server to change your password.', 'alert-circle'); return; }
  const errEl = document.getElementById('cp-error');
  errEl.classList.add('hidden');
  const current = document.getElementById('cp-current').value;
  const next = document.getElementById('cp-new').value;
  const confirm = document.getElementById('cp-confirm').value;
  if (next !== confirm) {
    errEl.textContent = 'New passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }
  if (next.length < 6) {
    errEl.textContent = 'New password must be at least 6 characters.';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    await api.changePassword(current, next);
    closeModal();
    showToast('Password changed successfully!');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// ── Settings JSON backup download ──
function downloadSettingsBackup() {
  if (!_setSettings) { showToast('Nothing to back up yet.', 'alert-circle'); return; }
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: { name: _setUser.name, email: _setUser.email, phone: _setUser.phone, address: _setUser.address, avatar: _setUser.avatar },
    settings: _setSettings,
    recordCounts: _setCounts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PhotoPro-Settings-Backup_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Settings backup downloaded');
}
