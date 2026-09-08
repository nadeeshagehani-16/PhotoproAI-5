// Team Management Page
function renderTeam() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Team Management', 'Your photography studio team', `<button class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Add Member</button>`)}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      ${MOCK.team.map(t => `
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light card-hover text-center">
        <div class="relative inline-block">
          <img src="${t.avatar}" class="w-20 h-20 rounded-full mx-auto ring-4 ${t.status==='Active'?'ring-green-100':'ring-gray-100'}" alt="${t.name}" />
          <span class="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${t.availability==='Available'?'bg-success':t.availability==='On Assignment'?'bg-blue-500':t.availability==='Busy'?'bg-warning':'bg-gray-400'}"></span>
        </div>
        <h3 class="font-bold mt-4">${t.name}</h3>
        <p class="text-sm text-accent font-medium">${t.role}</p>
        <p class="text-xs text-text-secondary mt-1">${t.specialization}</p>
        <div class="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border-light text-center">
          <div><p class="text-lg font-bold">${t.projects}</p><p class="text-xs text-text-secondary">Projects</p></div>
          <div><p class="text-lg font-bold">${t.availability==='Available'?'Free':t.availability==='Busy'?'Busy':'Away'}</p><p class="text-xs text-text-secondary">Status</p></div>
          <div><p class="text-lg font-bold">${t.status==='Active'?'Yes':'No'}</p><p class="text-xs text-text-secondary">Active</p></div>
        </div>
        <div class="flex gap-2 mt-5">
          <button class="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="mail" class="w-3.5 h-3.5"></i> Email</button>
          <button class="btn-dark flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Schedule</button>
        </div>
      </div>`).join('')}
    </div>`;
  lucide.createIcons();
}
