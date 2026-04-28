document.addEventListener('DOMContentLoaded', () => {
  const aboutLinks = document.querySelectorAll('a[href="#aboutSection"]');
  const aboutSection = document.getElementById('aboutSection');

  aboutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      aboutSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href === currentPage) {
      item.classList.add('active');
    }
  });

  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('studio-theme');

  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }

  const refreshThemeButton = () => {
    const isDark = document.body.classList.contains('dark');
    const icon = themeToggle?.querySelector('.theme-toggle-icon');
    const text = themeToggle?.querySelector('.theme-toggle-text');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (text) text.textContent = isDark ? 'Mode clair' : 'Mode sombre';
  };

  refreshThemeButton();

  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('studio-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    refreshThemeButton();
  });

  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
    observer.observe(element);
  });
});
