/* Comportamentos comuns a todas as páginas. */
(function () {
  'use strict';

  // Desativa o menu do botão direito. Nota: isto só dificulta; não impede ninguém de guardar imagens ou vídeos.
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Tema: escuro por defeito; a escolha fica guardada no browser.
  // (o <script> no <head> de cada página aplica o tema antes de desenhar, para não piscar)
  const root = document.documentElement;
  const btn = document.querySelector('.theme-toggle');
  const sync = () => {
    const light = root.dataset.theme === 'light';
    if (btn) { btn.setAttribute('aria-pressed', String(light)); btn.setAttribute('aria-label', light ? 'Mudar para modo escuro' : 'Mudar para modo claro'); }
  };
  if (btn) btn.addEventListener('click', () => {
    if (root.dataset.theme === 'light') delete root.dataset.theme; else root.dataset.theme = 'light';
    try { localStorage.setItem('theme', root.dataset.theme || 'dark'); } catch (e) { /* sem storage: só nesta visita */ }
    sync();
  });
  sync();

  // Slideshow em fullscreen (só existe na home). Imagens definidas em data-images, separadas por "|".
  const show = document.querySelector('.slideshow');
  if (show) {
    const srcs = show.dataset.images.split('|').map(s => s.trim()).filter(Boolean);
    const imgs = srcs.map((src, i) => {
      const im = document.createElement('img');
      im.src = src; im.alt = ''; im.decoding = 'async';
      if (i > 0) im.loading = 'lazy';
      show.append(im); return im;
    });
    let i = 0;
    if (imgs.length) imgs[0].classList.add('on');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (imgs.length > 1 && !still) setInterval(() => {
      imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on');
    }, Number(show.dataset.interval) || 6000);
  }
})();
