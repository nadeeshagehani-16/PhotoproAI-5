// Photographers / Team Management Page – Full CRUD
let _photographersCache = [];

// ── Validation Helpers ──
function _validatePhotographerForm(data) {
  const errors = [];
  if (!data.name) errors.push('Full name is required.');
  if (!data.email) {
    errors.push('Email is required.');
  } else {
    // Reject special chars like # $ % ^ & * ; standard email format check
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address (e.g. name@example.com).');
    }
  }
  if (!data.specialization) errors.push('Specialization is required.');
  if (data.phone) {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
      errors.push('Please enter a valid phone number (7-15 digits).');
    }
  }
  return errors;
}

function _showPhErrors(errEl, errors, btn, btnText) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false; btn.textContent = btnText;
}

async function renderTeam() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Photographer Management', 'Manage your photography studio team', `<button onclick="openAddPhotographerModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Add Photographer</button>`)}
    <div id="team-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="team-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadPhotographers();
}

async function loadPhotographers() {
  try {
    const res = await api.getPhotographers();
    _photographersCache = res.data;
    renderTeamGrid(_photographersCache);
  } catch (err) {
    _photographersCache = MOCK.photographers || [];
    if (_photographersCache.length > 0) {
      renderTeamGrid(_photographersCache);
      const content = document.getElementById('team-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('team-loading').classList.add('hidden');
      const content = document.getElementById('team-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadPhotographers()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderTeamGrid(photographers) {
  document.getElementById('team-loading').classList.add('hidden');
  const content = document.getElementById('team-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    ${searchFilter('Search photographers by name, specialization...', ['All Roles','Lead Photographer','Senior Photographer','Photographer','Junior Photographer'], ['All Status','Available','On Assignment','On Leave'])}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="team-grid">
      ${photographers.map(p => {
        const pid = p._id || p.id;
        const availDot = p.availability==='Available'?'bg-success':p.availability==='On Assignment'?'bg-blue-500':p.availability==='On Leave'?'bg-warning':'bg-gray-400';
        return `
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light card-hover text-center">
          <div class="relative inline-block">
            <img src="${p.avatar||'https://i.pravatar.cc/80'}" class="w-20 h-20 rounded-full mx-auto ring-4 ${p.status==='Active'?'ring-green-100':'ring-gray-100'}" alt="${p.name}" />
            <span class="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${availDot}"></span>
          </div>
          <h3 class="font-bold mt-4">${p.name}</h3>
          <p class="text-sm text-accent font-medium">${p.role||'Photographer'}</p>
          <p class="text-xs text-text-secondary mt-1">${p.specialization||''}</p>
          ${p.bio ? `<p class="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-2">${p.bio}</p>` : ''}
          <div class="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border-light text-center">
            <div><p class="text-lg font-bold">${p.projects||0}</p><p class="text-xs text-text-secondary">Projects</p></div>
            <div><p class="text-lg font-bold">${p.rating||'-'}</p><p class="text-xs text-text-secondary">Rating</p></div>
            <div><p class="text-lg font-bold">${p.availability==='Available'?'Free':p.availability==='On Assignment'?'Busy':'Away'}</p><p class="text-xs text-text-secondary">Status</p></div>
          </div>
          <div class="flex gap-2 mt-5">
            <button onclick="openEditPhotographerModal('${pid}')" class="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>
            <button onclick="confirmDeletePhotographer('${pid}', '${(p.name||'').replace(/'/g,"\\'")}')" class="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="trash-2" class="w-3.5 h-3.5 text-error"></i> Delete</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  const searchInput = content.querySelector('input[type="text"]');
  if (searchInput) searchInput.addEventListener('input', () => applyTeamFilters());
  const selects = content.querySelectorAll('select');
  if (selects[0]) selects[0].addEventListener('change', applyTeamFilters);
  if (selects[1]) selects[1].addEventListener('change', applyTeamFilters);
  lucide.createIcons();
}

function applyTeamFilters() {
  const content = document.getElementById('team-content');
  const q = (content.querySelector('input[type="text"]')?.value || '').toLowerCase();
  const selects = content.querySelectorAll('select');
  const role = selects[0]?.value || 'All Roles';
  const avail = selects[1]?.value || 'All Status';
  let filtered = _photographersCache;
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.specialization||'').toLowerCase().includes(q));
  if (role !== 'All Roles') filtered = filtered.filter(p => p.role === role);
  if (avail !== 'All Status') filtered = filtered.filter(p => p.availability === avail);
  document.getElementById('team-grid').innerHTML = filtered.map(p => {
    const pid = p._id || p.id;
    const availDot = p.availability==='Available'?'bg-success':p.availability==='On Assignment'?'bg-blue-500':p.availability==='On Leave'?'bg-warning':'bg-gray-400';
    return `
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light card-hover text-center">
      <div class="relative inline-block">
        <img src="${p.avatar||'https://i.pravatar.cc/80'}" class="w-20 h-20 rounded-full mx-auto ring-4 ${p.status==='Active'?'ring-green-100':'ring-gray-100'}" alt="${p.name}" />
        <span class="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${availDot}"></span>
      </div>
      <h3 class="font-bold mt-4">${p.name}</h3>
      <p class="text-sm text-accent font-medium">${p.role||'Photographer'}</p>
      <p class="text-xs text-text-secondary mt-1">${p.specialization||''}</p>
      ${p.bio ? `<p class="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-2">${p.bio}</p>` : ''}
      <div class="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border-light text-center">
        <div><p class="text-lg font-bold">${p.projects||0}</p><p class="text-xs text-text-secondary">Projects</p></div>
        <div><p class="text-lg font-bold">${p.rating||'-'}</p><p class="text-xs text-text-secondary">Rating</p></div>
        <div><p class="text-lg font-bold">${p.availability==='Available'?'Free':'Away'}</p><p class="text-xs text-text-secondary">Status</p></div>
      </div>
      <div class="flex gap-2 mt-5">
        <button onclick="openEditPhotographerModal('${pid}')" class="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>
        <button onclick="confirmDeletePhotographer('${pid}', '${(p.name||'').replace(/'/g,"\\'")}')" class="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="trash-2" class="w-3.5 h-3.5 text-error"></i> Delete</button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

// ── Add Photographer Modal ──
function openAddPhotographerModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add Photographer</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-ph-form" onsubmit="handleCreatePhotographer(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="aph-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="John Doe" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="aph-email" type="email" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="john@photopro.ai" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input id="aph-phone" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="+94 77 111 2222" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Specialization *</label><select id="aph-spec" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Wedding & Events</option><option>Corporate & Portrait</option><option>Portrait & Lifestyle</option><option>Fashion & Editorial</option><option>Nature & Landscape</option><option>Sports & Action</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Role</label><select id="aph-role" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Photographer</option><option>Junior Photographer</option><option>Senior Photographer</option><option>Lead Photographer</option></select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="aph-avail" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Available</option><option>On Assignment</option><option>On Leave</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Bio</label><textarea id="aph-bio" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Short biography..."></textarea></div>
      <div id="aph-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="aph-submit" class="btn-dark flex-1 py-2.5 text-sm">Add Photographer</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreatePhotographer(e) {
  e.preventDefault();
  const errEl = document.getElementById('aph-error');
  const btn = document.getElementById('aph-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Adding...';

  const formData = {
    name: document.getElementById('aph-name').value.trim(),
    email: document.getElementById('aph-email').value.trim(),
    phone: document.getElementById('aph-phone').value.trim(),
    specialization: document.getElementById('aph-spec').value,
    role: document.getElementById('aph-role').value,
    availability: document.getElementById('aph-avail').value,
    bio: document.getElementById('aph-bio').value.trim(),
  };

  // Frontend validation
  const errors = _validatePhotographerForm(formData);
  if (errors.length > 0) {
    _showPhErrors(errEl, errors, btn, 'Add Photographer');
    return;
  }

  try {
    await api.createPhotographer(formData);
    closeModal(); showToast('Photographer created successfully!'); await loadPhotographers();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Add Photographer';
  }
}

// ── Edit Photographer Modal ──
function openEditPhotographerModal(id) {
  const p = _photographersCache.find(x => (x._id||x.id) == id);
  if (!p) return;
  const esc = (s) => (s||'').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Photographer</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-ph-form" onsubmit="handleUpdatePhotographer(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Full Name *</label><input id="eph-name" type="text" required value="${esc(p.name)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Email *</label><input id="eph-email" type="email" required value="${esc(p.email)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input id="eph-phone" type="text" value="${esc(p.phone)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Specialization *</label><select id="eph-spec" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Wedding & Events','Corporate & Portrait','Portrait & Lifestyle','Fashion & Editorial','Nature & Landscape','Sports & Action'].map(s=>`<option ${p.specialization===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Role</label><select id="eph-role" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Photographer','Junior Photographer','Senior Photographer','Lead Photographer'].map(r=>`<option ${p.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="eph-avail" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Available','On Assignment','On Leave'].map(a=>`<option ${p.availability===a?'selected':''}>${a}</option>`).join('')}
        </select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Bio</label><textarea id="eph-bio" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${esc(p.bio)}</textarea></div>
      <div id="eph-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="eph-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdatePhotographer(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('eph-error');
  const btn = document.getElementById('eph-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';

  const formData = {
    name: document.getElementById('eph-name').value.trim(),
    email: document.getElementById('eph-email').value.trim(),
    phone: document.getElementById('eph-phone').value.trim(),
    specialization: document.getElementById('eph-spec').value,
    role: document.getElementById('eph-role').value,
    availability: document.getElementById('eph-avail').value,
    bio: document.getElementById('eph-bio').value.trim(),
  };

  // Frontend validation
  const errors = _validatePhotographerForm(formData);
  if (errors.length > 0) {
    _showPhErrors(errEl, errors, btn, 'Save Changes');
    return;
  }

  try {
    await api.updatePhotographer(id, formData);
    closeModal(); showToast('Photographer updated successfully!'); await loadPhotographers();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Photographer ──
function confirmDeletePhotographer(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Remove Photographer?</h2>
    <p class="text-text-secondary text-sm mb-6">Remove <strong>${name}</strong> from the team? Active bookings assigned to this photographer will need reassignment.</p>
    <div id="dph-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeletePhotographer('${id}')" id="dph-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Remove</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeletePhotographer(id) {
  const btn = document.getElementById('dph-confirm');
  btn.disabled = true; btn.textContent = 'Removing...';
  try {
    await api.deletePhotographer(id);
    closeModal(); showToast('Photographer deleted successfully!'); await loadPhotographers();
  } catch (err) {
    document.getElementById('dph-error').textContent = err.message;
    document.getElementById('dph-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Remove';
  }
}
