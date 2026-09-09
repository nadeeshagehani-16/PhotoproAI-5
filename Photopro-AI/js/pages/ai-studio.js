// AI Photo Studio Page
function renderAIStudio() {
  const el = document.getElementById('page-content');
  const tools = [
    {id:'bg-remove',name:'Background Removal',icon:'scissors',desc:'Remove image background automatically'},
    {id:'enhance',name:'Image Enhancement',icon:'sparkles',desc:'Improve quality and sharpness'},
    {id:'denoise',name:'Noise Reduction',icon:'shield',desc:'Remove image noise and grain'},
    {id:'retouch',name:'Face Retouching',icon:'smile',desc:'Natural portrait retouching'},
    {id:'color',name:'Color Correction',icon:'palette',desc:'Auto-correct colors and lighting'},
    {id:'upscale',name:'AI Upscaling',icon:'maximize',desc:'Increase image resolution'},
    {id:'crop',name:'Smart Crop',icon:'crop',desc:'AI-powered composition'},
    {id:'bg-replace',name:'Background Replace',icon:'image-plus',desc:'Replace background with AI'},
  ];
  el.innerHTML = `
    <div class="text-center mb-10">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-semibold mb-4"><i data-lucide="sparkles" class="w-4 h-4"></i> AI-Powered</div>
      <h1 class="text-3xl lg:text-4xl font-bold mb-2">AI Photo Studio</h1>
      <p class="text-text-secondary text-lg max-w-xl mx-auto">Enhance your photos with intelligent AI tools. Professional editing in seconds.</p>
    </div>
    <!-- AI Tools Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
      ${tools.map((t,i) => `<div class="ai-tool ${i===0?'selected':''}" onclick="selectAITool(this,'${t.id}')">
        <div class="w-10 h-10 rounded-xl ${i===0?'bg-accent':'bg-surface'} flex items-center justify-center mx-auto mb-2"><i data-lucide="${t.icon}" class="w-5 h-5 ${i===0?'text-primary':'text-text-secondary'}"></i></div>
        <p class="text-xs font-semibold">${t.name}</p>
      </div>`).join('')}
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Main editing area -->
      <div class="xl:col-span-2 space-y-6">
        <!-- Upload area -->
        <div id="ai-upload-area" class="drop-zone">
          <i data-lucide="upload-cloud" class="w-16 h-16  mx-auto mb-4"></i>
          <p class="font-semibold text-lg mb-1">Drag & Drop your photo here</p>
          <p class="text-text-secondary text-sm mb-4">Supports JPG, PNG, RAW, TIFF · Max 50MB</p>
          <div class="flex gap-3 justify-center">
            <button onclick="simulateAIUpload()" class="btn-dark px-6 py-2.5 text-sm flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> Upload Image</button>
            <button onclick="simulateAIUpload()" class="btn-ghost px-6 py-2.5 text-sm flex items-center gap-2"><i data-lucide="images" class="w-4 h-4"></i> Choose from Gallery</button>
          </div>
        </div>
        <!-- Before/After comparison (hidden initially) -->
        <div id="ai-editor" class="hidden">
          <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-hidden">
            <div class="p-4 border-b border-border-light flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full">BEFORE</span>
                <i data-lucide="arrow-right" class="w-4 h-4 text-text-secondary"></i>
                <span class="text-xs font-semibold px-3 py-1 bg-accent/20 text-accent-dark rounded-full">AI PROCESSING</span>
                <i data-lucide="arrow-right" class="w-4 h-4 text-text-secondary"></i>
                <span class="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">AFTER</span>
              </div>
              <div class="flex gap-2">
                <button class="btn-action p-2" title="Reset"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
                <button class="btn-action p-2" title="Download"><i data-lucide="download" class="w-4 h-4"></i></button>
                <button onclick="showToast('Saved to gallery!')" class="btn-action p-2" title="Save"><i data-lucide="bookmark" class="w-4 h-4"></i></button>
              </div>
            </div>
            <!-- Before/After Slider -->
            <div class="ba-container" id="ba-slider" style="height:450px">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80" alt="Before" class="absolute inset-0" />
              <div class="ba-after" id="ba-after">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=95&sat=1.2" alt="After" class="absolute inset-0" style="filter:brightness(1.08) contrast(1.05) saturate(1.15)" />
              </div>
              <div class="ba-slider" id="ba-handle"></div>
              <div class="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">Before</div>
              <div class="absolute bottom-4 right-4 bg-accent/80 text-primary text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-semibold">AI Enhanced</div>
            </div>
            <!-- Processing Progress -->
            <div class="p-4 bg-surface border-t border-border-light">
              <div class="flex items-center justify-between text-sm mb-2"><span class="font-medium">AI Processing</span><span class="font-semibold text-accent" id="ai-progress-text">87%</span></div>
              <div class="w-full h-2 bg-white rounded-full overflow-hidden"><div class="h-full bg-accent rounded-full transition-all duration-1000" id="ai-progress-bar" style="width:87%"></div></div>
            </div>
            <div class="p-4 flex gap-3">
              <button onclick="showToast('AI enhancement applied!')" class="btn-gold flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="check" class="w-4 h-4"></i> Apply Changes</button>
              <button class="btn-ghost py-2.5 px-4 text-sm flex items-center justify-center gap-2"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reset</button>
              <button onclick="showToast('Image downloaded!')" class="btn-dark py-2.5 px-4 text-sm flex items-center justify-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Download</button>
            </div>
          </div>
        </div>
      </div>
      <!-- AI Assistant Panel -->
      <div class="space-y-6">
        <div class="bg-white rounded-2xl shadow-card border border-border-light overflow-hidden">
          <div class="bg-gradient-to-r from-primary to-gray-800 p-5 text-white">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"><i data-lucide="sparkles" class="w-4 h-4 text-primary"></i></div>
              <h3 class="font-bold">PhotoPro AI Assistant</h3>
            </div>
            <p class="text-white/70 text-sm">Tell me what you want to do with your photo.</p>
          </div>
          <div class="p-4 space-y-2" id="ai-chat">
            <div class="flex gap-2"><div class="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-primary"></i></div><div class="bg-surface rounded-xl rounded-tl-sm p-3 text-sm max-w-[90%]">Hi! I can help you edit your photos. Try one of these suggestions:</div></div>
            <div class="space-y-2 mt-3">
              ${['Improve lighting','Remove background','Enhance portrait','Fix colors','Make the image sharper'].map(s=>`<button onclick="aiSuggestion('${s}')" class="w-full text-left px-3 py-2 rounded-xl border border-border-light text-sm hover:border-accent hover:bg-accent/5 transition flex items-center gap-2"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-accent"></i>${s}</button>`).join('')}
            </div>
          </div>
          <div class="p-4 border-t border-border-light">
            <div class="flex gap-2"><input type="text" placeholder="Describe what you want..." class="flex-1 px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /><button onclick="showToast('AI is processing...')" class="btn-gold p-2.5"><i data-lucide="send" class="w-4 h-4"></i></button></div>
          </div>
        </div>
        <!-- Recent AI edits -->
        <div class="bg-white rounded-2xl p-5 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Recent AI Edits</h3>
          <div class="space-y-3">
            ${[{t:'Wedding photo enhanced',time:'2 hours ago',tool:'Enhancement'},{t:'Background removed – Portrait',time:'5 hours ago',tool:'BG Removal'},{t:'Batch color correction (24 photos)',time:'1 day ago',tool:'Color Correction'}].map(r=>`
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition">
              <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><i data-lucide="sparkles" class="w-4 h-4 text-accent"></i></div>
              <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${r.t}</p><p class="text-xs text-text-secondary">${r.tool} · ${r.time}</p></div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
  initBeforeAfterSlider();
}

function selectAITool(el, id) {
  document.querySelectorAll('.ai-tool').forEach(t => { t.classList.remove('selected'); t.querySelector('.w-10').classList.replace('bg-accent','bg-surface'); t.querySelector('i').classList.replace('text-primary','text-text-secondary'); });
  el.classList.add('selected');
  el.querySelector('.w-10').classList.replace('bg-surface','bg-accent');
  el.querySelector('i').classList.replace('text-text-secondary','text-primary');
}

function simulateAIUpload() {
  document.getElementById('ai-upload-area').classList.add('hidden');
  document.getElementById('ai-editor').classList.remove('hidden');
  // Animate progress
  let p = 0;
  const interval = setInterval(() => {
    p += Math.random() * 15;
    if (p >= 100) { p = 100; clearInterval(interval); showToast('AI processing complete!'); }
    document.getElementById('ai-progress-bar').style.width = p + '%';
    document.getElementById('ai-progress-text').textContent = Math.round(p) + '%';
  }, 300);
  initBeforeAfterSlider();
}

function aiSuggestion(text) {
  const chat = document.getElementById('ai-chat');
  chat.innerHTML += `<div class="flex gap-2 justify-end"><div class="bg-primary text-white rounded-xl rounded-tr-sm p-3 text-sm max-w-[80%]">${text}</div></div>`;
  setTimeout(() => {
    chat.innerHTML += `<div class="flex gap-2"><div class="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-primary"></i></div><div class="bg-surface rounded-xl rounded-tl-sm p-3 text-sm max-w-[90%]">I'll apply <strong>${text.toLowerCase()}</strong> to your photo. Processing now...</div></div>`;
    chat.scrollTop = chat.scrollHeight;
    lucide.createIcons();
  }, 800);
  chat.scrollTop = chat.scrollHeight;
  lucide.createIcons();
}

function initBeforeAfterSlider() {
  const slider = document.getElementById('ba-slider');
  if (!slider) return;
  const handle = document.getElementById('ba-handle');
  const after = document.getElementById('ba-after');
  let isDragging = false;
  const move = (x) => {
    const rect = slider.getBoundingClientRect();
    let pct = ((x - rect.left) / rect.width) * 100;
    pct = Math.max(5, Math.min(95, pct));
    handle.style.left = pct + '%';
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
  };
  slider.addEventListener('mousedown', () => isDragging = true);
  slider.addEventListener('touchstart', () => isDragging = true);
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('touchend', () => isDragging = false);
  slider.addEventListener('mousemove', e => { if (isDragging) move(e.clientX); });
  slider.addEventListener('touchmove', e => { if (isDragging) move(e.touches[0].clientX); });
  slider.addEventListener('click', e => move(e.clientX));
}
