document.addEventListener('DOMContentLoaded', () => {
  const aboutSection = document.getElementById('aboutSection');
  const aboutBtn = document.getElementById('aboutBtn');

  aboutBtn?.addEventListener('click', () => {
    aboutSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const buttons = [
    'startProjectBtn',
    'cardsBtn',
    'boardBtn',
    'scriptBtn',
    'rulesBtn',
    'tokensBtn',
    'playtestBtn',
    'assetsBtn',
    'exportBtn'
  ];

  buttons.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener('click', () => {
      console.log(`Action à connecter plus tard : ${id}`);
    });
  });
});
