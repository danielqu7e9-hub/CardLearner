/* App principal: biblioteca, mapa del mazo, vista de estudio, ajustes, importación */
(function (CL) {
  'use strict';
  const { h, store } = CL;
  const I = (n, c) => CL.icon(n, c);
  const T_ = s => CL.noEmoji(s);
  const app = document.getElementById('app');
  let cleanup = [];

  /* ---------------- Tema ---------------- */
  const THEME_KEYS = { accent: '--accent', accent2: '--accent2', background: '--bg', surface: '--surface', surface2: '--surface2', text: '--text', muted: '--muted', border: '--border', ok: '--ok', bad: '--bad', warn: '--warn', font: '--font', codeFont: '--mono', codeBackground: '--code-bg' };

  function applyTheme(deck) {
    const s = store.settings();
    const root = document.documentElement;
    Object.values(THEME_KEYS).forEach(v => root.style.removeProperty(v));
    root.style.removeProperty('--radius');
    let mode = s.theme;
    const t = deck && s.useDeckTheme ? deck.theme || {} : {};
    if (mode === 'auto' && t.mode && t.mode !== 'auto') mode = t.mode;
    if (mode === 'auto') mode = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    root.dataset.theme = mode;
    Object.entries(THEME_KEYS).forEach(([k, v]) => { if (t[k]) root.style.setProperty(v, t[k]); });
    if (t.radius != null) root.style.setProperty('--radius', t.radius + 'px');
    if (s.accent) root.style.setProperty('--accent', s.accent);
    root.style.fontSize = (16 * (s.fontScale || 1)) + 'px';
    root.classList.toggle('reduce-motion', !!s.reduceMotion);
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme(currentDeck));
  let currentDeck = null;

  /* ---------------- Barra superior ---------------- */
  function renderTopStats() {
    const s = store.stats();
    const L = store.level(s.xp);
    const el = document.getElementById('topbar-stats');
    el.innerHTML = '';
    el.append(
      h('span.stat', { title: `${L.into} de ${L.need} XP para el siguiente nivel` }, 'Nivel ', h('b', L.lvl)),
      h('span.stat', { title: 'XP total' }, h('b', s.xp), ' XP'),
      h('span.stat', { title: 'Días seguidos estudiando' }, 'Racha ', h('b', currentStreak(s))));
  }
  const currentStreak = s => s.lastDay === CL.todayKey() || isYesterday(s.lastDay) ? s.streak : 0;
  const isYesterday = d => { const y = new Date(); y.setDate(y.getDate() - 1); return d === CL.todayKey(y); };

  /* ---------------- Importar ---------------- */
  async function importText(text, filename) {
    let raw;
    try {
      raw = CL.deck.parseText(text, filename);
    } catch (e) { CL.toast(e.message, 'bad', 5000); return null; }
    if (raw && raw.format === 'cardlearner-backup/v1') {
      store.importBackup(raw); CL.toast('Copia de seguridad restaurada', 'ok'); route(); return null;
    }
    let res;
    try { res = CL.deck.normalize(raw); } catch (e) { CL.toast(e.message, 'bad', 5000); return null; }
    const { deck, warnings } = res;
    if (store.deck(deck.id)) {
      const replace = await CL.confirmDialog('El mazo ya existe', `Ya tienes un mazo con id "${deck.id}". ¿Reemplazarlo? (tu progreso se conserva)`, 'Reemplazar');
      if (!replace) return null;
    }
    store.saveDeck(deck);
    if (warnings.length) showWarnings(deck, warnings);
    else CL.toast(`Mazo "${T_(deck.title)}" importado`, 'ok');
    return deck;
  }

  function showWarnings(deck, warnings) {
    CL.modal({
      title: `Importado con ${warnings.length} aviso${warnings.length > 1 ? 's' : ''}`,
      body: h('div', h('p', `"${deck.title}" se ha importado, pero revisa esto:`), h('ul.warn-list', warnings.slice(0, 50).map(w => h('li', w)))),
      actions: [{ label: 'Abrir editor', onClick: () => { location.hash = '#/edit/' + deck.id; } }, { label: 'Vale', primary: true }]
    });
  }

  async function importFiles(files) {
    let last = null;
    for (const f of files) {
      const text = await f.text();
      const d = await importText(text, f.name);
      if (d) last = d;
    }
    if (last) location.hash = '#/deck/' + last.id; else route();
  }

  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', () => { importFiles([...fileInput.files]); fileInput.value = ''; });

  function pasteDialog() {
    const ta = h('textarea.paste-area.mono', { placeholder: 'Pega aquí el JSON (o JS) del mazo…' });
    CL.modal({
      title: 'Pegar mazo', wide: true, body: h('div', ta, h('p.muted.small', 'Acepta JSON o un fichero .js con export default / module.exports.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Importar', primary: true, onClick: () => {
          if (!ta.value.trim()) return false;
          importText(ta.value, 'pegado').then(d => { if (d) location.hash = '#/deck/' + d.id; else route(); });
        }
      }]
    });
    setTimeout(() => ta.focus(), 50);
  }

  // Arrastrar y soltar en toda la ventana
  const overlay = document.getElementById('drop-overlay');
  let dragDepth = 0;
  window.addEventListener('dragenter', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { dragDepth++; overlay.hidden = false; } });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; overlay.hidden = true; } });
  window.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', e => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault(); dragDepth = 0; overlay.hidden = true;
    importFiles([...e.dataTransfer.files]);
  });

  /* ---------------- Progreso ---------------- */
  function deckProgress(deck) {
    const p = store.progress(deck.id);
    let total = 0, done = 0;
    const perSection = {};
    deck.sections.forEach(s => {
      let d = 0;
      s.cards.forEach(c => { total++; const st = p.cards[CL.deck.cardKey(s, c)]; if (st && st.done) { done++; d++; } });
      perSection[s.id] = { done: d, total: s.cards.length };
    });
    return { total, done, pct: total ? Math.round(done / total * 100) : 0, perSection, xp: p.xp || 0, p };
  }

  function sectionUnlocked(deck, si, prog) {
    if (!deck.lockSections || si === 0) return true;
    const prev = deck.sections[si - 1];
    const ps = prog.perSection[prev.id];
    return ps.done >= Math.ceil(ps.total * (deck.unlockThreshold ?? 0.8));
  }

  const bar = pct => h('div.pbar', h('i', { style: { width: pct + '%' } }));
  const fact = (label, value) => h('div.fact', h('dt', label), h('dd', value));

  /* ---------------- Vista: biblioteca ---------------- */
  function viewHome() {
    currentDeck = null; applyTheme(null);
    const decks = Object.values(store.decks()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const grid = h('div.deck-grid');
    decks.forEach(d => {
      const pr = deckProgress(d), st = CL.deck.stats(d);
      grid.appendChild(h('article.deck-card', {
        onclick: e => { if (!e.target.closest('button')) location.hash = '#/deck/' + d.id; }
      },
        h('div.deck-card-top', h('span.deck-icon', CL.glyph(d.icon, d.id)), h('span.deck-pct', pr.pct + '%')),
        h('h3', T_(d.title)),
        d.description ? h('p.deck-desc', { html: CL.mdInline(d.description) }) : null,
        h('dl.facts', fact('Apartados', st.sections), fact('Tarjetas', st.cards), fact('XP', `${pr.xp}/${st.xp}`), d.level ? fact('Dificultad', d.level) : null),
        bar(pr.pct),
        h('div.deck-card-actions',
          h('button.btn.btn-sm.btn-primary', { onclick: () => { location.hash = '#/study/' + d.id + '/continue'; } }, pr.done ? 'Continuar' : 'Empezar'),
          h('button.btn.btn-sm.btn-icon', { title: 'Editar', onclick: () => { location.hash = '#/edit/' + d.id; } }, I('edit')),
          h('button.btn.btn-sm.btn-icon', { title: 'Exportar JSON', onclick: () => exportDeck(d) }, I('download')),
          h('button.btn.btn-sm.btn-icon', {
            title: 'Eliminar', onclick: async () => {
              if (await CL.confirmDialog('Eliminar mazo', `¿Eliminar "${d.title}" y su progreso? No se puede deshacer.`, 'Eliminar', true)) { store.deleteDeck(d.id); route(); }
            }
          }, I('delete')))));
    });

    const addCard = h('div.deck-add',
      h('h3', 'Añadir un mazo'),
      h('p.muted.small', 'Un fichero .json o .js, o arrástralo a la ventana.'),
      h('button.btn.btn-primary', { onclick: () => fileInput.click() }, 'Abrir fichero'),
      h('button.btn', { onclick: pasteDialog }, 'Pegar JSON'),
      h('button.btn', { onclick: () => { const d = CL.deck.blankDeck(); store.saveDeck(d); location.hash = '#/edit/' + d.id; } }, 'Crear desde cero'),
      missingSamples().length ? h('button.btn.btn-ghost', { onclick: loadSamples }, missingSamples().length > 1 ? 'Cargar los mazos de ejemplo' : 'Cargar el mazo de ejemplo') : null);
    grid.appendChild(addCard);

    const s = store.stats();
    const today = s.days[CL.todayKey()] || 0;
    app.append(
      h('header.page-head',
        h('h1', 'Mazos'),
        h('p.muted', decks.length
          ? `${decks.length} ${decks.length === 1 ? 'mazo' : 'mazos'} · ${today} XP hoy · mejor racha: ${s.best} ${s.best === 1 ? 'día' : 'días'}`
          : 'Todavía no hay mazos. Abre uno o crea el tuyo.')),
      grid,
      h('footer.home-footer',
        h('button.link-btn', { onclick: () => CL.download('cardlearner-backup.json', JSON.stringify(store.exportAll(), null, 2)) }, 'Descargar copia de seguridad'),
        h('button.link-btn', { onclick: () => fileInput.click() }, 'Restaurar copia'),
        h('span.muted', 'Los datos se guardan en este navegador.')));
  }

  const sampleDecks = () => [CL.SAMPLE_DECK, CL.SAMPLE_DECK_MULTI].filter(Boolean);
  const missingSamples = () => sampleDecks().filter(d => !store.deck(CL.slug(d.id)));

  function loadSamples() {
    missingSamples().forEach(raw => store.saveDeck(CL.deck.normalize(raw).deck));
    route();
  }

  function exportDeck(d) {
    const out = CL.clone(d); delete out.updatedAt;
    CL.download(d.id + '.json', JSON.stringify(out, null, 2));
  }

  /* ---------------- Vista: mapa del mazo ---------------- */
  function viewDeck(id) {
    const deck = store.deck(id);
    if (!deck) return notFound();
    currentDeck = deck; applyTheme(deck);
    const pr = deckProgress(deck), st = CL.deck.stats(deck);
    const review = reviewList(deck, pr.p);

    const meta = [deck.author, `${st.sections} apartados`, `${st.cards} tarjetas`, deck.estimatedMinutes ? `unos ${deck.estimatedMinutes} min` : null, deck.level].filter(Boolean);
    app.append(
      h('section.deck-hero',
        h('a.back', { href: '#/' }, I('back'), 'Mazos'),
        h('div.deck-hero-main',
          h('span.deck-icon.big', CL.glyph(deck.icon, deck.id)),
          h('div.grow',
            h('h1', T_(deck.title)),
            deck.description ? md(deck.description) : null,
            h('p.deck-meta', meta.join(' · ')))),
        h('div.deck-progress', h('span', `${pr.pct}% completado`), bar(pr.pct), h('span.muted', `${pr.xp} de ${st.xp} XP`)),
        h('div.row-actions',
          h('button.btn.btn-primary', { onclick: () => { location.hash = '#/study/' + deck.id + '/continue'; } }, pr.done ? 'Continuar' : 'Empezar'),
          review.length ? h('button.btn', { onclick: () => { location.hash = '#/study/' + deck.id + '/review'; } }, `Repasar fallos (${review.length})`) : null,
          h('button.btn', { onclick: () => { location.hash = '#/edit/' + deck.id; } }, 'Editar'),
          h('button.btn', { onclick: () => exportDeck(deck) }, 'Exportar'),
          h('button.btn.btn-ghost', {
            onclick: async () => { if (await CL.confirmDialog('Reiniciar progreso', '¿Borrar el progreso de este mazo?', 'Reiniciar', true)) { store.resetProgress(deck.id); route(); } }
          }, 'Reiniciar progreso'))),
      h('ol.section-list', deck.sections.map((s, si) => {
        const ps = pr.perSection[s.id];
        const unlocked = sectionUnlocked(deck, si, pr);
        const pct = ps.total ? Math.round(ps.done / ps.total * 100) : 0;
        return h('li.section-row' + (unlocked ? '' : '.locked') + (pct === 100 ? '.complete' : ''),
          h('span.section-num', unlocked ? (s.icon && CL.hasIcon(s.icon) ? I(s.icon) : String(si + 1).padStart(2, '0')) : I('lock')),
          h('div.section-body',
            h('h3', T_(s.title)),
            s.description ? h('p.muted', s.description) : null,
            unlocked ? null : h('p.muted.small', `Se desbloquea al completar el ${Math.round((deck.unlockThreshold ?? 0.8) * 100)}% del apartado anterior.`),
            unlocked ? h('div.card-dots', s.cards.map((c, ci) => {
            const cs = pr.p.cards[CL.deck.cardKey(s, c)];
            const T = CL.deck.TYPES[c.type] || { label: c.type };
            return h('button.card-dot' + (cs && cs.done ? (cs.review ? '.dot-review' : '.dot-done') : ''), {
              title: `${T.label || c.type}: ${T_(c.title || '')}`,
              onclick: () => { location.hash = `#/study/${deck.id}/${s.id}/${ci}`; }
            }, I(c.type) || '·');
          })) : null),
          h('span.section-count', `${ps.done}/${ps.total}`),
          unlocked ? h('button.btn.btn-sm' + (pct < 100 ? '.btn-primary' : ''), { onclick: () => { location.hash = `#/study/${deck.id}/${s.id}`; } }, pct === 100 ? 'Repasar' : pct ? 'Seguir' : 'Empezar') : h('span'));
      })));
  }

  function reviewList(deck, p) {
    const out = [];
    deck.sections.forEach(s => s.cards.forEach((c, ci) => {
      const st = p.cards[CL.deck.cardKey(s, c)];
      if (st && (st.review || (st.done && st.firstTry === false))) out.push({ s, c, ci });
    }));
    return out;
  }

  /* ---------------- Vista: estudio ---------------- */
  function viewStudy(id, secId, cardIdx) {
    const deck = store.deck(id);
    if (!deck) return notFound();
    currentDeck = deck; applyTheme(deck);
    const pr = deckProgress(deck);

    // Lista de tarjetas a recorrer
    let queue = [], title = '', mode = 'section';
    if (secId === 'review') {
      mode = 'review'; title = 'Repaso';
      queue = reviewList(deck, pr.p);
      if (!queue.length) { CL.toast('No hay tarjetas pendientes de repaso', 'ok'); location.hash = '#/deck/' + id; return; }
    } else {
      let sec = deck.sections.find(s => s.id === secId);
      if (secId === 'continue' || !sec) {
        sec = deck.sections.find((s, si) => sectionUnlocked(deck, si, pr) && s.cards.some(c => !(pr.p.cards[CL.deck.cardKey(s, c)] || {}).done)) || deck.sections[0];
        if (cardIdx == null) {
          const firstPending = sec.cards.findIndex(c => !(pr.p.cards[CL.deck.cardKey(sec, c)] || {}).done);
          cardIdx = Math.max(0, firstPending);
        }
      }
      title = T_(sec.title);
      queue = sec.cards.map((c, ci) => ({ s: sec, c, ci }));
    }
    let pos = Math.min(Math.max(0, +cardIdx || 0), queue.length - 1);
    if (mode === 'review') pos = 0;

    const counter = h('span.study-count');
    const stage = h('div.stage');
    const navPrev = h('button.btn.nav-btn', { onclick: () => prev() }, 'Anterior');
    const navNext = h('button.btn.btn-primary.nav-btn', { onclick: () => next() });
    const secBar = h('div.pbar.study-pbar', h('i'));

    app.append(h('div.study',
      h('div.study-top',
        h('a.back.back-close', { href: '#/deck/' + deck.id, title: 'Salir' }, I('close')),
        h('div.grow', h('div.study-title', title), secBar),
        counter),
      stage,
      h('div.study-nav', navPrev, h('span.muted.small.nav-hint', '← → para navegar'), navNext)));

    function key(item) { return CL.deck.cardKey(item.s, item.c); }

    function paintDots() {
      const p = store.progress(deck.id);
      counter.textContent = `${pos + 1} / ${queue.length}`;
      const done = queue.filter(it => (p.cards[key(it)] || {}).done).length;
      secBar.firstChild.style.width = (done / queue.length * 100) + '%';
      navPrev.disabled = pos === 0;
      navNext.textContent = pos === queue.length - 1 ? (mode === 'review' ? 'Terminar' : 'Terminar apartado') : 'Siguiente';
    }

    let cardEl = null;
    let finished = false; // pantalla final del apartado: "Siguiente" queda desactivado

    // Desde la pantalla final, "Anterior" vuelve a la última tarjeta
    function prev() { if (finished) go(pos, -1); else go(pos - 1, -1); }
    function go(n, dir = 1) {
      if (n < 0 || n >= queue.length) return;
      pos = n;
      finished = false;
      navNext.disabled = false;
      if (mode !== 'review') history.replaceState(null, '', `#/study/${deck.id}/${queue[pos].s.id}/${queue[pos].ci}`);
      if (cardEl && cardEl._cleanup) cardEl._cleanup();
      const item = queue[pos];
      cardEl = buildCard(deck, item, dir, () => { paintDots(); });
      stage.innerHTML = '';
      stage.appendChild(cardEl);
      stage.scrollTop = 0;
      window.scrollTo({ top: 0 });
      paintDots();
    }

    function next() {
      if (finished) return;
      if (pos < queue.length - 1) { go(pos + 1, 1); return; }
      finish();
    }

    function finish() {
      const p = store.progress(deck.id);
      const done = queue.filter(it => (p.cards[key(it)] || {}).done).length;
      const all = done === queue.length;
      if (all) CL.sound('done');
      const secIdx = deck.sections.indexOf(queue[0].s);
      const nextSec = mode === 'section' ? deck.sections[secIdx + 1] : null;
      stage.innerHTML = '';
      stage.appendChild(h('div.card-shell.finish.anim-slide',
        h('div.finish-num', `${done}/${queue.length}`),
        h('h2', all ? 'Apartado completado' : 'Quedan tarjetas pendientes'),
        h('p.muted', all ? `Has terminado «${T_(queue[0].s.title)}».` : 'Puedes volver a ellas cuando quieras desde el mazo.'),
        h('div.row-actions',
          h('button.btn', { onclick: () => { location.hash = '#/deck/' + deck.id; } }, 'Volver al mazo'),
          nextSec && sectionUnlocked(deck, secIdx + 1, deckProgress(deck)) ? h('button.btn.btn-primary', { onclick: () => { location.hash = `#/study/${deck.id}/${nextSec.id}/0`; } }, `Siguiente: ${T_(nextSec.title)}`) : null)));
      finished = true;
      navNext.disabled = true;
      navPrev.disabled = false;
    }

    const onKey = e => {
      if (e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('.modal-backdrop')) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    cleanup.push(() => { document.removeEventListener('keydown', onKey); if (cardEl && cardEl._cleanup) cardEl._cleanup(); });
    go(pos, 1);
  }

  function buildCard(deck, item, dir, onChange) {
    const { s, c } = item;
    const k = CL.deck.cardKey(s, c);
    const T = CL.deck.TYPES[c.type] || { label: c.type };
    const xp = CL.deck.cardXp(c);
    const settings = store.settings();
    let state = store.cardState(deck.id, k);
    const xpBadge = h('span.xp-badge' + (state && state.done ? '.earned' : ''), (state && state.done ? '' : '+') + xp + ' XP');

    const ctx = {
      settings, deck, section: s,
      get lang() { return resolved.lang; },
      get state() { return state; },
      saveData(patch) { state = store.patchCard(deck.id, k, patch); },
      attempt(correct) {
        const prev = state || {};
        const patch = { attempts: (prev.attempts || 0) + 1 };
        if (!correct && !prev.done && prev.firstTry == null) patch.firstTry = false;
        state = store.patchCard(deck.id, k, patch);
      },
      complete({ correct = true, review = false, silent = false } = {}) {
        const prev = state || {};
        const firstTime = !prev.done;
        const firstTry = prev.firstTry == null ? true : prev.firstTry;
        state = store.patchCard(deck.id, k, { done: true, review, firstTry: prev.done ? prev.firstTry : firstTry && correct });
        if (firstTime) {
          // XP completo a la primera, la mitad si hubo fallos
          const gained = firstTry && correct ? xp : Math.ceil(xp / 2);
          store.addXp(deck.id, gained);
          renderTopStats();
          xpBadge.textContent = gained + ' XP';
          xpBadge.classList.add('earned', 'pop');
          if (!silent) floatXp(xpBadge, gained);
          if (sectionJustCompleted(deck, s)) setTimeout(() => { CL.sound('done'); CL.toast(`Apartado «${T_(s.title)}» completado`, 'ok', 3500); }, 500);
          if (settings.autoAdvance && !silent) setTimeout(() => { const nb = document.querySelector('.study-nav .btn-primary'); if (nb && document.contains(xpBadge)) nb.click(); }, 1400);
        } else if (correct && !review && (prev.review || prev.firstTry === false)) {
          // acertada de nuevo: sale de la lista de repaso
          state = store.patchCard(deck.id, k, { review: false, firstTry: true });
          CL.toast('Tarjeta repasada', 'ok', 1200);
        }
        onChange();
      }
    };

    // La tarjeta se resuelve para el lenguaje preferido si trae variantes; las pestañas permiten cambiarlo
    let resolved = CL.deck.resolveCard(c, deck, store.settings().preferredLang);
    let body = CL.cards.render(resolved, ctx);
    const tabs = resolved._langs.length > 1 ? h('div.card-langs', resolved._langs.map(l => h('button.lang-tab' + (l === resolved.lang ? '.on' : ''), {
      onclick: () => {
        if (l === resolved.lang) return;
        CL.setPreferredLang(l);
        resolved = CL.deck.resolveCard(c, deck, l);
        [...tabs.children].forEach(b => b.classList.toggle('on', b.textContent === CL.langLabel(l)));
        if (body._cleanup) body._cleanup();
        const next = CL.cards.render(resolved, ctx);
        body.replaceWith(next);
        body = next;
      }
    }, CL.langLabel(l)))) : null;

    const anim = c.animation || (deck.theme && deck.theme.cardAnimation) || 'slide';
    const shell = h('article.card-shell.anim-' + (anim === 'slide' ? (dir < 0 ? 'slide-back' : 'slide') : anim),
      h('header.card-head',
        h('span.type-chip', I(c.type), T.label || c.type),
        h('span.card-index', String(s.cards.indexOf(c) + 1).padStart(2, '0') + ' / ' + String(s.cards.length).padStart(2, '0')),
        xpBadge,
        h('h2.card-title', T_(c.title || '')),
        tabs),
      body);
    shell._cleanup = () => body._cleanup && body._cleanup();
    return shell;
  }

  function floatXp(anchor, n) {
    const r = anchor.getBoundingClientRect();
    const f = h('div.float-xp', '+' + n + ' XP');
    f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  function sectionJustCompleted(deck, s) {
    const p = store.progress(deck.id);
    return s.cards.length > 1 && s.cards.every(c => (p.cards[CL.deck.cardKey(s, c)] || {}).done);
  }

  /* ---------------- Ajustes ---------------- */
  function settingsDialog() {
    const s = store.settings();
    const set = (k, v) => { store.saveSettings({ [k]: v }); applyTheme(currentDeck); };
    const row = (label, control, help) => h('label.set-row', h('div', h('div', label), help ? h('div.muted.small', help) : null), control);
    const check = k => h('input.switch', { type: 'checkbox', checked: !!s[k], onchange: e => set(k, e.target.checked) });
    CL.modal({
      title: 'Ajustes',
      body: h('div.settings',
        row('Tema', h('select.select', { onchange: e => set('theme', e.target.value) },
          [['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([v, l]) => h('option', { value: v, selected: s.theme === v }, l)))),
        row('Usar colores del mazo', check('useDeckTheme'), 'Cada mazo puede traer su propio tema'),
        row('Color de acento propio', h('div.inline',
          h('input', { type: 'color', value: s.accent || '#c8a45d', oninput: e => set('accent', e.target.value) }),
          h('button.link-btn', { onclick: e => { e.preventDefault(); set('accent', ''); CL.toast('Acento restablecido'); } }, 'quitar'))),
        row('Lenguaje preferido', h('select.select', { onchange: e => set('preferredLang', e.target.value) },
          [['', 'El del mazo']].concat(Object.entries(CL.LANG_LABELS).filter(([k]) => !['json', 'yaml', 'toml', 'markdown', 'css', 'html'].includes(k)))
            .map(([v, l]) => h('option', { value: v, selected: v === (s.preferredLang ? CL.langOf(s.preferredLang) : '') }, l + (v && CL.canRun(v) ? ' · se ejecuta aquí' : '')))),
          'Si una tarjeta trae código en varios lenguajes, se mostrará en este'),
        row('Tamaño de texto', h('input', { type: 'range', min: 0.8, max: 1.4, step: 0.05, value: s.fontScale, oninput: e => set('fontScale', +e.target.value) })),
        row('Tamaño del editor de código', h('input', { type: 'range', min: 11, max: 22, step: 1, value: s.editorFontSize, oninput: e => set('editorFontSize', +e.target.value) })),
        row('Sonidos', check('sound')),
        row('Reducir animaciones', check('reduceMotion')),
        row('Barajar opciones de los tests', check('shuffleOptions')),
        row('Avanzar solo al acertar', check('autoAdvance'))),
      actions: [{ label: 'Listo', primary: true, onClick: () => route() }]
    });
  }
  document.getElementById('btn-settings').addEventListener('click', settingsDialog);

  /* ---------------- Router ---------------- */
  function notFound() {
    app.append(h('div.empty', h('h2', 'Mazo no encontrado'), h('a.btn', { href: '#/' }, 'Volver')));
  }

  const md = (t) => CL.md(t);

  function route() {
    cleanup.forEach(f => f()); cleanup = [];
    app.innerHTML = '';
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    renderTopStats();
    const [view, a, b, c] = parts;
    if (view === 'deck' && a) viewDeck(a);
    else if (view === 'study' && a) viewStudy(a, b, c);
    else if (view === 'edit' && a) { const d = store.deck(a); if (!d) return notFound(); currentDeck = d; applyTheme(d); cleanup.push(CL.editor.mount(app, d, { applyTheme })); }
    else viewHome();
  }

  window.addEventListener('hashchange', route);
  document.getElementById('btn-settings').appendChild(I('settings'));
  document.getElementById('brand-mark').appendChild(I('brand'));
  document.getElementById('drop-icon').appendChild(I('drop'));
  CL.app = { route, applyTheme, importText };

  // Primera visita: cargar los mazos de ejemplo
  if (!Object.keys(store.decks()).length && !localStorage.getItem('cl.visited')) {
    try { localStorage.setItem('cl.visited', '1'); } catch (e) { }
    sampleDecks().forEach(raw => store.saveDeck(CL.deck.normalize(raw).deck));
  }
  route();
})(window.CL);
