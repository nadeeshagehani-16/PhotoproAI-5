// Projects Page
function renderProjects() {
  const el = document.getElementById('page-content');
  const stageColors = { 'Booking':'bg-gray-100 text-gray-700','Preparation':'bg-blue-100 text-blue-700','Photoshoot':'bg-amber-100 text-amber-700','Editing':'bg-purple-100 text-purple-700','Client Review':'bg-indigo-100 text-indigo-700','Final Delivery':'bg-teal-100 text-teal-700','Completed':'bg-green-100 text-green-700' };
  el.innerHTML = `
    ${pageHeader('Projects', 'Photography project workspace', `<button class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Project</button>`)}
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Active','Pending','Completed'].map((s,i)=>`<button class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      ${MOCK.projects.map(p => `
      <div class="bg-white rounded-2xl shadow-card border border-border-light p-6 card-hover cursor-pointer" onclick="navigate('project-detail')">
        <div class="flex items-start justify-between mb-4">
          <div><h3 class="font-bold">${p.name}</h3><p class="text-sm text-text-secondary mt-1">${p.client}</p></div>
          ${statusBadge(p.status)}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
          <div><p class="text-xs text-text-secondary">Date</p><p class="font-medium">${p.date}</p></div>
          <div><p class="text-xs text-text-secondary">Photographer</p><p class="font-medium">${p.photographer}</p></div>
          <div><p class="text-xs text-text-secondary">Tasks</p><p class="font-medium">${p.completedTasks}/${p.tasks}</p></div>
          <div><p class="text-xs text-text-secondary">Stage</p><span class="text-xs font-semibold px-2 py-1 rounded-full ${stageColors[p.stage]||'bg-gray-100'}">${p.stage}</span></div>
        </div>
        <div><div class="flex items-center justify-between text-sm mb-2"><span class="text-text-secondary">Progress</span><span class="font-semibold">${p.progress}%</span></div>
          <div class="w-full h-2 bg-surface rounded-full overflow-hidden"><div class="h-full rounded-full ${p.progress>=75?'bg-success':p.progress>=40?'bg-accent':'bg-warning'}" style="width:${p.progress}%"></div></div>
        </div>
      </div>`).join('')}
    </div>`;
  lucide.createIcons();
}

function renderProjectDetail() {
  const p = MOCK.projects[0];
  const stages = ['Booking','Preparation','Photoshoot','Editing','Client Review','Final Delivery','Completed'];
  const currentStageIdx = stages.indexOf(p.stage);
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <button onclick="navigate('projects')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Projects</button>
    ${pageHeader(p.name, `${p.client} · ${p.location}`, `${statusBadge(p.status)}<button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Edit</button>`)}
    <!-- Stages -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light mb-6">
      <h3 class="font-bold mb-4">Project Stages</h3>
      <div class="flex items-center gap-1 overflow-x-auto pb-2">${stages.map((s,i)=>`
        <div class="flex items-center gap-1 flex-shrink-0">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${i<=currentStageIdx?'bg-accent text-primary':'bg-surface text-text-secondary'}">
            <i data-lucide="${i<currentStageIdx?'check-circle':i===currentStageIdx?'circle-dot':'circle'}" class="w-4 h-4"></i>${s}
          </div>
          ${i<stages.length-1?'<i data-lucide="chevron-right" class="w-4 h-4 text-border-light flex-shrink-0"></i>':''}
        </div>`).join('')}
      </div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <div class="flex items-center justify-between mb-4"><h3 class="font-bold">Tasks</h3><button class="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Task</button></div>
          <div class="space-y-3">
            ${[{t:'Confirm venue details',done:true},{t:'Create shot list',done:true},{t:'Equipment preparation',done:true},{t:'Client consultation call',done:false},{t:'Day-of coordination',done:false},{t:'Post-production editing',done:false}].map(task=>`
            <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition">
              <input type="checkbox" ${task.done?'checked':''} class="rounded border-border-light text-accent focus:ring-accent w-4 h-4" />
              <span class="flex-1 text-sm ${task.done?'line-through text-text-secondary':''}">${task.t}</span>
              <span class="text-xs text-text-secondary">${task.done?'Done':'Pending'}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Project Gallery</h3>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">${MOCK.gallery.slice(0,8).map(g=>`<div class="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition"><img src="${g.src}" class="w-full h-full object-cover" alt="" /></div>`).join('')}</div>
        </div>
      </div>
      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Details</h3>
          <div class="space-y-4">
            <div><p class="text-xs text-text-secondary">Client</p><p class="font-semibold text-sm">${p.client}</p></div>
            <div><p class="text-xs text-text-secondary">Photographer</p><p class="font-semibold text-sm">${p.photographer}</p></div>
            <div><p class="text-xs text-text-secondary">Location</p><p class="font-semibold text-sm">${p.location}</p></div>
            <div><p class="text-xs text-text-secondary">Event Date</p><p class="font-semibold text-sm">${p.date}</p></div>
            <div><p class="text-xs text-text-secondary mb-2">Progress</p><div class="w-full h-2 bg-surface rounded-full"><div class="h-full rounded-full bg-accent" style="width:${p.progress}%"></div></div><p class="text-xs text-text-secondary mt-1">${p.progress}% complete</p></div>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Team</h3>
          <div class="space-y-3">${MOCK.team.slice(0,3).map(t=>`<div class="flex items-center gap-3"><img src="${t.avatar}" class="w-8 h-8 rounded-full" /><div><p class="text-sm font-medium">${t.name}</p><p class="text-xs text-text-secondary">${t.role}</p></div></div>`).join('')}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Notes</h3>
          <p class="text-sm text-text-secondary">Client prefers candid shots. Golden hour is a must. Bring backup batteries and extra memory cards.</p>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}
