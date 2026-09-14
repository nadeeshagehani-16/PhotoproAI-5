// User Management Page
let _usersCache = [];

const _USER_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const _USER_PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function _validateUserForm(data) {
  const errors = [];
  if (!data.name || data.name.trim().length < 2) errors.push('Full name is required (min 2 characters).');
  if (!data.email) errors.push('Email is required.');
  else if (!_USER_EMAIL_RE.test(data.email.trim())) errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
  if (data.password !== undefined) {
    if (!data.password) errors.push('Password is required.');
    else if (data.password.length < 6) errors.push('Password must be at least 6 characters.');
  }
  if (data.phone && !_USER_PHONE_RE.test(data.phone.trim())) errors.push('Phone must be 7-15 digits, optionally starting with +.');
  if (data.name && data.name.trim().length > 100) errors.push('Name cannot exceed 100 characters.');
  if (data.address && data.address.trim().length > 200) errors.push('Address cannot exceed 200 characters.');
  return errors;
}

function _showUserErrors(errEl, errors, btn, label) {
  errEl.innerHTML = errors.map(e => `<div class="flex items-start gap-1.5"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i><span>${e}</span></div>`).join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false;
  btn.textContent = label;
}

async function renderUsers() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('User Management', 'Manage studio user accounts and access control', `<button onclick="openAddUserModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Add User</button>`)}
    <div id="users-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="users-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadUsers();
}

