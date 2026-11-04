/* Lista de trabalhos — lê works.csv e gera o acordeão.
   Colunas: Projecto, Ano, Descricao, Cliente, Tipo, Media, Thumbnail, Tag
   (os cabeçalhos antigos em inglês continuam a ser aceites)
   - Media: vários itens separados por "|" (imagens .jpg/.png/.webp/.gif/.svg, vídeos .mp4/.webm, URLs YouTube/Vimeo)
   - Tag: várias tags separadas por ";"
   - "xxx", "yyy", "zzz" e campos vazios são ignorados; ano "0000" = desconhecido */

(function () {
  'use strict';

  const CSV_URL = 'works.csv';
  const PLACEHOLDERS = new Set(['', 'xxx', 'yyy', 'zzz']);
  const ICONS = ['motion-design', 'video-mapping', '3d', 'video', 'tech', 'film-credits', 'cenografia-digital'];
  // devolve o primeiro cabeçalho existente da lista
  const col = (r, ...names) => { for (const n of names) if (r[n] != null) return r[n]; return ''; };

  // Parser RFC 4180: aspas, aspas duplicadas ("") e quebras de linha dentro de campos.
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = []; let field = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift().map(h => h.trim());
    return rows.filter(r => r.some(v => v.trim() !== ''))
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  const clean = v => (PLACEHOLDERS.has((v || '').trim().toLowerCase()) ? '' : v.trim());
  const slug = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    [].concat(kids).forEach(k => n.append(k));
    return n;
  };

  function mediaNode(src, title) {
    const yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    const vm = src.match(/vimeo\.com\/(\d+)/);
    if (yt || vm) {
      const url = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}` : `https://player.vimeo.com/video/${vm[1]}`;
      return el('div', { class: 'embed' }, el('iframe', {
        src: url, title, loading: 'lazy', allow: 'autoplay; fullscreen; picture-in-picture', allowfullscreen: ''
      }));
    }
    if (/\.(mp4|webm|mov)$/i.test(src)) {
      // poster opcional: ficheiro com o mesmo nome + "-poster.jpg"
      return el('video', { src, controls: '', preload: 'none', playsinline: '',
        poster: src.replace(/\.\w+$/, '-poster.jpg') });
    }
    if (/\.(jpe?g|png|webp|gif|svg|avif)$/i.test(src)) return el('img', { src, alt: title, loading: 'lazy' });
    return el('a', { href: src }, src); // qualquer outro link
  }

  function render(items) {
    const list = document.getElementById('works');
    list.innerHTML = '';
    items.forEach(w => {
      const typeSlug = slug(w.type);
      // só o ícone; o nome da categoria fica disponível como texto alternativo e tooltip
      const icon = w.type
        ? el('img', { class: 'icon', src: `media/icons/${ICONS.includes(typeSlug) ? typeSlug : 'default'}.svg`, alt: w.type, title: w.type })
        : el('span');
      const summary = el('summary', {}, [
        el('span', { class: 'title t-h3' }, w.title),
        el('span', { class: 'client t-p2' }, w.client),
        el('span', { class: 'year t-p2' }, w.year || '—'),
        icon
      ]);

      const info = el('div', { class: 'info t-p1' });
      w.desc.split(/\n\s*\n|\n/).filter(Boolean).forEach(p => info.append(el('p', {}, p)));
      if (w.tags.length) info.append(el('p', { class: 'tags t-p3' }, w.tags.map(t => '#' + t).join(' ')));
      info.append(el('a', { class: 'permalink t-label', href: '#' + w.id }, 'ligação permanente'));
      const panel = el('div', { class: 'panel' }, info);
      const media = w.media.length ? w.media : (w.thumb ? [w.thumb] : []);
      if (media.length) panel.append(el('div', { class: 'media' }, media.map(m => mediaNode(m, w.title))));

      // name="works" torna o acordeão exclusivo nativamente (browsers recentes); o toggle abaixo cobre os restantes
      const d = el('details', { class: 'work', id: w.id, name: 'works', 'data-type': w.type }, [summary, panel]);
      d.addEventListener('toggle', () => {
        if (!d.open) { d.querySelectorAll('video').forEach(v => v.pause()); return; }
        document.querySelectorAll('details.work[open]').forEach(o => { if (o !== d) o.open = false; });
        if (location.hash !== '#' + w.id) history.replaceState(null, '', '#' + w.id);
      });
      list.append(el('li', {}, d));
    });
  }

  function filters(items) {
    const box = document.getElementById('filters');
    const types = [...new Set(items.map(w => w.type).filter(Boolean))].sort();
    if (types.length < 2) return;
    ['todos', ...types].forEach((t, i) => {
      const b = el('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' }, t);
      b.addEventListener('click', () => {
        box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        document.querySelectorAll('.work').forEach(d => {
          d.parentElement.hidden = !(t === 'todos' || d.dataset.type === t);
        });
      });
      box.append(b);
    });
  }

  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const d = id && document.getElementById(id);
    if (d && d.tagName === 'DETAILS') { d.open = true; d.scrollIntoView({ block: 'start' }); }
  }

  fetch(CSV_URL)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(text => {
      const seen = {};
      const items = parseCSV(text).map(r => {
        const title = clean(col(r, 'Projecto', 'Project')) || 'Sem título';
        let id = slug(title) || 'trabalho';
        seen[id] = (seen[id] || 0) + 1; if (seen[id] > 1) id += '-' + seen[id];
        const y = clean(col(r, 'Ano', 'Year'));
        return {
          id, title,
          year: y && y !== '0000' ? y : '',
          desc: clean(col(r, 'Descricao', 'Descrição', 'Description')),
          type: clean(col(r, 'Tipo', 'Type')),
          client: clean(col(r, 'Cliente', 'Client')),
          thumb: clean(col(r, 'Thumbnail', 'Media Thumbnail')),
          media: col(r, 'Media').split('|').map(clean).filter(Boolean),
          tags: col(r, 'Tag', 'Tags').split(';').map(clean).filter(Boolean)
        };
      }).sort((a, b) => (b.year || '0') - (a.year || '0'));
      render(items); filters(items); openFromHash();
      window.addEventListener('hashchange', openFromHash);
    })
    .catch(err => {
      document.getElementById('works').innerHTML =
        '<li class="notice">Não foi possível carregar <code>works.csv</code> (' + err.message + '). ' +
        'Se abriste o ficheiro diretamente (file://), o browser bloqueia o pedido: ' +
        'corre <code>python3 -m http.server</code> na pasta do site e abre <code>http://localhost:8000</code>.</li>';
    });
})();
