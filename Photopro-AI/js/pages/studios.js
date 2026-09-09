// Studios Page – Full CRUD
let _studiosCache = [];

async function renderStudios() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Studio Management', 'Manage photography studios and spaces', `<button onclick="openAddStudioModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Studio</button>`)}
    <div id="studio-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="studio-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadStudios();
}

async function loadStudios() {
  try {
    const res = await api.getStudios();
    _studiosCache = res.data;
    renderStudiosGrid(_studiosCache);
  } catch (err) {
    _studiosCache = MOCK.studios || [];
    if (_studiosCache.length > 0) {
      renderStudiosGrid(_studiosCache);
      const content = document.getElementById('studio-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('studio-loading').classList.add('hidden');
      const content = document.getElementById('studio-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadStudios()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderStudiosGrid(studios) {
  document.getElementById('studio-loading').classList.add('hidden');
  const content = document.getElementById('studio-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="studios-grid">
      ${studios.map(s => {
        const sid = s._id || s.id;
        const availColor = s.availability==='Available'?'text-success bg-green-50':s.availability==='Booked'?'text-blue-700 bg-blue-50':'text-warning bg-amber-50';
        return `
        <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-hidden card-hover">
          <div class="h-44 bg-gray-100 relative overflow-hidden">
            <img src="${s.image||'https://images.unsplash.com/photo-1554941829-202a0b2403b8?w=400&q=80'}" class="w-full h-full object-cover" alt="${s.name}" onerror="this.style.display='none'" />
            <div class="absolute top-3 right-3"><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${availColor}">${s.availability||'Available'}</span></div>
            ${!s.isActive ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="text-white font-bold text-sm">INACTIVE</span></div>' : ''}
          </div>
          <div class="p-5">
            <h3 class="font-bold text-lg">${s.name}</h3>
            <p class="text-sm text-text-secondary mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>${s.location||'—'}</p>
            <p class="text-xs text-text-secondary mt-2 line-clamp-2">${s.description||''}</p>
            <div class="flex flex-wrap gap-1.5 mt-3">${(s.amenities||[]).map(a=>`<span class="px-2 py-0.5 rounded-md text-xs bg-surface text-text-secondary">${a}</span>`).join('')}</div>
            <div class="flex items-center justify-between mt-4 pt-4 border-t border-border-light">
              <div><span class="text-2xl font-bold">${formatCurrency(s.pricePerHour||0)}</span><span class="text-xs text-text-secondary"> / hr</span></div>
              <div class="text-sm text-text-secondary"><i data-lucide="users" class="w-3.5 h-3.5 inline mr-1"></i>${s.capacity||0} pax</div>
            </div>
            <div class="flex gap-2 mt-4">
              <button onclick="openEditStudioModal('${sid}')" class="btn-dark flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>
              <button onclick="confirmDeleteStudio('${sid}', '${(s.name||'').replace(/'/g,"\\'")}')" class="btn-ghost py-2 px-3"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  lucide.createIcons();
}

// ── Add Studio Modal ──
function openAddStudioModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add Studio</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-studio-form" onsubmit="handleCreateStudio(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio Name *</label><input id="ast-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Studio A – Main" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label><input id="ast-location" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Ground Floor, Building 1" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Capacity</label><input id="ast-capacity" type="number" min="1" value="10" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price/Hour (Rs.) *</label><input id="ast-price" type="number" required min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="5000" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="ast-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Studio description..."></textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Amenities (comma-separated)</label><input id="ast-amenities" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Cyclorama Wall, Natural Light, AC, WiFi" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Image URL</label><input id="ast-image" type="url" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="https://..." /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="ast-availability" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none"><option>Available</option><option>Booked</option><option>Under Maintenance</option></select></div>
        <div class="flex items-end pb-1"><label class="flex items-center gap-2 text-sm cursor-pointer"><input id="ast-active" type="checkbox" checked class="rounded border-border-light text-accent focus:ring-accent" /><span class="font-medium text-text-secondary">Active</span></label></div>
      </div>
      <div id="ast-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ast-submit" class="btn-dark flex-1 py-2.5 text-sm">Add Studio</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreateStudio(e) {
  e.preventDefault();
  const errEl = document.getElementById('ast-error');
  const btn = document.getElementById('ast-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const amenities = document.getElementById('ast-amenities').value.split(',').map(s=>s.trim()).filter(Boolean);
    await api.createStudio({
      name: document.getElementById('ast-name').value.trim(),
      location: document.getElementById('ast-location').value.trim(),
      capacity: parseInt(document.getElementById('ast-capacity').value) || 10,
      pricePerHour: parseFloat(document.getElementById('ast-price').value),
      description: document.getElementById('ast-description').value.trim(),
      amenities,
      image: document.getElementById('ast-image').value.trim(),
      availability: document.getElementById('ast-availability').value,
      isActive: document.getElementById('ast-active').checked,
    });
    closeModal(); showToast('Studio added!'); await loadStudios();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Add Studio';
  }
}

// ── Edit Studio Modal ──
function openEditStudioModal(id) {
  const s = _studiosCache.find(x => (x._id||x.id) == id);
  if (!s) return;
  const esc = (v) => (v||'').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Studio</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-studio-form" onsubmit="handleUpdateStudio(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio Name *</label><input id="est-name" type="text" required value="${esc(s.name)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Location *</label><input id="est-location" type="text" required value="${esc(s.location)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Capacity</label><input id="est-capacity" type="number" min="1" value="${s.capacity||10}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price/Hour (Rs.) *</label><input id="est-price" type="number" required min="0" value="${s.pricePerHour||0}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="est-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${esc(s.description)}</textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Amenities (comma-separated)</label><input id="est-amenities" type="text" value="${esc((s.amenities||[]).join(', '))}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Image URL</label><input id="est-image" type="url" value="${esc(s.image)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Availability</label><select id="est-availability" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white focus:ring-2 focus:ring-accent/20 outline-none">
          ${['Available','Booked','Under Maintenance'].map(a=>`<option ${s.availability===a?'selected':''}>${a}</option>`).join('')}
        </select></div>
        <div class="flex items-end pb-1"><label class="flex items-center gap-2 text-sm cursor-pointer"><input id="est-active" type="checkbox" ${s.isActive!==false?'checked':''} class="rounded border-border-light text-accent focus:ring-accent" /><span class="font-medium text-text-secondary">Active</span></label></div>
      </div>
      <div id="est-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="est-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdateStudio(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('est-error');
  const btn = document.getElementById('est-submit');
  errEl.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const amenities = document.getElementById('est-amenities').value.split(',').map(s=>s.trim()).filter(Boolean);
    await api.updateStudio(id, {
      name: document.getElementById('est-name').value.trim(),
      location: document.getElementById('est-location').value.trim(),
      capacity: parseInt(document.getElementById('est-capacity').value) || 10,
      pricePerHour: parseFloat(document.getElementById('est-price').value),
      description: document.getElementById('est-description').value.trim(),
      amenities,
      image: document.getElementById('est-image').value.trim(),
      availability: document.getElementById('est-availability').value,
      isActive: document.getElementById('est-active').checked,
    });
    closeModal(); showToast('Studio updated!'); await loadStudios();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Studio ──
function confirmDeleteStudio(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Studio?</h2>
    <p class="text-text-secondary text-sm mb-6">Delete <strong>${name}</strong>? All associated bookings will be affected.</p>
    <div id="dst-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeleteStudio('${id}')" id="dst-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeleteStudio(id) {
  const btn = document.getElementById('dst-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deleteStudio(id);
    closeModal(); showToast('Studio deleted!'); await loadStudios();
  } catch (err) {
    document.getElementById('dst-error').textContent = err.message;
    document.getElementById('dst-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}
