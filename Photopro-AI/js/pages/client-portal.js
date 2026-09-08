// Client Portal Page
function renderClientPortal() {
  const el = document.getElementById('page-content');
  const client = MOCK.clients[0];
  const bookings = MOCK.bookings.filter(b=>b.clientId===client.id);
  el.innerHTML = `
    <div class="bg-gradient-to-r from-primary via-gray-800 to-primary rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10"><img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=60" class="w-full h-full object-cover" /></div>
      <div class="relative z-10 flex flex-col sm:flex-row items-center gap-6">
        <img src="${client.avatar}" class="w-20 h-20 rounded-full ring-4 ring-accent/40" />
        <div class="text-center sm:text-left">
          <h1 class="text-2xl lg:text-3xl font-bold">Welcome back, ${client.name.split(' ')[0]}!</h1>
          <p class="text-white/70 mt-1">Your photography client portal</p>
        </div>
        <div class="sm:ml-auto flex gap-3">
          <button class="bg-accent text-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent-dark transition">Contact Photographer</button>
        </div>
      </div>
    </div>
    <!-- Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${client.bookings}</p><p class="text-sm text-text-secondary">Total Bookings</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">2</p><p class="text-sm text-text-secondary">Upcoming</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">${formatCurrency(client.spent)}</p><p class="text-sm text-text-secondary">Total Invested</p></div>
      <div class="bg-white rounded-xl p-5 shadow-card border border-border-light text-center"><p class="text-2xl font-bold">48</p><p class="text-sm text-text-secondary">Photos Delivered</p></div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Upcoming Bookings -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-4">Your Bookings</h3>
        <div class="space-y-3">${bookings.slice(0,4).map(b=>`
          <div class="flex items-center gap-4 p-4 rounded-xl border border-border-light hover:border-accent/30 transition cursor-pointer">
            <div class="w-12 h-12 rounded-xl ${b.status==='Completed'?'bg-green-50':'bg-accent/10'} flex items-center justify-center flex-shrink-0"><i data-lucide="camera" class="w-5 h-5 ${b.status==='Completed'?'text-green-600':'text-accent'}"></i></div>
            <div class="flex-1 min-w-0"><p class="font-semibold text-sm">${b.event} Photography</p><p class="text-xs text-text-secondary">${b.date} · ${b.start}</p></div>
            ${statusBadge(b.status)}
          </div>`).join('')}
        </div>
      </div>
      <!-- Invoices -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-4">Invoices & Payments</h3>
        <div class="space-y-3">${MOCK.invoices.filter(i=>i.client===client.name).map(inv=>`
          <div class="flex items-center gap-4 p-4 rounded-xl border border-border-light hover:border-accent/30 transition">
            <div class="w-12 h-12 rounded-xl ${inv.status==='Paid'?'bg-green-50':'bg-amber-50'} flex items-center justify-center flex-shrink-0"><i data-lucide="receipt" class="w-5 h-5 ${inv.status==='Paid'?'text-green-600':'text-amber-600'}"></i></div>
            <div class="flex-1"><p class="font-semibold text-sm">${inv.id}</p><p class="text-xs text-text-secondary">Due: ${inv.due}</p></div>
            <div class="text-right"><p class="font-bold text-sm">${formatCurrency(inv.amount)}</p>${statusBadge(inv.status)}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <!-- Gallery -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light mb-6">
      <div class="flex items-center justify-between mb-5"><h3 class="font-bold text-lg">Your Photo Galleries</h3><button class="text-sm text-accent font-semibold">View All</button></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        ${MOCK.gallery.slice(0,4).map(g=>`
        <div class="rounded-xl overflow-hidden cursor-pointer card-hover group relative">
          <img src="${g.src}" class="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
            <div><p class="text-white font-semibold text-sm">${g.title}</p><p class="text-white/70 text-xs">${g.date}</p></div>
          </div>
        </div>`).join('')}
      </div>
      <div class="flex gap-3 mt-5">
        <button class="btn-dark px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Download All Photos</button>
        <button class="btn-ghost px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="thumbs-up" class="w-4 h-4"></i> Approve Selection</button>
        <button class="btn-ghost px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="message-circle" class="w-4 h-4"></i> Leave Feedback</button>
      </div>
    </div>
    <!-- Feedback -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold text-lg mb-4">Leave Feedback</h3>
      <div class="space-y-4">
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Rating</label><div class="flex gap-1">${[1,2,3,4,5].map(s=>`<button class="p-1 hover:scale-110 transition"><i data-lucide="star" class="w-6 h-6 ${s<=5?'text-accent fill-accent':'text-border-light'}"></i></button>`).join('')}</div></div>
        <div><label class="block text-sm font-medium text-text-secondary mb-1">Your feedback</label><textarea rows="4" class="w-full px-4 py-3 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" placeholder="Tell us about your experience..."></textarea></div>
        <button onclick="showToast('Thank you for your feedback!')" class="btn-gold px-6 py-2.5 text-sm">Submit Feedback</button>
      </div>
    </div>`;
  lucide.createIcons();
}
