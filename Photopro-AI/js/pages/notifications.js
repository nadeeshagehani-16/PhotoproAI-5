// Notifications Page
function renderNotifications() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Notifications', `${MOCK.notifications.filter(n=>!n.read).length} unread notifications`, `<button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="check-check" class="w-4 h-4"></i> Mark all read</button>`)}
    <div class="flex gap-2 mb-6">
      ${['All','Unread','Bookings','Payments','AI','System'].map((s,i)=>`<button class="px-4 py-2 rounded-xl text-sm font-medium transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="space-y-3">
      ${MOCK.notifications.map(n => `
      <div class="bg-white rounded-xl p-5 shadow-card border ${n.read?'border-border-light':'border-accent/30 bg-accent/[0.02]'} flex gap-4 cursor-pointer card-hover" onclick="this.classList.add('border-border-light');this.classList.remove('border-accent/30')">
        <div class="w-10 h-10 rounded-xl ${n.read?'bg-surface':'bg-accent/10'} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${n.icon}" class="w-5 h-5 ${n.read?'text-text-secondary':'text-accent'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-sm ${n.read?'':'text-primary'}">${n.title}</p>
            ${!n.read?'<span class="w-2 h-2 rounded-full bg-accent"></span>':''}
          </div>
          <p class="text-sm text-text-secondary mt-1">${n.message}</p>
          <p class="text-xs text-text-secondary mt-2 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${n.time}</p>
        </div>
        <div class="flex flex-col gap-1">
          <button class="btn-action p-1.5"><i data-lucide="more-horizontal" class="w-4 h-4"></i></button>
          <button class="btn-action p-1.5"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
      </div>`).join('')}
    </div>`;
  lucide.createIcons();
}
