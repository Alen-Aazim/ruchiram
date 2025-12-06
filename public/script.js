(() => {
  // menu toggle (not heavy — simple)
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      // small behaviour: scroll to top when clicked on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // small lazy preload for hero background
  const img = new Image();
  img.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=60';
})();