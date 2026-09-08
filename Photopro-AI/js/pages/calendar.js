// Calendar Page
function renderCalendar() {
  const el = document.getElementById('page-content');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const calEvents = {
    9:[{t:'Portrait – Isabella',c:'portrait'}], 10:[{t:'Corporate – James',c:'corporate'}],
    11:[{t:'Portrait – Charlotte',c:'portrait'}], 12:[{t:'Birthday – Emma',c:'birthday'}],
    15:[{t:'Wedding – Sophia',c:'wedding'}], 18:[{t:'Corporate – William',c:'corporate'}],
    20:[{t:'Event – Daniel',c:'other'}], 22:[{t:'Wedding – Olivia',c:'wedding'}],
  };
  let calHtml = '';
  for(let i=0;i<35;i++){
    const day = i < 3 ? '' : (i-2);
    const isToday = day === 9;
    const events = calEvents[day] || [];
    calHtml += `<div class="cal-cell ${isToday?'today':''} ${day>31||day<1?'opacity-30':''}">
      ${day>=1&&day<=31?`<p class="text-xs font-semibold mb-1 ${isToday?'text-accent':'text-text-secondary'}">${day}</p>`:''}
      ${events.map(e=>`<div class="cal-event ${e.c}">${e.t}</div>`).join('')}
    </div>`;
  }
  el.innerHTML = `
    ${pageHeader('Calendar', 'Visual overview of all scheduled sessions', `<div class="flex gap-2"><button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="px-4 py-2 text-sm font-semibold bg-white rounded-xl border border-border-light">August 2026</span><button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="chevron-right" class="w-4 h-4"></i></button><button onclick="openAddBookingModal()" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Add Booking</button></div>`)}
    <div class="flex gap-2 mb-6">
      ${['Monthly','Weekly','Daily'].map((v,i)=>`<button class="px-4 py-2 rounded-xl text-sm font-medium transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${v}</button>`).join('')}
      <div class="flex-1"></div>
      <select class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white"><option>All Photographers</option>${MOCK.team.filter(t=>t.role.includes('Photographer')).map(t=>`<option>${t.name}</option>`).join('')}</select>
      <select class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white"><option>All Events</option><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Portrait</option><option>Event</option></select>
    </div>
    <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-hidden">
      <div class="cal-grid border-b border-border-light">${days.map(d=>`<div class="bg-surface py-3 px-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">${d}</div>`).join('')}</div>
      <div class="cal-grid">${calHtml}</div>
    </div>
    <div class="flex gap-4 mt-4 flex-wrap">
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event wedding inline-block"></span><span class="text-xs text-text-secondary">Wedding</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event birthday inline-block"></span><span class="text-xs text-text-secondary">Birthday</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event corporate inline-block"></span><span class="text-xs text-text-secondary">Corporate</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event portrait inline-block"></span><span class="text-xs text-text-secondary">Portrait</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded cal-event other inline-block"></span><span class="text-xs text-text-secondary">Event</span></div>
    </div>`;
  lucide.createIcons();
}
