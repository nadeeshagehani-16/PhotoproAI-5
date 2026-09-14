// Bookings Page
function renderBookings() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Bookings', 'Manage all photography sessions and events', `<button onclick="openAddBookingModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Booking</button>`)}
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${['All','Confirmed','Pending','In Progress','Completed','Cancelled'].map((s,i) => `<button class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${s}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table"><thead><tr><th>ID</th><th>Client</th><th>Event</th><th>Date & Time</th><th>Location</th><th>Photographer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${MOCK.bookings.map(b => `<tr>
        <td class="font-mono text-xs text-text-secondary">#${b.id}</td>
        <td><div class="flex items-center gap-2"><img src="${MOCK.clients.find(c=>c.id===b.clientId)?.avatar||'https://i.pravatar.cc/32'}" class="w-8 h-8 rounded-full" /><span class="font-medium text-sm">${b.client}</span></div></td>
        <td><span class="text-sm">${b.event}</span></td>
        <td><div class="text-sm">${b.date}</div><div class="text-xs text-text-secondary">${b.start} – ${b.end}</div></td>
        <td class="text-sm text-text-secondary max-w-[150px] truncate">${b.location}</td>
        <td class="text-sm">${b.photographer}</td>
        <td class="font-semibold text-sm">${formatCurrency(b.amount)}</td>
        <td>${statusBadge(b.status)}</td>
        <td>${actionBtns('booking-detail')}</td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  lucide.createIcons();
}

function openAddBookingModal() {
  openModal(`<div class="p-6 max-w-3xl">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">New Booking</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Client</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.clients.map(c=>`<option>${c.name}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Event Type</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20"><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Portrait</option><option>Event</option></select></div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Date</label><input type="date" min="${new Date().toISOString().split('T')[0]}" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Start Time</label><input type="time" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">End Time</label><input type="time" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Location</label><input type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" placeholder="Venue name and address" /></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Package</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.packages.map(p=>`<option>${p.name} – ${formatCurrency(p.price)}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Photographer</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20">${MOCK.team.filter(t=>t.role.includes('Photographer')).map(t=>`<option>${t.name}</option>`).join('')}</select></div>
      </div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" placeholder="Special requirements..."></textarea></div>
      <div class="flex gap-3 pt-2"><button onclick="closeModal();showToast('Booking created successfully!')" class="btn-dark flex-1 py-2.5 text-sm">Create Booking</button><button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button></div>
    </div>
  </div>`, 'max-w-3xl');
}

function renderBookingDetail() {
  const b = MOCK.bookings[0];
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <button onclick="navigate('bookings')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Bookings</button>
    ${pageHeader(`Booking #${b.id}`, b.event + ' Photography Session', `<div class="flex gap-2">${statusBadge(b.status)}<button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Edit</button></div>`)}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Booking Details</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div><p class="text-xs text-text-secondary mb-1">Client</p><p class="font-semibold text-sm">${b.client}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Event Type</p><p class="font-semibold text-sm">${b.event}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Date</p><p class="font-semibold text-sm">${b.date}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Time</p><p class="font-semibold text-sm">${b.start} – ${b.end}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Location</p><p class="font-semibold text-sm">${b.location}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Photographer</p><p class="font-semibold text-sm">${b.photographer}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Package</p><p class="font-semibold text-sm">${b.package}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Amount</p><p class="font-bold text-lg text-accent">${formatCurrency(b.amount)}</p></div>
            <div><p class="text-xs text-text-secondary mb-1">Payment</p>${statusBadge(b.payment)}</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Timeline</h3>
          <div class="space-y-4">
            <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-4 h-4 text-green-600"></i></div><div><p class="text-sm font-medium">Booking Created</p><p class="text-xs text-text-secondary">Aug 1, 2026 at 10:00 AM</p></div></div>
            <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-4 h-4 text-green-600"></i></div><div><p class="text-sm font-medium">Payment Received</p><p class="text-xs text-text-secondary">Aug 1, 2026 at 10:05 AM</p></div></div>
            <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-4 h-4 text-green-600"></i></div><div><p class="text-sm font-medium">Confirmed</p><p class="text-xs text-text-secondary">Aug 2, 2026 at 9:00 AM</p></div></div>
            <div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><i data-lucide="clock" class="w-4 h-4 text-amber-600"></i></div><div><p class="text-sm font-medium">Awaiting session</p><p class="text-xs text-text-secondary">Scheduled for ${b.date}</p></div></div>
          </div>
        </div>
      </div>
      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light text-center">
          <img src="${MOCK.clients.find(c=>c.name===b.client)?.avatar}" class="w-16 h-16 rounded-full mx-auto mb-3" />
          <h4 class="font-bold">${b.client}</h4>
          <p class="text-xs text-text-secondary mb-4">Loyal client since 2024</p>
          <button onclick="navigate('client-detail')" class="btn-ghost w-full py-2 text-sm">View Profile</button>
        </div>
        <div class="bg-primary rounded-2xl p-6 text-white">
          <h4 class="font-bold mb-3">Quick Actions</h4>
          <div class="space-y-2">
            <button class="w-full py-2.5 text-sm bg-white/10 rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Send Reminder</button>
            <button class="w-full py-2.5 text-sm bg-white/10 rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Generate Invoice</button>
            <button class="w-full py-2.5 text-sm bg-accent text-primary rounded-xl hover:bg-accent-dark transition flex items-center justify-center gap-2 font-semibold"><i data-lucide="check-circle" class="w-4 h-4"></i> Mark Complete</button>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}
