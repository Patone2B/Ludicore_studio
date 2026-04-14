document.addEventListener('DOMContentLoaded', () => {
  const aboutLinks = document.querySelectorAll('a[href="#aboutSection"]');
  const aboutSection = document.getElementById('aboutSection');

  aboutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      aboutSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const navItems = document.querySelectorAll('.nav-item');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && href === currentPage) {
      item.style.background = 'rgba(255,255,255,0.12)';
      item.style.color = 'white';
    }
  });
});
