// Reports & Analytics Page
function renderReports() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    ${pageHeader('Reports & Analytics', 'Comprehensive studio performance metrics', `<div class="flex gap-2"><select class="px-4 py-2 rounded-xl border border-border-light text-sm bg-white"><option>This Month</option><option>This Week</option><option>This Year</option><option>Custom Range</option></select><button class="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Export</button></div>`)}
    ${kpiCards([
      {icon:'trending-up',iconBg:'bg-green-50',iconColor:'text-green-600',value:'Rs. 25,275,000',label:'Total Revenue (YTD)',trend:'+18.5%'},
      {icon:'calendar-days',iconBg:'bg-blue-50',iconColor:'text-blue-600',value:'245',label:'Total Bookings',trend:'+12.5%'},
      {icon:'users',iconBg:'bg-purple-50',iconColor:'text-purple-600',value:'156',label:'Total Clients',trend:'+8.1%'},
      {icon:'star',iconBg:'bg-amber-50',iconColor:'text-amber-600',value:'4.9',label:'Avg Rating',trend:'+0.2'},
    ])}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Monthly Revenue</h3>
        <div class="chart-container" style="height:250px"><canvas id="revenueBarChart"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Booking Growth</h3>
        <div class="chart-container" style="height:250px"><canvas id="bookingGrowthChart"></canvas></div>
      </div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Popular Services</h3>
        <div class="chart-container" style="height:250px"><canvas id="servicesChart"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold mb-4">Photographer Performance</h3>
        <div class="space-y-4">
          ${MOCK.team.filter(t=>t.role.includes('Photographer')).map(p=>`
          <div class="flex items-center gap-4">
            <img src="${p.avatar}" class="w-10 h-10 rounded-full" alt="${p.name}" />
            <div class="flex-1"><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium">${p.name}</span><span class="text-sm font-semibold">${p.projects*8} sessions</span></div><div class="w-full h-2 bg-surface rounded-full"><div class="h-full bg-accent rounded-full" style="width:${p.projects*20}%"></div></div></div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold mb-4">Package Performance</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${MOCK.packages.map(p=>`<div class="p-4 rounded-xl bg-surface text-center"><p class="text-2xl font-bold">${Math.floor(Math.random()*30+10)}</p><p class="text-sm font-medium mt-1">${p.name}</p><p class="text-xs text-text-secondary">${formatCurrency(p.price*(Math.floor(Math.random()*30+10)))} total</p></div>`).join('')}
      </div>
    </div>`;
  lucide.createIcons();
  createChart('revenueBarChart', { type:'bar', data:{ labels:MOCK.revenueData.labels, datasets:[{label:'Revenue',data:MOCK.revenueData.values,backgroundColor:'rgba(212,175,55,0.7)',borderRadius:8,borderSkipped:false}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f3f4f6'},ticks:{callback:v=>'$'+v/1000+'k'}},x:{grid:{display:false}}} } });
  createChart('bookingGrowthChart', { type:'line', data:{ labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], datasets:[{label:'Bookings',data:[180,195,175,210,225,198,230,245],borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,tension:0.4,borderWidth:2,pointRadius:3}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,grid:{color:'#f3f4f6'}},x:{grid:{display:false}}} } });
  createChart('servicesChart', { type:'polarArea', data:{ labels:['Wedding','Portrait','Corporate','Birthday','Event'], datasets:[{data:[35,25,20,12,8],backgroundColor:['rgba(239,68,68,0.7)','rgba(34,197,94,0.7)','rgba(59,130,246,0.7)','rgba(245,158,11,0.7)','rgba(168,85,247,0.7)']}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:15,usePointStyle:true,pointStyle:'circle'}}}} });
}
