// Minimal, optimized interactions: menu open/close + smooth scrolling
(() => {
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuClose = document.getElementById('menuClose');

  if (menuToggle && sideMenu) {
    function openMenu() {
      sideMenu.classList.add('open');
      sideMenu.setAttribute('aria-hidden', 'false');
      menuToggle.setAttribute('aria-expanded', 'true');
      // trap focus briefly (simple)
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      sideMenu.classList.remove('open');
      sideMenu.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    menuToggle.addEventListener('click', (e) => {
      const open = sideMenu.classList.toggle('open');
      sideMenu.setAttribute('aria-hidden', String(!open));
      menuToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menuClose?.addEventListener('click', closeMenu);
    // close if clicking outside
    document.addEventListener('click', (e) => {
      if (!sideMenu.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    // close on Esc
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  // Smooth anchor scrolling for internal links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { passive: true });

  // Lazy load background image to improve first paint
  // Already using CSS with remote image; we add a low-cost preloader:
  (function preloadBg(){
    const img = new Image();
    img.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=60';
    img.onload = () => {
      document.querySelectorAll('.hero-bg').forEach(el => el.style.opacity = '1');
    };
  })();
})();