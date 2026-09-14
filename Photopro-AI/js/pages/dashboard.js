// Dashboard Page
function renderDashboard() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Dashboard', 'Welcome back, Alex! Here\'s your studio overview.', `<button onclick="navigate('bookings')" class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> New Booking</button>`)}
    ${kpiCards([
      { icon:'calendar-days', iconBg:'bg-amber-50', iconColor:'text-amber-600', value:'245', label:'Total Bookings', trend:'+12.5%' },
      { icon:'camera', iconBg:'bg-blue-50', iconColor:'text-blue-600', value:'18', label:'Upcoming Shoots' },
      { icon:'banknote', iconBg:'bg-green-50', iconColor:'text-green-600', value:'Rs. 3,855,000', label:'Monthly Revenue', trend:'+8.2%' },
      { icon:'clock', iconBg:'bg-red-50', iconColor:'text-red-500', value:'Rs. 972,000', label:'Pending Payments' },
      { icon:'users', iconBg:'bg-purple-50', iconColor:'text-purple-600', value:'156', label:'Active Clients', trend:'+5.1%' },
    ])}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <!-- Revenue Chart -->
      <div class="xl:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-lg">Revenue Overview</h3>
          <div class="flex gap-1 bg-surface rounded-lg p-1">
            <button class="px-3 py-1.5 text-xs font-medium rounded-md bg-white shadow-sm text-primary">Monthly</button>
            <button class="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-primary transition">Weekly</button>
            <button class="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-primary transition">Yearly</button>
          </div>
        </div>
        <div class="chart-container" style="height:280px"><canvas id="revenueChart"></canvas></div>
      </div>
      <!-- Booking Stats -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-6">Booking Statistics</h3>
        <div class="chart-container flex items-center justify-center" style="height:200px"><canvas id="bookingChart"></canvas></div>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-success"></span><span class="text-xs text-text-secondary">Confirmed (12)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-warning"></span><span class="text-xs text-text-secondary">Pending (8)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span><span class="text-xs text-text-secondary">Completed (18)</span></div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-error"></span><span class="text-xs text-text-secondary">Cancelled (2)</span></div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Today's Schedule -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-lg">Today's Schedule</h3>
          <button onclick="navigate('calendar')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
        </div>
        <div class="space-y-4">${MOCK.todaySchedule.map(s => `
          <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition cursor-pointer">
            
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm truncate">${s.client}</p>
              <p class="text-xs text-text-secondary">${s.event} · ${s.location}</p>
            </div>
            <div class="text-right hidden sm:block">
              <p class="text-sm font-medium">${s.time}</p>
              <p class="text-xs text-text-secondary">${s.photographer}</p>
            </div>
            ${statusBadge(s.status)}
          </div>`).join('')}
        </div>
      </div>
      <!-- Recent Clients -->
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-bold text-lg">Recent Clients</h3>
          <button onclick="navigate('clients')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
        </div>
        <div class="space-y-4">${MOCK.clients.slice(0,5).map(c => `
          <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition cursor-pointer" onclick="navigate('client-detail')">
            
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm truncate">${c.name}</p>
              <p class="text-xs text-text-secondary">${c.bookings} bookings · Last: ${c.lastBooking}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold">${formatCurrency(c.spent)}</p>
              ${statusBadge(c.status)}
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <!-- Upcoming Events -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-lg">Upcoming Events</h3>
        <button onclick="navigate('bookings')" class="text-sm text-accent font-semibold hover:text-accent-dark transition">View All</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${MOCK.upcomingEvents.map(e => `
        <div class="card-hover rounded-xl overflow-hidden border border-border-light cursor-pointer" onclick="navigate('booking-detail')">
          <div class="h-36 overflow-hidden"><img src="${e.image}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="${e.title}" /></div>
          <div class="p-4">
            <p class="font-semibold text-sm">${e.title}</p>
            <p class="text-xs text-text-secondary mt-1">${e.client}</p>
            <div class="flex items-center gap-1.5 mt-3 text-xs text-accent font-medium"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>${e.date}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  lucide.createIcons();
  // Revenue chart
  createChart('revenueChart', {
    type:'line',
    data:{ labels:MOCK.revenueData.labels, datasets:[{ label:'Revenue', data:MOCK.revenueData.values, borderColor:'#D4AF37', backgroundColor:'rgba(212,175,55,0.08)', fill:true, tension:0.4, borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#D4AF37', pointBorderColor:'#fff', pointBorderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ y:{ beginAtZero:false, grid:{color:'#f3f4f6'}, ticks:{callback:v=>'$'+v/1000+'k'} }, x:{grid:{display:false}} } }
  });
  // Booking chart
  createChart('bookingChart', {
    type:'doughnut',
    data:{ labels:['Confirmed','Pending','Completed','Cancelled'], datasets:[{ data:[12,8,18,2], backgroundColor:['#22C55E','#F59E0B','#3B82F6','#EF4444'], borderWidth:0, hoverOffset:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{legend:{display:false}} }
  });
}
