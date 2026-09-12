// Packages & Services Page – Full CRUD
let _packagesCache = [];

// ── Validation Helper ──
function _validatePackageForm(data) {
  const errors = [];
  if (!data.name) errors.push('Package name is required.');
  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.push('Price is required and must be a valid number.');
  } else if (data.price < 0) {
    errors.push('Price cannot be negative.');
  }
  if (!data.duration) errors.push('Duration is required.');
  if (data.photos < 0 || isNaN(data.photos)) errors.push('Photos count cannot be negative.');
  if (data.photographers < 1 || isNaN(data.photographers)) errors.push('Photographers count must be at least 1.');
  return errors;
}

function _showPkgErrors(errEl, errors, btn, btnText) {
  errEl.innerHTML = errors.map(e => '<div class="flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i><span>' + e + '</span></div>').join('');
  errEl.classList.remove('hidden');
  lucide.createIcons();
  btn.disabled = false; btn.textContent = btnText;
}

async function renderPackages() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Packages & Services', 'Photography packages and pricing', `<button onclick="openAddPackageModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Package</button>`)}
    <div id="packages-loading" class="flex items-center justify-center py-20"><div class="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
    <div id="packages-content" class="hidden"></div>`;
  lucide.createIcons();
  await loadPackages();
}

async function loadPackages() {
  try {
    const res = await api.getPackages();
    _packagesCache = res.data;
    renderPackagesGrid(_packagesCache);
  } catch (err) {
    _packagesCache = MOCK.packages || [];
    if (_packagesCache.length > 0) {
      renderPackagesGrid(_packagesCache);
      const content = document.getElementById('packages-content');
      const banner = document.createElement('div');
      banner.className = 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 flex items-center gap-2';
      banner.innerHTML = '<i data-lucide="info" class="w-4 h-4"></i><span>Showing demo data. Start the backend server to enable live CRUD operations.</span>';
      content.prepend(banner);
      lucide.createIcons();
    } else {
      document.getElementById('packages-loading').classList.add('hidden');
      const content = document.getElementById('packages-content');
      content.classList.remove('hidden');
      content.innerHTML = `<div class="text-center py-16"><i data-lucide="alert-circle" class="w-12 h-12 text-error mx-auto mb-3"></i><p class="text-error font-medium">${err.message}</p><button onclick="loadPackages()" class="btn-dark mt-4 px-6 py-2 text-sm">Retry</button></div>`;
      lucide.createIcons();
    }
  }
}

function renderPackagesGrid(packages) {
  document.getElementById('packages-loading').classList.add('hidden');
  const content = document.getElementById('packages-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      ${packages.map(p => {
        const pid = p._id || p.id;
        return `
        <div class="relative bg-white rounded-2xl shadow-card border ${p.popular?'border-accent ring-2 ring-accent/20':'border-border-light'} overflow-hidden card-hover">
          ${p.popular?'<div class="bg-accent text-primary text-xs font-bold text-center py-1.5 uppercase tracking-wider">Most Popular</div>':''}
          <div class="p-6">
            <h3 class="text-xl font-bold">${p.name}</h3>
            ${p.description ? `<p class="text-sm text-text-secondary mt-1">${p.description}</p>` : ''}
            <div class="mt-3 mb-6"><span class="text-4xl font-bold">${formatCurrency(p.price)}</span><span class="text-text-secondary text-sm"> / session</span></div>
            <div class="space-y-3 mb-6">${(p.features||[]).map(f=>`<div class="flex items-center gap-2.5 text-sm"><i data-lucide="check" class="w-4 h-4 text-success flex-shrink-0"></i><span>${f}</span></div>`).join('')}</div>
            <div class="flex gap-2">
              <button onclick="openEditPackageModal('${pid}')" class="${p.popular?'btn-gold':'btn-dark'} flex-1 py-2.5 text-sm">Edit</button>
              <button onclick="confirmDeletePackage('${pid}', '${(p.name||'').replace(/'/g,"\\'")}')" class="btn-ghost p-2.5"><i data-lucide="trash-2" class="w-4 h-4 text-error"></i></button>
            </div>
          </div>
          <div class="px-6 py-3 bg-surface text-xs text-text-secondary flex items-center gap-4">
            <span><i data-lucide="clock" class="w-3.5 h-3.5 inline mr-1"></i>${p.duration}</span>
            <span><i data-lucide="image" class="w-3.5 h-3.5 inline mr-1"></i>${p.photos} photos</span>
            <span><i data-lucide="users" class="w-3.5 h-3.5 inline mr-1"></i>${p.photographers}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="mt-8 bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold text-lg mb-4">Add-on Services</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${[{name:'Drone Coverage',price:60000,icon:'plane'},{name:'Same-Day Preview',price:45000,icon:'zap'},{name:'Extra Hour',price:30000,icon:'clock'},{name:'Rush Delivery',price:22500,icon:'truck'},{name:'Second Shooter',price:90000,icon:'user-plus'},{name:'Photo Booth',price:75000,icon:'camera'}].map(s=>`
        <div class="flex items-center gap-4 p-4 rounded-xl border border-border-light hover:border-accent/30 transition">
          <div class="w-10 h-10 rounded-xl bg-surface flex items-center justify-center"><i data-lucide="${s.icon}" class="w-5 h-5 text-accent"></i></div>
          <div class="flex-1"><p class="font-semibold text-sm">${s.name}</p><p class="text-xs text-text-secondary">Add-on service</p></div>
          <p class="font-bold text-sm">+${formatCurrency(s.price)}</p>
        </div>`).join('')}
      </div>
    </div>`;
  lucide.createIcons();
}

// ── Add Package Modal ──
function openAddPackageModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add Package</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="add-pkg-form" onsubmit="handleCreatePackage(event)" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package Name *</label><input id="ap-name" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Premium" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price (Rs.) *</label><input id="ap-price" type="number" required min="0" step="1000" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="150000" /></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Duration *</label><input id="ap-duration" type="text" required class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="4 Hours" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photos</label><input id="ap-photos" type="number" min="0" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="250" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographers</label><input id="ap-photographers" type="number" min="1" value="1" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="ap-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Package description..."></textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Features (comma-separated)</label><input id="ap-features" type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="250 Edited Photos, 1 Photographer, Online Gallery" /></div>
      <div class="flex items-center gap-2"><input id="ap-popular" type="checkbox" class="rounded border-border-light text-accent focus:ring-accent" /><label for="ap-popular" class="text-sm font-medium text-text-secondary">Mark as Most Popular</label></div>
      <div id="ap-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ap-submit" class="btn-dark flex-1 py-2.5 text-sm">Add Package</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleCreatePackage(e) {
  e.preventDefault();
  const errEl = document.getElementById('ap-error');
  const btn = document.getElementById('ap-submit');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Creating...';

  const features = document.getElementById('ap-features').value.split(',').map(s => s.trim()).filter(Boolean);
  const formData = {
    name: document.getElementById('ap-name').value.trim(),
    price: parseFloat(document.getElementById('ap-price').value),
    duration: document.getElementById('ap-duration').value.trim(),
    photos: parseInt(document.getElementById('ap-photos').value) || 0,
    photographers: parseInt(document.getElementById('ap-photographers').value) || 1,
    description: document.getElementById('ap-description').value.trim(),
    features,
    popular: document.getElementById('ap-popular').checked,
  };

  // Frontend validation
  const errors = _validatePackageForm(formData);
  if (errors.length > 0) {
    _showPkgErrors(errEl, errors, btn, 'Add Package');
    return;
  }

  try {
    await api.createPackage(formData);
    closeModal();
    showToast('Package created successfully!');
    await loadPackages();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Add Package';
  }
}

// ── Edit Package Modal ──
function openEditPackageModal(id) {
  const p = _packagesCache.find(x => (x._id || x.id) == id);
  if (!p) return;
  const esc = (s) => (s || '').replace(/"/g, '&quot;');
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Edit Package</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form id="edit-pkg-form" onsubmit="handleUpdatePackage(event, '${id}')" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package Name *</label><input id="ep-name" type="text" required value="${esc(p.name)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Price (Rs.) *</label><input id="ep-price" type="number" required min="0" step="1000" value="${p.price}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Duration *</label><input id="ep-duration" type="text" required value="${esc(p.duration)}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photos</label><input id="ep-photos" type="number" min="0" value="${p.photos}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographers</label><input id="ep-photographers" type="number" min="1" value="${p.photographers}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea id="ep-description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none">${esc(p.description)}</textarea></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Features (comma-separated)</label><input id="ep-features" type="text" value="${esc((p.features||[]).join(', '))}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" /></div>
      <div class="flex items-center gap-2"><input id="ep-popular" type="checkbox" class="rounded border-border-light text-accent focus:ring-accent" ${p.popular?'checked':''} /><label for="ep-popular" class="text-sm font-medium text-text-secondary">Mark as Most Popular</label></div>
      <div id="ep-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl"></div>
      <div class="flex gap-3 pt-2">
        <button type="submit" id="ep-submit" class="btn-dark flex-1 py-2.5 text-sm">Save Changes</button>
        <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
      </div>
    </form>
  </div>`);
}

