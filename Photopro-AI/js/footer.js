// PhotoPro AI – Reusable Footer Component
// ADDED BY TEAM - Footer: single shared footer (brand, tagline, nav links, copyright) that is
// mounted once into the app shell (bottom of the main content column, so it sits right of the
// sidebar) and once into the auth screen. Purely presentational: it reuses the existing
// navigate()/openModal() helpers and contains no business logic.

// ADDED BY TEAM - Footer: link registry (label uses HTML entities, rendered inside the footer nav)
const FOOTER_LINKS = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'Contact' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms &amp; Conditions' }
];

// ADDED BY TEAM - Footer: content shown in the existing app modal for the informational links
const FOOTER_MODAL_CONTENT = {
  about: {
    icon: 'info',
    title: 'About PhotoPro AI',
    body:
      '<p>PhotoPro AI is a smart photography studio management system that brings clients, bookings, equipment, galleries, payments and analytics together in one place.</p>' +
      '<p>Built for professional studios, it combines everyday operations with AI-powered insights so teams can spend less time on admin and more time capturing great moments.</p>'
  },
  contact: {
    icon: 'mail',
    title: 'Contact Us',
    body:
      '<p>Questions, feedback or support? We would love to hear from you.</p>' +
      '<p>Email: <span class="font-semibold text-text-primary">hello@photopro.ai</span></p>' +
      '<p>Support hours: Monday to Friday, 9:00 AM &ndash; 6:00 PM.</p>'
  },
  privacy: {
    icon: 'shield-check',
    title: 'Privacy Policy',
    body:
      '<p>PhotoPro AI stores only the information needed to run your studio: account details, clients, bookings, payments and related records.</p>' +
      '<p>Your data is used solely to operate the service and is never sold to third parties.</p>' +
      '<p>You may request correction or deletion of your studio data at any time by contacting support.</p>'
  },
  terms: {
    icon: 'file-text',
    title: 'Terms &amp; Conditions',
    body:
      '<p>PhotoPro AI is provided for managing photography studio operations. Content and data entered into the system remain the property of the studio account that created it.</p>' +
      '<p>Accounts are responsible for keeping credentials secure and for the accuracy of the information they record.</p>' +
      '<p>Continued use of the system constitutes acceptance of these terms.</p>'
  }
};

// ADDED BY TEAM - Footer: builds the shared footer element (call again for each mount point)
function buildPhotoproFooter(footerId) {
  const linksHtml = FOOTER_LINKS.map(function (link) {
    return '<a href="#" data-footer-link="' + link.key + '" onclick="footerLinkClick(\'' + link.key + '\');return false" class="text-white/60 hover:text-accent-light transition">' + link.label + '</a>';
  }).join('');

  const footer = document.createElement('footer');
  footer.id = footerId;
  // mt-auto pins the footer to the bottom when the page has little content (flex column parent)
  footer.className = 'mt-auto bg-primary border-t border-white/10';
  footer.innerHTML =
    '<div class="px-4 lg:px-8 py-6">' +
      '<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0"><i data-lucide="camera" class="w-4 h-4 text-primary"></i></div>' +
          '<div>' +
            '<p class="text-sm font-bold tracking-tight text-white">PhotoPro <span class="text-accent">AI</span></p>' +
            '<p class="text-xs text-white/50 mt-0.5">Smart Photography Studio Management System</p>' +
          '</div>' +
        '</div>' +
        '<nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" aria-label="Footer">' + linksHtml + '</nav>' +
      '</div>' +
      '<div class="border-t border-white/10 mt-5 pt-4">' +
        '<p class="text-xs text-white/40">&copy; 2026 PhotoPro AI. All rights reserved.</p>' +
      '</div>' +
    '</div>';
  return footer;
}

// ADDED BY TEAM - Footer: link handler - Home returns to the dashboard inside the app,
// everything else opens its content in the existing shared modal
function footerLinkClick(key) {
  if (key === 'home') {
    const shell = document.getElementById('app-shell');
    if (shell && !shell.classList.contains('hidden') && typeof navigate === 'function') {
      navigate('dashboard');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }
  openFooterModal(key);
}

function openFooterModal(key) {
  const item = FOOTER_MODAL_CONTENT[key];
  if (!item || typeof openModal !== 'function') return;
  openModal(
    '<div class="p-6">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<h2 class="text-xl font-bold flex items-center gap-2"><i data-lucide="' + item.icon + '" class="w-5 h-5 text-accent"></i>' + item.title + '</h2>' +
        '<button onclick="closeModal()" class="btn-action"><i data-lucide="x" class="w-5 h-5"></i></button>' +
      '</div>' +
      '<div class="space-y-3 text-sm text-text-secondary leading-relaxed">' + item.body + '</div>' +
    '</div>',
    'max-w-lg'
  );
}

// ADDED BY TEAM - Footer: mounts the shared footer into the app shell and the auth screen
function initPhotoproFooters() {
  try {
    // App shell: last child of the main content column (after <main id="page-content">)
    const shellCol = document.querySelector('#app-shell > .flex-1');
    if (shellCol && !document.getElementById('app-footer')) {
      shellCol.appendChild(buildPhotoproFooter('app-footer'));
    }
    // Auth screen: last child, below the login/register panels
    const auth = document.getElementById('auth-screen');
    if (auth && !document.getElementById('auth-footer')) {
      auth.appendChild(buildPhotoproFooter('auth-footer'));
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  } catch (err) {
    // The footer is presentational only - never let it break the app
  }
}

initPhotoproFooters();
