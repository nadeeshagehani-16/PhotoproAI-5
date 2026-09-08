// Clients Page
function renderClients() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Clients', 'Manage your photography studio clients', `<button onclick="openAddClientModal()" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Add Client</button>`)}
    ${searchFilter('Search clients by name, email...', ['All Status', 'Active', 'Inactive'])}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Client</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Total Spent</th><th>Last Booking</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${MOCK.clients.map(c => `<tr>
          <td><div class="flex items-center gap-3"><img src="${c.avatar}" class="w-9 h-9 rounded-full object-cover" alt="" /><span class="font-semibold text-sm">${c.name}</span></div></td>
          <td class="text-text-secondary">${c.email}</td><td class="text-text-secondary">${c.phone}</td>
          <td><span class="font-semibold">${c.bookings}</span></td><td class="font-semibold">${formatCurrency(c.spent)}</td>
          <td class="text-text-secondary">${c.lastBooking}</td><td>${statusBadge(c.status)}</td>
          <td>${actionBtns('client-detail', c.id)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4 text-sm text-text-secondary">
      <span>Showing ${MOCK.clients.length} of ${MOCK.clients.length} clients</span>
      <div class="flex gap-1"><button class="px-3 py-1.5 rounded-lg bg-white border border-border-light hover:bg-hover-light">Prev</button><button class="px-3 py-1.5 rounded-lg bg-primary text-white">1</button><button class="px-3 py-1.5 rounded-lg bg-white border border-border-light hover:bg-hover-light">Next</button></div>
    </div>`;
  lucide.createIcons();
}

function openAddClientModal() {
  openModal(`<div class="p-6">
    <div class="flex items-center justify-between mb-6"><h2 class="text-xl font-bold">Add New Client</h2><button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-text-secondary mb-1">First Name</label><input type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="John" /></div><div><label class="block text-sm font-medium text-text-secondary mb-1">Last Name</label><input type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="Doe" /></div></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Email</label><input type="email" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="john@email.com" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input type="tel" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="+1 (555) 000-0000" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input type="text" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" placeholder="123 Main St, City" /></div>
      <div><label class="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none" placeholder="Special requirements..."></textarea></div>
      <div class="flex gap-3 pt-2"><button onclick="closeModal();showToast('Client added successfully!')" class="btn-dark flex-1 py-2.5 text-sm">Add Client</button><button onclick="closeModal()" class="btn-ghost flex-1 py-2.5 text-sm">Cancel</button></div>
    </div>
  </div>`);
}

// Client Detail Page
function renderClientDetail() {
  const c = MOCK.clients[0]; // Show first client as example
  const bookings = MOCK.bookings.filter(b => b.clientId === c.id);
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <button onclick="navigate('clients')" class="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition mb-6"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Clients</button>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Profile Card -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light text-center">
        <img src="${c.avatar}" class="w-24 h-24 rounded-full mx-auto ring-4 ring-accent/20 mb-4" alt="${c.name}" />
        <h2 class="text-xl font-bold">${c.name}</h2>
        <p class="text-text-secondary text-sm mt-1">${c.email}</p>
        ${statusBadge(c.status)}
        <div class="mt-6 space-y-3 text-left">
          <div class="flex items-center gap-3 text-sm"><i data-lucide="phone" class="w-4 h-4 text-text-secondary"></i>${c.phone}</div>
          <div class="flex items-center gap-3 text-sm"><i data-lucide="map-pin" class="w-4 h-4 text-text-secondary"></i>${c.address}</div>
          <div class="flex items-center gap-3 text-sm"><i data-lucide="mail" class="w-4 h-4 text-text-secondary"></i>${c.email}</div>
        </div>
        <div class="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border-light">
          <div><p class="text-xl font-bold">${c.bookings}</p><p class="text-xs text-text-secondary">Bookings</p></div>
          <div><p class="text-xl font-bold">${formatCurrency(c.spent)}</p><p class="text-xs text-text-secondary">Total Spent</p></div>
          <div><p class="text-xl font-bold">4.9</p><p class="text-xs text-text-secondary">Rating</p></div>
        </div>
        <div class="flex gap-2 mt-6">
          <button class="btn-dark flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="calendar-plus" class="w-4 h-4"></i> Book</button>
          <button class="btn-ghost flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="mail" class="w-4 h-4"></i> Email</button>
        </div>
      </div>
      <div class="xl:col-span-2 space-y-6">
        <!-- Notes -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-3">Notes</h3>
          <p class="text-sm text-text-secondary">${c.notes}</p>
        </div>
        <!-- Booking History -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Booking History</h3>
          <div class="table-wrap border-0"><table class="data-table"><thead><tr><th>ID</th><th>Event</th><th>Date</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>${bookings.map(b => `<tr><td class="font-mono text-xs">#${b.id}</td><td>${b.event}</td><td>${b.date}</td><td class="font-semibold">${formatCurrency(b.amount)}</td><td>${statusBadge(b.status)}</td><td>${statusBadge(b.payment)}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <!-- Communication History -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Communication History</h3>
          <div class="space-y-3">
            <div class="flex gap-3 p-3 rounded-xl bg-surface"><div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><i data-lucide="mail" class="w-4 h-4 text-blue-600"></i></div><div><p class="text-sm font-medium">Booking confirmation sent</p><p class="text-xs text-text-secondary">Aug 5, 2026 · Email</p></div></div>
            <div class="flex gap-3 p-3 rounded-xl bg-surface"><div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><i data-lucide="phone" class="w-4 h-4 text-green-600"></i></div><div><p class="text-sm font-medium">Discussed wedding details</p><p class="text-xs text-text-secondary">Aug 3, 2026 · Phone call (15 min)</p></div></div>
            <div class="flex gap-3 p-3 rounded-xl bg-surface"><div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"><i data-lucide="message-circle" class="w-4 h-4 text-purple-600"></i></div><div><p class="text-sm font-medium">Gallery link shared</p><p class="text-xs text-text-secondary">Jul 28, 2026 · SMS</p></div></div>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}