async function handleUpdatePackage(e, id) {
  e.preventDefault();
  const errEl = document.getElementById('ep-error');
  const btn = document.getElementById('ep-submit');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Saving...';

  const features = document.getElementById('ep-features').value.split(',').map(s => s.trim()).filter(Boolean);
  const formData = {
    name: document.getElementById('ep-name').value.trim(),
    price: parseFloat(document.getElementById('ep-price').value),
    duration: document.getElementById('ep-duration').value.trim(),
    photos: parseInt(document.getElementById('ep-photos').value) || 0,
    photographers: parseInt(document.getElementById('ep-photographers').value) || 1,
    description: document.getElementById('ep-description').value.trim(),
    features,
    popular: document.getElementById('ep-popular').checked,
  };

  // Frontend validation
  const errors = _validatePackageForm(formData);
  if (errors.length > 0) {
    _showPkgErrors(errEl, errors, btn, 'Save Changes');
    return;
  }

  try {
    await api.updatePackage(id, formData);
    closeModal();
    showToast('Package updated successfully!');
    await loadPackages();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── Delete Package ──
function confirmDeletePackage(id, name) {
  openModal(`<div class="p-6 max-w-md text-center">
    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><i data-lucide="alert-triangle" class="w-7 h-7 text-error"></i></div>
    <h2 class="text-xl font-bold mb-2">Delete Package?</h2>
    <p class="text-text-secondary text-sm mb-6">Are you sure you want to delete <strong>${name}</strong>? Bookings referencing this package will be affected.</p>
    <div id="dp-error" class="hidden text-sm text-error bg-red-50 p-3 rounded-xl mb-4"></div>
    <div class="flex gap-3">
      <button onclick="handleDeletePackage('${id}')" id="dp-confirm" class="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition">Yes, Delete</button>
      <button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
    </div>
  </div>`);
}

async function handleDeletePackage(id) {
  const btn = document.getElementById('dp-confirm');
  btn.disabled = true; btn.textContent = 'Deleting...';
  try {
    await api.deletePackage(id);
    closeModal();
    showToast('Package deleted successfully!');
    await loadPackages();
  } catch (err) {
    document.getElementById('dp-error').textContent = err.message;
    document.getElementById('dp-error').classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
}
