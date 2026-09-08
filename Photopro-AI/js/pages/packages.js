// Packages & Services Page
function renderPackages() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Packages & Services', 'Photography packages and pricing', `<button class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Package</button>`)}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      ${MOCK.packages.map(p => `
      <div class="relative bg-white rounded-2xl shadow-card border ${p.popular?'border-accent ring-2 ring-accent/20':'border-border-light'} overflow-hidden card-hover">
        ${p.popular?'<div class="bg-accent text-primary text-xs font-bold text-center py-1.5 uppercase tracking-wider">Most Popular</div>':''}
        <div class="p-6">
          <h3 class="text-xl font-bold">${p.name}</h3>
          <div class="mt-3 mb-6"><span class="text-4xl font-bold">${formatCurrency(p.price)}</span><span class="text-text-secondary text-sm"> / session</span></div>
          <div class="space-y-3 mb-6">${p.features.map(f=>`<div class="flex items-center gap-2.5 text-sm"><i data-lucide="check" class="w-4 h-4 text-success flex-shrink-0"></i><span>${f}</span></div>`).join('')}</div>
          <div class="flex gap-2">
            <button class="${p.popular?'btn-gold':'btn-dark'} flex-1 py-2.5 text-sm">Book Now</button>
            <button class="btn-ghost p-2.5"><i data-lucide="more-horizontal" class="w-4 h-4"></i></button>
          </div>
        </div>
        <div class="px-6 py-3 bg-surface text-xs text-text-secondary flex items-center gap-4">
          <span><i data-lucide="clock" class="w-3.5 h-3.5 inline mr-1"></i>${p.duration}</span>
          <span><i data-lucide="image" class="w-3.5 h-3.5 inline mr-1"></i>${p.photos} photos</span>
          <span><i data-lucide="users" class="w-3.5 h-3.5 inline mr-1"></i>${p.photographers}</span>
        </div>
      </div>`).join('')}
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