async function loadUsers() {
  try {
    const res = await api.getUsers();
    _usersCache = res.data;
    renderUsersTable(_usersCache);
  } catch (err) {
    // Fall back to mock data for demo mode
    _usersCache = MOCK.users || [];
    if (_usersCache.length > 0) {
      renderUsersTable(_usersCache);
      const content = document.getElementById('users-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('users-loading').classList.add('hidden');
      document.getElementById('users-content').classList.remove('hidden');
      document.getElementById('users-content').innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadUsers()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderUsersTable(users) {
  document.getElementById('users-loading').classList.add('hidden');
  const content = document.getElementById('users-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    ${searchFilter('Search users by name, email...', ['All Roles', 'Admin', 'Staff', 'Customer'])}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody id="users-tbody">${users.map(u => userRow(u)).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary">
      <span>Showing ${users.length} user(s)</span>
    </div>`;
  // Wire search
  const searchInput = content.querySelector('input[type="text"]');
  if (searchInput) searchInput.addEventListener('input', () => filterUsers(searchInput.value));
  // Wire role filter
  const roleFilter = content.querySelectorAll('select')[0];
  if (roleFilter) roleFilter.addEventListener('change', () => filterUsersByRole(roleFilter.value));
  lucide.createIcons();
}

function userRow(u) {
  const avatar = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=d30505&color=fff&size=36`;
  const roleBadge = u.role === 'Admin' ? 'bg-red-100 text-red-700' : u.role === 'Staff' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
  const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';
  return `<tr>
    <td><div class="flex items-center gap-3"><img src="${avatar}" class="w-9 h-9 rounded-full object-cover" alt="" /><span class="font-semibold text-sm">${u.name}</span></div></td>
    <td class="text-text-secondary text-sm">${u.email}</td>
    <td class="text-text-secondary text-sm">${u.phone || '—'}</td>
    <td><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadge}">${u.role}</span></td>
    <td>${statusBadge(u.isActive !== false ? 'Active' : 'Inactive')}</td>
    <td class="text-text-secondary text-sm">${created}</td>
    <td><div class="flex items-center gap-1">
      <button onclick="openEditUserModal('${u._id}')" class="btn-action" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
      <button onclick="confirmDeleteUser('${u._id}', '${u.name.replace(/'/g, "\\'")}')" class="btn-action" title="Delete"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
    </div></td>
  </tr>`;
}

function filterUsers(query) {
  const q = query.toLowerCase();
  const filtered = _usersCache.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  document.getElementById('users-tbody').innerHTML = filtered.map(u => userRow(u)).join('');
  lucide.createIcons();
}

function filterUsersByRole(role) {
  const filtered = role === 'All Roles' ? _usersCache : _usersCache.filter(u => u.role === role);
  document.getElementById('users-tbody').innerHTML = filtered.map(u => userRow(u)).join('');
  lucide.createIcons();
}

// ── Add User Modal ──
function openAddUserModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add New User</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-user-form" onsubmit="handleCreateUser(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="au-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="John Doe" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="au-email" type="email" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="john@email.com" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Password *</label><input id="au-password" type="password" required minlength="6" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Min 6 characters" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input id="au-phone" type="tel" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="+94 77 000 0000" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Role *</label><select id="au-role" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option value="Admin">Admin</option><option value="Staff">Staff</option><option value="Customer" selected>Customer</option></select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="au-address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="City, Country" /></div>
      </div>
      <div id="au-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="au-submit" class="btn-dark flex-1 py-2.5 text-sm">Add User</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateUser(e) {
  e.preventDefault();
  const errEl = document.getElementById('au-error');
  const btn = document.getElementById('au-submit');
  errEl.classList.add('hidden');
  const data = {
    name: document.getElementById('au-name').value.trim(),
    email: document.getElementById('au-email').value.trim(),
    password: document.getElementById('au-password').value,
    phone: document.getElementById('au-phone').value.trim(),
    role: document.getElementById('au-role').value,
    address: document.getElementById('au-address').value.trim(),
  };
  const errors = _validateUserForm(data);
  if (errors.length > 0) { _showUserErrors(errEl, errors, btn, 'Add User'); return; }
  btn.disabled = true;
  btn.textContent = 'Creating...';
  try {
    await api.createUser(data);
    closeModal();
    showToast('User created successfully!');
    await loadUsers();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Add User';
  }
}

// ── Edit User Modal ──
function openEditUserModal(id) {
  const u = _usersCache.find(x => x._id === id);
  if (!u) return;
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit User</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-user-form" onsubmit="handleUpdateUser(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="eu-name" type="text" required value="${u.name}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="eu-email" type="email" required value="${u.email}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input id="eu-phone" type="tel" value="${u.phone || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Role *</label><select id="eu-role" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option value="Admin" ${u.role==='Admin'?'selected':''}>Admin</option>
          <option value="Staff" ${u.role==='Staff'?'selected':''}>Staff</option>
          <option value="Customer" ${u.role==='Customer'?'selected':''}>Customer</option>
        </select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input id="eu-address" type="text" value="${u.address || ''}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Status</label><select id="eu-active" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          <option value="true" ${u.isActive !== false ? 'selected' : ''}>Active</option>
          <option value="false" ${u.isActive === false ? 'selected' : ''}>Inactive</option>
        </select></div>
      </div>
      <div id="eu-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="eu-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateUser(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('eu-error');
  const btn = document.getElementById('eu-submit');
  errEl.classList.add('hidden');
  const data = {
    name: document.getElementById('eu-name').value.trim(),
    email: document.getElementById('eu-email').value.trim(),
    phone: document.getElementById('eu-phone').value.trim(),
    role: document.getElementById('eu-role').value,
    address: document.getElementById('eu-address').value.trim(),
    isActive: document.getElementById('eu-active').value === 'true',
  };
  const errors = _validateUserForm(data);
  if (errors.length > 0) { _showUserErrors(errEl, errors, btn, 'Save Changes'); return; }
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    await api.updateUser(id, data);
    closeModal();
    showToast('User updated successfully!');
    await loadUsers();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── Delete User ──
function confirmDeleteUser(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete User?</h2>
    <p class="text-text-secondary text-sm mb-6">Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.</p>
    <div id="du-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteUser('${id}')" id="du-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteUser(id) {
  const errEl = document.getElementById('du-error');
  const btn = document.getElementById('du-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    await api.deleteUser(id);
    closeModal();
    showToast('User deleted successfully!');
    await loadUsers();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Yes, Delete';
  }
}
