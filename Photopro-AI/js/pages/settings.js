// Settings Page
function renderSettings() {
  const el = document.getElementById('page-content');
  const tabs = ['Profile','Studio','Account','Notifications','Payments','AI Settings','Security','Backup'];
  el.innerHTML = `
    ${pageHeader('Settings', 'Manage your studio account and preferences')}
    <div class="flex gap-2 mb-8 overflow-x-auto pb-2">${tabs.map((t,i)=>`<button class="settings-tab px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${i===0?'bg-primary text-white':'bg-white border border-border-light text-text-secondary hover:bg-hover-light'}" onclick="switchSettingsTab(this)">${t}</button>`).join('')}</div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <!-- Profile -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Personal Information</h3>
          <div class="flex items-center gap-5 mb-6">
            <img src="https://i.pravatar.cc/80?img=12" class="w-20 h-20 rounded-full ring-4 ring-accent/20" />
            <div><button class="btn-dark px-4 py-2 text-sm">Change Photo</button><p class="text-xs text-text-secondary mt-2">JPG, PNG · Max 5MB</p></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">First Name</label><input type="text" value="Alex" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Last Name</label><input type="text" value="Morgan" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Email</label><input type="email" value="alex@photopro.ai" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Phone</label><input type="tel" value="+1 (555) 123-4567" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
          </div>
        </div>
        <!-- Studio -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Studio Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Studio Name</label><input type="text" value="DMP CAMERA RENT" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Website</label><input type="url" value="https://lumiere.studio" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-text-secondary mb-1">Address</label><input type="text" value="142 Sunset Blvd, Los Angeles, CA 90028" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-text-secondary mb-1">Description</label><textarea rows="3" class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none">Award-winning photography studio specializing in weddings, portraits, and corporate events. Serving Los Angeles since 2018.</textarea></div>
          </div>
        </div>
        <!-- Notification preferences -->
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold text-lg mb-5">Notification Preferences</h3>
          <div class="space-y-4">
            ${['New bookings','Payment received','Payment overdue','Client messages','Project updates','AI processing complete','Team notifications','Marketing emails'].map((n,i)=>`
            <div class="flex items-center justify-between">
              <span class="text-sm">${n}</span>
              <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${i<6?'checked':''} class="sr-only peer" /><div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div></label>
            </div>`).join('')}
          </div>
        </div>
        <div class="flex gap-3"><button onclick="showToast('Settings saved successfully!')" class="btn-gold px-8 py-3 text-sm">Save Changes</button><button class="btn-ghost px-6 py-3 text-sm">Reset</button></div>
      </div>
      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Security</h3>
          <div class="space-y-3">
            <button class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition text-left"><i data-lucide="lock" class="w-5 h-5 text-text-secondary"></i><div><p class="text-sm font-medium">Change Password</p><p class="text-xs text-text-secondary">Last changed 30 days ago</p></div></button>
            <button class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition text-left"><i data-lucide="shield" class="w-5 h-5 text-text-secondary"></i><div><p class="text-sm font-medium">Two-Factor Auth</p><p class="text-xs text-text-secondary text-success">Enabled</p></div></button>
            <button class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition text-left"><i data-lucide="key" class="w-5 h-5 text-text-secondary"></i><div><p class="text-sm font-medium">Active Sessions</p><p class="text-xs text-text-secondary">2 devices</p></div></button>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">AI Settings</h3>
          <div class="space-y-4">
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Default Enhancement Level</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none"><option>Medium</option><option>Low</option><option>High</option></select></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Auto-save AI Edits</label><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked class="sr-only peer" /><div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div></label></div>
            <div><label class="block text-sm font-medium text-text-secondary mb-1">Output Format</label><select class="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white outline-none"><option>JPEG (High Quality)</option><option>PNG</option><option>TIFF</option></select></div>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-card border border-border-light">
          <h3 class="font-bold mb-4">Backup & Storage</h3>
          <div class="mb-4"><div class="flex items-center justify-between text-sm mb-2"><span class="text-text-secondary">Storage used</span><span class="font-semibold">45.2 GB / 100 GB</span></div><div class="w-full h-2 bg-surface rounded-full"><div class="h-full bg-accent rounded-full" style="width:45%"></div></div></div>
          <button class="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2"><i data-lucide="cloud-upload" class="w-4 h-4"></i> Backup Now</button>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}

function switchSettingsTab(el) {
  document.querySelectorAll('.settings-tab').forEach(t => t.className = t.className.replace(/bg-primary text-white/g,'bg-white border border-border-light text-text-secondary hover:bg-hover-light'));
  el.className = el.className.replace(/bg-white border border-border-light text-text-secondary hover:bg-hover-light/g,'bg-primary text-white');
}
