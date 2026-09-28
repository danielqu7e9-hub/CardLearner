/* Editor de mazos: crear/editar apartados y tarjetas con vista previa en vivo */
(function (CL) {
  'use strict';
  const { h, store } = CL;
  const I = (n, c) => CL.icon(n, c);

  // Campos de texto largos que se editan con su propio editor (el resto va en JSON)
  const TEXT_FIELDS = {
    content: 'md', front: 'md', back: 'md', question: 'md', statement: 'md', prompt: 'md', explanation: 'md',
    code: 'js', starter: 'js', solution: 'js', html: 'html', css: 'css', js: 'js'
  };
  const FIELDS_BY_TYPE = {
    lesson: ['content', 'code'], flashcard: ['front', 'back', 'explanation'], quiz: ['question', 'code', 'explanation'],
    truefalse: ['statement', 'code', 'explanation'], predict: ['question', 'code', 'explanation'], fill: ['prompt', 'code', 'explanation'],
    order: ['prompt', 'explanation'], match: ['prompt', 'explanation'], code: ['prompt', 'starter', 'solution', 'explanation'],
    trace: ['prompt', 'code', 'explanation'], html: ['prompt', 'html', 'css', 'js', 'explanation']
  };
  const COMMON = ['id', 'type', 'title'];

  function mount(root, deckIn, { applyTheme }) {
    let deck = CL.clone(deckIn);
    let sel = { kind: 'deck' };
    let dirty = false;
    const status = h('span.save-status.muted.small', 'Guardado');

    const save = CL.debounce(() => {
      store.saveDeck(deck); dirty = false;
      status.textContent = 'Guardado'; status.classList.remove('unsaved');
    }, 500);
    function touch() { dirty = true; status.textContent = 'Guardando…'; status.classList.add('unsaved'); save(); }

    const tree = h('nav.ed-tree');
    const panel = h('div.ed-panel');

    root.append(h('div.editor',
      h('div.ed-toolbar',
        h('a.back', { href: '#/deck/' + deck.id }, I('back'), 'Volver'),
        h('h2.grow', h('span.ed-deck-title', deck.title)),
        status,
        h('button.btn.btn-sm', { onclick: () => { save(); location.hash = '#/study/' + deck.id + '/continue'; } }, 'Probar'),
        h('button.btn.btn-sm', { onclick: validateAll, title: 'Ejecuta las soluciones de los retos y comprueba las predicciones' }, 'Comprobar'),
        h('button.btn.btn-sm', { onclick: rawJson }, 'JSON'),
        h('button.btn.btn-sm', { onclick: () => CL.copyText(JSON.stringify(clean(), null, 2)) }, 'Copiar'),
        h('button.btn.btn-sm.btn-primary', { onclick: () => CL.download(deck.id + '.json', JSON.stringify(clean(), null, 2)) }, 'Exportar')),
      h('div.ed-body', tree, panel)));

    const clean = () => { const d = CL.clone(deck); delete d.updatedAt; return d; };

    /* ---------- Árbol ---------- */
    function renderTree() {
      tree.innerHTML = '';
      tree.appendChild(h('button.tree-item.tree-deck' + (sel.kind === 'deck' ? '.active' : ''), { onclick: () => select({ kind: 'deck' }) }, 'Ajustes del mazo'));
      deck.sections.forEach((s, si) => {
        const secBtn = h('div.tree-sec' + (sel.kind === 'section' && sel.si === si ? '.active' : ''),
          h('button.tree-item.grow', { onclick: () => select({ kind: 'section', si }) }, h('span.tree-num', String(si + 1).padStart(2, '0')), CL.noEmoji(s.title)),
          h('span.tree-tools',
            h('button.icon-btn.sm', { title: 'Subir', onclick: () => moveSection(si, -1) }, I('up')),
            h('button.icon-btn.sm', { title: 'Bajar', onclick: () => moveSection(si, 1) }, I('down'))));
        tree.appendChild(secBtn);
        s.cards.forEach((c, ci) => {
          
          tree.appendChild(h('div.tree-card' + (sel.kind === 'card' && sel.si === si && sel.ci === ci ? '.active' : ''),
            h('button.tree-item.grow', { onclick: () => select({ kind: 'card', si, ci }) }, I(c.type), CL.noEmoji(c.title || c.id)),
            h('span.tree-tools',
              h('button.icon-btn.sm', { title: 'Subir', onclick: () => moveCard(si, ci, -1) }, I('up')),
              h('button.icon-btn.sm', { title: 'Bajar', onclick: () => moveCard(si, ci, 1) }, I('down')))));
        });
        tree.appendChild(h('button.tree-add', { onclick: () => addCard(si) }, '+ Tarjeta'));
      });
      tree.appendChild(h('button.tree-add.tree-add-sec', { onclick: addSection }, '+ Apartado'));
    }

    function select(s) { sel = s; renderTree(); renderPanel(); }

    function moveSection(si, d) {
      const t = si + d; if (t < 0 || t >= deck.sections.length) return;
      const [x] = deck.sections.splice(si, 1); deck.sections.splice(t, 0, x);
      if (sel.si === si) sel.si = t;
      touch(); renderTree();
    }
    function moveCard(si, ci, d) {
      const cards = deck.sections[si].cards;
      const t = ci + d;
      if (t < 0 || t >= cards.length) return;
      const [x] = cards.splice(ci, 1); cards.splice(t, 0, x);
      if (sel.kind === 'card' && sel.si === si && sel.ci === ci) sel.ci = t;
      touch(); renderTree();
    }
    function uniqueId(list, base) { let id = base, n = 2; while (list.some(x => x.id === id)) id = base + '-' + n++; return id; }

    function addSection() {
      const id = uniqueId(deck.sections, 'apartado');
      deck.sections.push({ id, title: 'Nuevo apartado', description: '', cards: [] });
      touch(); select({ kind: 'section', si: deck.sections.length - 1 });
    }

    function addCard(si) {
      const grid = h('div.type-grid', Object.entries(CL.deck.TYPES).map(([t, T]) => h('button.type-opt', {
        onclick: () => {
          const c = CL.clone(CL.deck.TEMPLATES[t]);
          c.id = uniqueId(deck.sections[si].cards, CL.slug(c.title));
          deck.sections[si].cards.push(c);
          m.close(); touch(); select({ kind: 'card', si, ci: deck.sections[si].cards.length - 1 });
        }
      }, h('span.type-opt-icon', I(t)), h('b', T.label), h('span.muted.small', t))));
      const m = CL.modal({ title: 'Nueva tarjeta: elige el tipo', body: grid, wide: true });
    }

    /* ---------- Panel ---------- */
    function renderPanel() {
      panel.innerHTML = '';
      if (sel.kind === 'deck') panel.appendChild(deckForm());
      else if (sel.kind === 'section') panel.appendChild(sectionForm(deck.sections[sel.si], sel.si));
      else if (sel.kind === 'card') panel.appendChild(cardForm(deck.sections[sel.si], sel.si, sel.ci));
    }

    function field(label, input, help) {
      return h('label.field', h('span.field-label', label), input, help ? h('span.muted.small', help) : null);
    }
    function textIn(obj, key, opts = {}) {
      return h('input.input', {
        value: obj[key] ?? '', placeholder: opts.placeholder || '', type: opts.type || 'text',
        oninput: e => {
          const v = e.target.value;
          if (opts.type === 'number') { if (v === '') delete obj[key]; else obj[key] = +v; }
          else if (v === '' && opts.optional) delete obj[key]; else obj[key] = v;
          opts.after && opts.after(v); touch();
        }
      });
    }
    function areaIn(obj, key, rows = 3) {
      return h('textarea.input', { rows, value: obj[key] ?? '', oninput: e => { obj[key] = e.target.value; touch(); } });
    }

    function deckForm() {
      deck.theme = deck.theme || {};
      const t = deck.theme;
      const color = (key, label, def) => {
        const inp = h('input', { type: 'color', value: t[key] || def, oninput: e => { t[key] = e.target.value; touch(); applyTheme(deck); } });
        return h('div.color-field', inp, h('span', label), h('button.link-btn', { onclick: () => { delete t[key]; inp.value = def; touch(); applyTheme(deck); } }, '×'));
      };
      return h('div.ed-form.anim-rise',
        h('h3', 'Ajustes del mazo'),
        h('div.form-grid',
          field('Título', textIn(deck, 'title', { after: v => { root.querySelector('.ed-deck-title').textContent = v; } })),
          field('Icono', iconSelect(deck), 'Vacío = marca abstracta generada'),
          field('Autor', textIn(deck, 'author', { optional: true })),
          field('Nivel', textIn(deck, 'level', { optional: true, placeholder: 'Principiante, Intermedio…' })),
          field('Lenguaje por defecto', textIn(deck, 'language', { placeholder: 'javascript' }), 'Solo JavaScript se ejecuta; otros lenguajes se muestran resaltados.'),
          field('Minutos estimados', textIn(deck, 'estimatedMinutes', { type: 'number', optional: true }))),
        field('Descripción (markdown)', areaIn(deck, 'description', 3)),
        h('div.form-grid',
          field('Bloquear apartados', h('input.switch', { type: 'checkbox', checked: !!deck.lockSections, onchange: e => { deck.lockSections = e.target.checked; touch(); } }), 'Hay que completar el anterior para avanzar'),
          field('Umbral de desbloqueo (0–1)', textIn(deck, 'unlockThreshold', { type: 'number', optional: true, placeholder: '0.8' }))),
        h('h4', 'Tema'),
        h('div.color-grid',
          color('accent', 'Acento', '#c8a45d'), color('accent2', 'Acento 2', '#d9c2ba'),
          color('background', 'Fondo', '#0a1224'), color('surface', 'Tarjeta', '#0f1a31'),
          color('text', 'Texto', '#ece4d8'), color('codeBackground', 'Fondo código', '#08101f')),
        h('div.form-grid',
          field('Modo', h('select.select', { onchange: e => { t.mode = e.target.value; touch(); applyTheme(deck); } },
            ['auto', 'dark', 'light'].map(m => h('option', { value: m, selected: (t.mode || 'auto') === m }, m)))),
          field('Animación de entrada', animSelect(t, 'cardAnimation')),
          field('Radio de bordes (px)', textIn(t, 'radius', { type: 'number', optional: true, placeholder: '14' })),
          field('Fuente', textIn(t, 'font', { optional: true, placeholder: 'system-ui, sans-serif' }))),
        h('h4', 'Zona peligrosa'),
        h('button.btn.btn-danger', {
          onclick: async () => {
            if (await CL.confirmDialog('Eliminar mazo', '¿Eliminar este mazo y su progreso?', 'Eliminar', true)) { store.deleteDeck(deck.id); location.hash = '#/'; }
          }
        }, 'Eliminar mazo'));
    }

    function iconSelect(obj) {
      const cur = obj.icon && CL.hasIcon(obj.icon) ? obj.icon : '';
      const prev = h('span.icon-preview', cur ? I(cur) : null);
      const sel = h('select.select', {
        onchange: e => {
          if (e.target.value) obj.icon = e.target.value; else delete obj.icon;
          prev.replaceChildren(e.target.value ? I(e.target.value) : '');
          touch(); renderTree();
        }
      }, [h('option', { value: '' }, '(automático)')].concat(CL.ICON_NAMES.map(n => h('option', { value: n, selected: n === cur }, n))));
      return h('div.inline', prev, sel);
    }

    function animSelect(obj, key) {
      return h('select.select', { onchange: e => { if (e.target.value) obj[key] = e.target.value; else delete obj[key]; touch(); } },
        ['', 'slide', 'fade', 'zoom', 'flip', 'bounce', 'rise', 'none'].map(a => h('option', { value: a, selected: (obj[key] || '') === a }, a || '(por defecto)')));
    }

    function sectionForm(s, si) {
      return h('div.ed-form.anim-rise',
        h('h3', 'Apartado'),
        h('div.form-grid',
          field('Título', textIn(s, 'title', { after: renderTree })),
          field('Icono', iconSelect(s), 'Vacío = número del apartado'),
          field('Id', textIn(s, 'id'), 'Cambiarlo reinicia el progreso de sus tarjetas'),
          field('Color', h('input', { type: 'color', value: s.color || '#c8a45d', oninput: e => { s.color = e.target.value; touch(); } }))),
        field('Descripción', areaIn(s, 'description', 2)),
        h('div.row-actions',
          h('button.btn.btn-primary', { onclick: () => addCard(si) }, 'Añadir tarjeta'),
          h('button.btn.btn-danger', {
            onclick: async () => {
              if (await CL.confirmDialog('Eliminar apartado', `¿Eliminar "${s.title}" y sus ${s.cards.length} tarjetas?`, 'Eliminar', true)) {
                deck.sections.splice(si, 1); touch(); select({ kind: 'deck' });
              }
            }
          }, 'Eliminar apartado')));
    }

    function cardForm(s, si, ci) {
      const card = s.cards[ci];
      const fields = FIELDS_BY_TYPE[card.type] || [];
      const preview = h('div.ed-preview');
      const errEl = h('div.json-error');
      const rest = () => {
        const r = {};
        Object.keys(card).forEach(k => { if (!COMMON.includes(k) && !fields.includes(k)) r[k] = card[k]; });
        return r;
      };

      const refreshPreview = CL.debounce(() => {
        if (preview._cleanup) preview._cleanup();
        preview.innerHTML = '';
        const T = CL.deck.TYPES[card.type] || { label: card.type };
        const resolved = CL.deck.resolveCard(CL.clone(card), deck, store.settings().preferredLang);
        const fake = { settings: store.settings(), lang: resolved.lang, state: null, deck, section: s, complete() { }, attempt() { }, saveData() { } };
        const body = CL.cards.render(resolved, fake);
        preview._cleanup = body._cleanup;
        preview.appendChild(h('article.card-shell.preview-shell',
          h('header.card-head', h('span.type-chip', I(card.type), T.label), h('h2.card-title', CL.noEmoji(card.title || '')), h('span.xp-badge', '+' + CL.deck.cardXp(card) + ' XP')),
          body));
      }, 450);
      const changed = () => { touch(); refreshPreview(); };

      const typeSel = h('select.select', {
        onchange: async e => {
          const t = e.target.value;
          if (await CL.confirmDialog('Cambiar tipo', 'Se sustituirá el contenido por la plantilla del nuevo tipo. ¿Continuar?', 'Cambiar')) {
            const tpl = CL.clone(CL.deck.TEMPLATES[t]);
            s.cards[ci] = Object.assign(tpl, { id: card.id, title: card.title || tpl.title });
            touch(); renderTree(); renderPanel();
          } else e.target.value = card.type;
        }
      }, Object.entries(CL.deck.TYPES).map(([t, T]) => h('option', { value: t, selected: t === card.type }, T.label)));

      const secSel = h('select.select', {
        onchange: e => {
          const to = +e.target.value;
          const [c] = s.cards.splice(ci, 1);
          c.id = uniqueId(deck.sections[to].cards, c.id);
          deck.sections[to].cards.push(c);
          touch(); select({ kind: 'card', si: to, ci: deck.sections[to].cards.length - 1 });
        }
      }, deck.sections.map((x, k) => h('option', { value: k, selected: k === si }, x.title)));

      const textEditors = fields.map(f => {
        const lang = TEXT_FIELDS[f] === 'md' ? 'text' : TEXT_FIELDS[f] === 'js' ? (card.lang || deck.language || 'js') : TEXT_FIELDS[f];
        const ed = CL.codeEditor({
          value: card[f] ?? '', lang, minLines: TEXT_FIELDS[f] === 'md' ? 3 : 5, wrap: TEXT_FIELDS[f] === 'md',
          onChange: v => { if (v === '') delete card[f]; else card[f] = v; changed(); }
        });
        return field(f + (TEXT_FIELDS[f] === 'md' ? ' (markdown)' : ''), ed.el);
      });

      const restEd = CL.codeEditor({
        value: JSON.stringify(rest(), null, 2), lang: 'json', minLines: 8,
        onChange: v => {
          let obj;
          try { obj = JSON.parse(v || '{}'); errEl.textContent = ''; }
          catch (e) { errEl.textContent = 'JSON no válido: ' + e.message; return; }
          if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { errEl.textContent = 'Debe ser un objeto { }'; return; }
          Object.keys(card).forEach(k => { if (!COMMON.includes(k) && !fields.includes(k)) delete card[k]; });
          Object.assign(card, obj);
          const warns = [];
          CL.deck.normalize({ sections: [{ title: 'x', cards: [CL.clone(card)] }] }).warnings.forEach(w => warns.push(w.replace(/^"x" › tarjeta 1 /, '')));
          errEl.textContent = warns.join(' · ');
          changed();
        }
      });

      refreshPreview();
      return h('div.ed-card-layout.anim-rise',
        h('div.ed-form',
          h('div.ed-card-top',
            h('h3.grow', 'Tarjeta'),
            h('button.btn.btn-sm', { title: 'Duplicar', onclick: () => { const c = CL.clone(card); c.id = uniqueId(s.cards, c.id); s.cards.splice(ci + 1, 0, c); touch(); select({ kind: 'card', si, ci: ci + 1 }); } }, 'Duplicar'),
            h('button.btn.btn-sm.btn-danger', {
              onclick: async () => {
                if (await CL.confirmDialog('Eliminar tarjeta', `¿Eliminar "${card.title || card.id}"?`, 'Eliminar', true)) { s.cards.splice(ci, 1); touch(); select({ kind: 'section', si }); }
              }
            }, I('delete'))),
          h('div.form-grid',
            field('Tipo', typeSel),
            field('Apartado', secSel),
            field('Título', textIn(card, 'title', { after: () => { renderTree(); refreshPreview(); } })),
            field('Id', textIn(card, 'id'))),
          textEditors,
          field('Resto de campos (JSON)', restEd.el, 'options, answer, tests, steps, hints, xp, animation, color…  (ver SKILL.md)'),
          errEl),
        h('div.ed-preview-col', h('div.ed-preview-head', h('span', 'Vista previa'), h('button.icon-btn.sm', { title: 'Actualizar', onclick: refreshPreview }, I('refresh'))), preview));
    }

    /* ---------- JSON completo ---------- */
    function rawJson() {
      const ed = CL.codeEditor({ value: JSON.stringify(clean(), null, 2), lang: 'json', minLines: 24 });
      const err = h('div.json-error');
      CL.modal({
        title: 'JSON del mazo', wide: true, body: h('div.raw-json', ed.el, err),
        actions: [{ label: 'Cancelar' }, {
          label: 'Aplicar cambios', primary: true, onClick: () => {
            try {
              const { deck: d, warnings } = CL.deck.normalize(JSON.parse(ed.get()));
              if (d.id !== deck.id) { store.deleteDeck(deck.id); }
              deck = d; store.saveDeck(deck);
              if (warnings.length) CL.toast(warnings.length + ' avisos: ' + warnings[0], 'info', 5000); else CL.toast('JSON aplicado', 'ok');
              if (location.hash !== '#/edit/' + deck.id) location.hash = '#/edit/' + deck.id; else { sel = { kind: 'deck' }; renderTree(); renderPanel(); }
            } catch (e) { err.textContent = e.message; return false; }
          }
        }]
      });
    }

    /* ---------- Comprobación automática ---------- */
    async function validateAll() {
      const list = h('div.validate-list');
      const m = CL.modal({ title: 'Comprobando el mazo…', wide: true, body: list });
      const { warnings } = CL.deck.normalize(deck);
      warnings.forEach(w => list.appendChild(h('div.vrow.v-warn', w)));
      let checked = 0, bad = 0, skipped = 0;
      // Cada variante de lenguaje se comprueba por separado; los lenguajes "de IDE" no se pueden ejecutar aquí
      const items = [];
      for (const s of deck.sections) for (const card of s.cards) {
        const langs = CL.deck.variantLangs(card);
        (langs.length ? langs : [null]).forEach(l => items.push({ s, c: CL.deck.resolveCard(card, deck, l) }));
      }
      for (const { s, c } of items) {
        const where = `${s.title} › ${c.title || c.id}` + (c._langs.length ? ` [${CL.langLabel(c.lang)}]` : '');
        const checkable = (c.type === 'code' && c.solution) || (c.type === 'predict' && c.code && !Array.isArray(c.options));
        if (!checkable) continue;
        if (!CL.canRun(c.lang)) { skipped++; continue; }
        const run = o => CL.runCode(Object.assign({ lang: c.lang, input: c.input, onStatus: t => { if (t) m.el.querySelector('h3').textContent = t; } }, o));
        if (c.type === 'code' && c.solution) {
          const tests = (c.tests || []).slice();
          if (c.expectOutput != null) tests.push({ name: 'expectOutput', output: c.expectOutput });
          const r = await run({ code: c.solution, tests, timeout: c.timeout, wait: c.wait });
          checked++;
          const ok = !r.error && r.passed === r.total;
          if (!ok) bad++;
          list.appendChild(h('div.vrow.' + (ok ? 'v-ok' : 'v-bad'), where + ` — solución: ${r.passed}/${r.total} tests` + (r.error ? ' · ' + r.error.message : '') +
            (!ok ? ' · ' + r.results.filter(x => !x.pass).map(x => `"${x.name}" esperado ${x.expected} obtuvo ${x.got}${x.error ? ' (' + x.error + ')' : ''}`).join('; ') : '')));
          if (c.starter) {
            const r2 = await run({ code: c.starter, tests, timeout: c.timeout, wait: c.wait });
            if (r2.total && r2.passed === r2.total) list.appendChild(h('div.vrow.v-warn', `${where} — el código inicial ya pasa todos los tests`));
          }
        } else if (c.type === 'predict' && c.code && !Array.isArray(c.options)) {
          const r = await run({ code: c.code, wait: 300 });
          checked++;
          const got = r.output.join('\n');
          const ok = [].concat(c.answer, c.alternatives || []).some(a => CL.normAnswer(a, c) === CL.normAnswer(got, c));
          if (!ok) bad++;
          list.appendChild(h('div.vrow.' + (ok ? 'v-ok' : 'v-bad'), where + (ok ? ' — la respuesta coincide con la salida real' : ` — respuesta "${c.answer}" pero la salida real es "${got}"`)));
        }
      }
      m.el.querySelector('h3').textContent = bad ? `${bad} problema(s) en ${checked} comprobaciones` : `Sin problemas · ${checked} comprobaciones, ${warnings.length} avisos`;
      if (skipped) list.appendChild(h('div.vrow.v-warn', `${skipped} reto(s) o predicción(es) en lenguajes que no se ejecutan en el navegador (Java, Kotlin, C++, C#…): revísalos en tu IDE.`));
      if (!checked && !warnings.length) list.appendChild(h('p.muted', 'No hay retos con solución ni predicciones que comprobar.'));
    }

    renderTree(); renderPanel();
    return () => { if (dirty) store.saveDeck(deck); };
  }

  CL.editor = { mount };
})(window.CL);
