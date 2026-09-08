// Photo Gallery Page
function renderGallery() {
  const el = document.getElementById('page-content');
  const albums = ['All','Wedding','Birthday','Portrait','Corporate','Events'];
  el.innerHTML = `
    ${pageHeader('Photo Gallery', 'Browse and manage your photography collection', `<div class="flex gap-2"><button class="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i> Upload Photos</button><button class="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2"><i data-lucide="folder-plus" class="w-4 h-4"></i> New Album</button></div>`)}
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"></i><input type="text" placeholder="Search photos..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
      <div class="flex gap-2 overflow-x-auto">${albums.map((a,i)=>`<button onclick="filterGallery('${a}')" class="gallery-filter px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}">${a}</button>`).join('')}</div>
    </div>
    <!-- Upload drop zone -->
    <div class="drop-zone mb-6 hidden" id="gallery-drop">
      <i data-lucide="upload-cloud" class="w-12 h-12 text-text-secondary mx-auto mb-3"></i>
      <p class="font-semibold text-sm">Drag & Drop your photos here</p>
      <p class="text-xs text-text-secondary mt-1">Supports JPG, PNG, RAW · Max 50MB per file</p>
      <button class="btn-dark px-6 py-2 text-sm mt-4">Browse Files</button>
    </div>
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-text-secondary">${MOCK.gallery.length} photos · 5 albums</p>
      <div class="flex gap-2">
        <button onclick="document.getElementById('gallery-grid').className='gallery-grid'" class="btn-action p-2"><i data-lucide="grid-3x3" class="w-4 h-4"></i></button>
        <button onclick="document.getElementById('gallery-grid').className='gallery-grid masonry'" class="btn-action p-2"><i data-lucide="layout" class="w-4 h-4"></i></button>
      </div>
    </div>
    <div id="gallery-grid" class="gallery-grid">
      ${MOCK.gallery.map(g => `
      <div class="group relative rounded-xl overflow-hidden cursor-pointer card-hover" data-album="${g.album}" onclick="openImagePreview(${g.id})">
        <div class="aspect-[4/3] overflow-hidden"><img src="${g.src}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${g.title}" loading="lazy" /></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <p class="text-white font-semibold text-sm">${g.title}</p>
            <p class="text-white/70 text-xs">${g.album} · ${g.date}</p>
          </div>
          <div class="absolute top-3 right-3 flex gap-1.5">
            <button class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition" onclick="event.stopPropagation()"><i data-lucide="${g.favorite?'heart':'heart'}" class="w-4 h-4 ${g.favorite?'text-red-400 fill-red-400':'text-white'}"></i></button>
            <button class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition" onclick="event.stopPropagation()"><i data-lucide="download" class="w-4 h-4 text-white"></i></button>
            <button class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition" onclick="event.stopPropagation()"><i data-lucide="share-2" class="w-4 h-4 text-white"></i></button>
          </div>
        </div>
        ${g.favorite?'<div class="absolute top-3 left-3"><i data-lucide="heart" class="w-4 h-4 text-red-400 fill-red-400"></i></div>':''}
      </div>`).join('')}
    </div>`;
  lucide.createIcons();
}

function filterGallery(album) {
  document.querySelectorAll('.gallery-filter').forEach(b => { b.className = b.className.replace(/bg-primary text-white/g,'bg-white border border-border-light text-text-secondary hover:bg-hover-light'); });
  event.target.className = event.target.className.replace(/bg-white border border-border-light text-text-secondary hover:bg-hover-light/g,'bg-primary text-white');
  document.querySelectorAll('#gallery-grid > div').forEach(d => {
    d.style.display = (album==='All' || d.dataset.album===album) ? '' : 'none';
  });
}

function openImagePreview(id) {
  const g = MOCK.gallery.find(x=>x.id===id);
  if (!g) return;
  openModal(`<div class="relative">
    <button onclick="closeModal()" class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"><i data-lucide="x" class="w-5 h-5"></i></button>
    <img src="${g.src.replace('w=600','w=1200')}" class="w-full max-h-[70vh] object-contain bg-black rounded-t-2xl" alt="${g.title}" />
    <div class="p-6">
      <div class="flex items-center justify-between">
        <div><h3 class="font-bold text-lg">${g.title}</h3><p class="text-sm text-text-secondary">${g.album} · ${g.date}</p></div>
        <div class="flex gap-2">
          <button class="btn-ghost p-2.5"><i data-lucide="heart" class="w-4 h-4 ${g.favorite?'text-red-400 fill-red-400':''}"></i></button>
          <button class="btn-ghost p-2.5"><i data-lucide="download" class="w-4 h-4"></i></button>
          <button class="btn-ghost p-2.5"><i data-lucide="share-2" class="w-4 h-4"></i></button>
          <button onclick="navigate('ai-studio');closeModal()" class="btn-gold px-4 py-2 text-sm flex items-center gap-2"><i data-lucide="sparkles" class="w-4 h-4"></i> AI Edit</button>
        </div>
      </div>
    </div>
  </div>`, 'max-w-4xl');
}
