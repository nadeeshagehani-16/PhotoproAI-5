// AI Business Insights Page
function renderAIInsights() {
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div class="text-center mb-10">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-semibold mb-4"><i data-lucide="brain" class="w-4 h-4"></i> AI-Powered</div>
      <h1 class="text-3xl lg:text-4xl font-bold mb-2">AI Business Insights</h1>
      <p class="text-text-secondary text-lg max-w-xl mx-auto">Intelligent analytics and recommendations to grow your photography business.</p>
    </div>
    <!-- Insight Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
      ${MOCK.aiInsights.map(ins => `
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light card-hover">
        <div class="flex items-start justify-between mb-4">
          <div class="w-10 h-10 rounded-xl ${ins.color.split(' ')[0]} flex items-center justify-center"><i data-lucide="${ins.icon}" class="w-5 h-5 ${ins.color.split(' ')[1]}"></i></div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full ${ins.color}">${ins.trend}</span>
        </div>
        <h3 class="font-bold text-sm mb-2">${ins.title}</h3>
        <p class="text-xs text-text-secondary leading-relaxed">${ins.detail}</p>
      </div>`).join('')}
    </div>
    <!-- Predictions -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-1">Revenue Prediction</h3>
        <p class="text-sm text-text-secondary mb-4">AI-predicted revenue for the next 6 months</p>
        <div class="chart-container" style="height:250px"><canvas id="predictionChart"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
        <h3 class="font-bold text-lg mb-1">Booking Prediction</h3>
        <p class="text-sm text-text-secondary mb-4">Expected bookings based on seasonal patterns</p>
        <div class="chart-container" style="height:250px"><canvas id="bookingPredChart"></canvas></div>
      </div>
    </div>
    <!-- Recommendations -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light mb-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"><i data-lucide="lightbulb" class="w-5 h-5 text-primary"></i></div>
        <div><h3 class="font-bold text-lg">AI Recommendations</h3><p class="text-sm text-text-secondary">Personalized business growth suggestions</p></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[
          {title:'Introduce a loyalty program',desc:'Based on your repeat client rate of 78%, a loyalty program could increase retention by 15%.',icon:'gift'},
          {title:'Raise weekend pricing by 20%',desc:'Saturday bookings are at 95% capacity. Premium pricing could optimize revenue.',icon:'trending-up'},
          {title:'Launch a referral campaign',desc:'Clients who were referred spend 30% more on average. Incentivize word-of-mouth.',icon:'share-2'},
          {title:'Invest in AI batch editing',desc:'Your editing team spends 12 hours/week on repetitive tasks. AI could save 8 hours.',icon:'sparkles'},
        ].map(r=>`<div class="flex gap-4 p-4 rounded-xl border border-border-light hover:border-accent/30 transition"><div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0"><i data-lucide="${r.icon}" class="w-5 h-5 text-accent"></i></div><div><p class="font-semibold text-sm">${r.title}</p><p class="text-xs text-text-secondary mt-1">${r.desc}</p></div></div>`).join('')}
      </div>
    </div>
    <!-- Customer behavior -->
    <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
      <h3 class="font-bold text-lg mb-4">Customer Behavior Insights</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="text-center p-4 rounded-xl bg-surface"><p class="text-3xl font-bold text-accent">78%</p><p class="text-sm text-text-secondary mt-1">Repeat Rate</p></div>
        <div class="text-center p-4 rounded-xl bg-surface"><p class="text-3xl font-bold text-blue-600">Rs. 162,600</p><p class="text-sm text-text-secondary mt-1">Avg Spend</p></div>
        <div class="text-center p-4 rounded-xl bg-surface"><p class="text-3xl font-bold text-green-600">4.9</p><p class="text-sm text-text-secondary mt-1">Satisfaction</p></div>
        <div class="text-center p-4 rounded-xl bg-surface"><p class="text-3xl font-bold text-purple-600">32</p><p class="text-sm text-text-secondary mt-1">Avg Days Between</p></div>
      </div>
    </div>`;
  lucide.createIcons();
  createChart('predictionChart', { type:'line', data:{ labels:['Sep','Oct','Nov','Dec','Jan','Feb'], datasets:[{label:'Predicted',data:[13200,14500,11800,16000,10500,12000],borderColor:'#D4AF37',backgroundColor:'rgba(212,175,55,0.1)',fill:true,tension:0.4,borderWidth:2,borderDash:[5,5],pointRadius:4,pointBackgroundColor:'#D4AF37'},{label:'Actual',data:[12850,null,null,null,null,null],borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,0.1)',fill:true,tension:0.4,borderWidth:2,pointRadius:5,pointBackgroundColor:'#22C55E'}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,pointStyle:'circle'}}},scales:{y:{ticks:{callback:v=>'$'+v/1000+'k'},grid:{color:'#f3f4f6'}},x:{grid:{display:false}}} } });
  createChart('bookingPredChart', { type:'bar', data:{ labels:['Sep','Oct','Nov','Dec','Jan','Feb'], datasets:[{label:'Predicted Bookings',data:[260,275,230,290,210,240],backgroundColor:'rgba(212,175,55,0.6)',borderRadius:8,borderSkipped:false}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,grid:{color:'#f3f4f6'}},x:{grid:{display:false}}} } });
}
