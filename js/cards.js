/* Renderizadores de cada tipo de tarjeta.
 * Cada renderer recibe (card, ctx) y devuelve un elemento.
 * ctx = { state, lang, complete({correct}), attempt(correct), saveData(patch), settings }
 */
(function (CL) {
  'use strict';
  const { h, md, mdInline, codeBlock } = CL;
  const I = (n, c) => CL.icon(n, c);

  /* ---------------- Componentes compartidos ---------------- */

  function consoleView(opts = {}) {
    const body = h('div.console-body');
    const el = h('div.console' + (opts.compact ? '.console-compact' : ''),
      h('div.console-head', h('span', 'Consola'), h('button.link-btn', { onclick: () => clear() }, 'limpiar')), body);
    let empty = true;
    function placeholder() { body.innerHTML = ''; body.appendChild(h('div.console-empty', opts.placeholder || 'La salida aparecerá aquí')); empty = true; }
    function clear() { placeholder(); }
    function log(level, text) {
      if (empty) { body.innerHTML = ''; empty = false; }
      body.appendChild(h('div.console-line.cl-' + level, text));
      body.scrollTop = body.scrollHeight;
    }
    // Mensaje temporal mientras se carga un motor (p. ej. Python la primera vez)
    let statusEl = null;
    function status(text) {
      if (statusEl) { statusEl.remove(); statusEl = null; }
      if (!text) return;
      if (empty) { body.innerHTML = ''; empty = false; }
      statusEl = h('div.console-line.cl-status', text);
      body.appendChild(statusEl);
    }
    placeholder();
    return { el, log, clear, status };
  }

  /** Bloque ```lenguaje run``` de una lección: editable + botón ejecutar (si el lenguaje se ejecuta aquí) */
  function runnableSnippet(code, lang, input) {
    if (!CL.canRun(lang)) return codeBlock(code, lang);
    const cons = consoleView({ compact: true, placeholder: 'Ejecuta el código para ver la salida (Ctrl+Enter)' });
    const run = async () => {
      cons.clear();
      btn.disabled = true;
      const r = await CL.runCode({ code: ed.get(), lang, input, onLog: cons.log, onStatus: cons.status, wait: 200 });
      btn.disabled = false;
      if (!r.error && !r.output.length) cons.log('info', '(sin salida)');
    };
    const ed = CL.codeEditor({ value: code, lang, onRun: run, minLines: 2 });
    const btn = h('button.btn.btn-sm.btn-primary', { onclick: run }, 'Ejecutar');
    const resetBtn = h('button.btn.btn-sm.btn-icon', { title: 'Restaurar', onclick: () => { ed.set(code); cons.clear(); } }, I('reset'));
    return h('div.snippet', ed.el, h('div.snippet-bar', btn, resetBtn), cons.el);
  }

  /* ---------- Lenguaje preferido y pestañas de lenguaje ---------- */

  const langLabel = l => (CL.LANG_LABELS && CL.LANG_LABELS[CL.langOf(l)]) || l;

  /** Guarda el lenguaje preferido y sincroniza todas las pestañas visibles */
  function setPreferredLang(lang) {
    CL.store.saveSettings({ preferredLang: lang });
    document.querySelectorAll('.code-tabs').forEach(g => g._select && g._select(lang, true));
  }

  /** Pestañas de lenguaje. items: [{ lang, render() }] */
  function langTabs(items, onPick) {
    const bar = h('div.lang-tabs', { role: 'tablist' });
    const body = h('div.lang-body');
    const el = h('div.code-tabs', bar, body);
    let current = null;
    const btns = items.map(it => h('button.lang-tab', {
      role: 'tab', onclick: () => { select(it.lang); setPreferredLang(it.lang); onPick && onPick(it.lang); }
    }, langLabel(it.lang)));
    bar.append(...btns);
    function select(lang, fromSync) {
      const idx = items.findIndex(it => CL.langOf(it.lang) === CL.langOf(lang));
      if (idx < 0 || (fromSync && current === idx)) return;
      current = idx;
      btns.forEach((b, i) => { b.classList.toggle('on', i === idx); b.setAttribute('aria-selected', i === idx); });
      body.replaceChildren(items[idx].render());
    }
    el._select = select;
    const pref = CL.store.settings().preferredLang;
    select(items.some(it => CL.langOf(it.lang) === CL.langOf(pref)) ? pref : items[0].lang);
    return el;
  }

  /** Nombre de fichero sugerido para descargar el código */
  function fileNameFor(lang, code) {
    const L = CL.langOf(lang);
    if (L === 'java') { const m = /public\s+(?:final\s+)?class\s+(\w+)/.exec(code || '') || /class\s+(\w+)/.exec(code || ''); return (m ? m[1] : 'Main') + '.java'; }
    return ({ kotlin: 'Main.kt', cpp: 'main.cpp', c: 'main.c', cs: 'Program.cs', py: 'main.py', ts: 'main.ts', js: 'main.js', go: 'main.go', rust: 'main.rs', swift: 'main.swift', dart: 'main.dart', php: 'index.php', rb: 'main.rb', lua: 'main.lua', r: 'main.R', sql: 'consulta.sql', sh: 'script.sh', ps: 'script.ps1', html: 'index.html', css: 'estilos.css' })[L] || 'codigo.txt';
  }

  function feedback(ok, text) {
    return h('div.feedback.' + (ok ? 'fb-ok' : 'fb-bad'),
      h('span.fb-icon', I(ok ? 'check' : 'cross')),
      h('div', text instanceof Node ? text : h('span', text)));
  }

  function explanationBlock(card) {
    if (!card.explanation) return null;
    return h('div.explanation', h('div.explanation-title', 'Por qué'), md(card.explanation));
  }

  function showResult(slot, card, ok, customText) {
    slot.innerHTML = '';
    slot.appendChild(feedback(ok, customText || (ok ? pick(card.successMessage, ['Correcto.', 'Exacto.', 'Bien resuelto.']) : pick(card.failMessage, ['No es correcto. Revísalo y vuelve a intentarlo.', 'Todavía no. Prueba otra vez.']))));
    if (ok) { const ex = explanationBlock(card); if (ex) slot.appendChild(ex); }
    CL.sound(ok ? 'ok' : 'bad');
  }
  const pick = (custom, list) => custom || list[Math.floor(Math.random() * list.length)];

  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function hintsBlock(card) {
    const hints = [].concat(card.hints || card.hint || []);
    if (!hints.length) return null;
    let shown = 0;
    const list = h('div.hints-list');
    const btn = h('button.btn.btn-sm.btn-ghost', {
      onclick: () => {
        list.appendChild(h('div.hint.anim-rise', h('b', `Pista ${shown + 1} · `), mdInline ? h('span', { html: mdInline(hints[shown]) }) : hints[shown]));
        shown++;
        if (shown >= hints.length) btn.remove(); else btn.textContent = `Otra pista (${hints.length - shown})`;
      }
    }, `Pista${hints.length > 1 ? ' (' + hints.length + ')' : ''}`);
    return h('div.hints', btn, list);
  }

  const optLabel = o => typeof o === 'object' && o ? (o.text ?? o.label ?? '') : o;

  /* ---------------- Renderers ---------------- */

  const R = {};

  R.lesson = (card, ctx) => {
    const el = h('div.card-lesson', md(card.content || ''));
    if (card.code) el.appendChild(card.run === false ? codeBlock(card.code, card.lang || ctx.lang) : runnableSnippet(card.code, card.lang || ctx.lang));
    setTimeout(() => ctx.complete({ correct: true, silent: true }), 400);
    return el;
  };

  R.flashcard = (card, ctx) => {
    const inner = h('div.flip-inner',
      h('div.flip-face.flip-front', md(card.front || ''), h('div.flip-tip', 'Pulsa para girar')),
      h('div.flip-face.flip-back', md(card.back || '')));
    const flip = h('div.flip', { tabindex: 0, role: 'button', 'aria-label': 'Girar tarjeta' }, inner);
    const actions = h('div.flash-actions', { hidden: true },
      h('button.btn.btn-bad-soft', { onclick: () => grade(false) }, 'Repasar más tarde'),
      h('button.btn.btn-ok-soft', { onclick: () => grade(true) }, 'Lo sabía'));
    const toggle = () => { flip.classList.toggle('flipped'); actions.hidden = false; CL.sound('tap'); };
    flip.addEventListener('click', e => { if (!e.target.closest('.snippet, a, .spoiler')) toggle(); });
    flip.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    function grade(ok) {
      actions.hidden = true;
      ctx.complete({ correct: ok, review: !ok });
      CL.toast(ok ? 'Anotado' : 'Queda marcada para repasar', ok ? 'ok' : 'info', 1500);
    }
    return h('div.card-flash', flip, actions, explanationBlock(card));
  };

  function choiceQuestion(card, ctx, { question, code, options, answer, allowMulti = true }) {
    const correct = new Set([].concat(answer));
    const multi = allowMulti && (card.multiple || correct.size > 1);
    const idx = options.map((_, i) => i);
    const order = card.shuffle === false || !ctx.settings.shuffleOptions ? idx : CL.shuffle(idx);
    const result = h('div.result-slot');
    const selected = new Set();
    let locked = false;
    const letters = 'ABCDEFGHIJ';
    const btns = order.map((oi, pos) => {
      const o = options[oi];
      const b = h('button.option', { onclick: () => choose(oi, b) },
        h('span.opt-key' + (multi ? '.opt-box' : ''), multi ? '' : letters[pos]),
        h('span.opt-text', { html: mdInline(String(optLabel(o))) }));
      b.dataset.oi = oi;
      return b;
    });
    const checkBtn = multi ? h('button.btn.btn-primary', { onclick: check }, 'Comprobar') : null;
    const retryBtn = h('button.btn', { hidden: true, onclick: retry }, 'Reintentar');

    function choose(oi, b) {
      if (locked) return;
      if (multi) {
        if (selected.has(oi)) selected.delete(oi); else selected.add(oi);
        b.classList.toggle('selected');
        return;
      }
      selected.clear(); selected.add(oi);
      check();
    }
    function check() {
      if (!selected.size) { CL.toast('Elige al menos una opción', 'info'); return; }
      locked = true;
      const ok = selected.size === correct.size && [...selected].every(i => correct.has(i));
      btns.forEach(b => {
        const oi = +b.dataset.oi;
        b.disabled = true;
        if (correct.has(oi) && (ok || card.revealAnswer)) b.classList.add('correct');
        if (selected.has(oi) && !correct.has(oi)) { b.classList.add('wrong'); shake(b); }
        if (selected.has(oi) && correct.has(oi)) b.classList.add('correct');
      });
      // feedback por opción
      const fbText = [...selected].map(i => options[i] && typeof options[i] === 'object' && options[i].feedback).filter(Boolean).join(' ');
      showResult(result, card, ok, fbText ? h('span', { html: mdInline(fbText) }) : null);
      ctx.attempt(ok);
      if (ok) ctx.complete({ correct: true });
      else retryBtn.hidden = false;
    }
    function retry() {
      locked = false; selected.clear(); retryBtn.hidden = true; result.innerHTML = '';
      btns.forEach(b => { b.disabled = false; b.classList.remove('correct', 'wrong', 'selected'); });
    }
    return h('div.card-quiz',
      question ? md(question) : null,
      code ? codeBlock(code, card.lang || ctx.lang) : null,
      multi ? h('div.muted.small', 'Puede haber varias respuestas correctas') : null,
      h('div.options' + (options.length > 4 || options.some(o => String(optLabel(o)).length > 40) ? '' : '.options-grid'), btns),
      h('div.row-actions', checkBtn, retryBtn, hintsBlock(card)),
      result);
  }

  R.quiz = (card, ctx) => choiceQuestion(card, ctx, { question: card.question, code: card.code, options: card.options || [], answer: card.answer ?? 0 });

  R.truefalse = (card, ctx) => choiceQuestion(Object.assign({}, card, { shuffle: false }), ctx, {
    question: card.statement, code: card.code,
    options: [{ text: 'Verdadero' }, { text: 'Falso' }], answer: card.answer ? 0 : 1, allowMulti: false
  });

  R.predict = (card, ctx) => {
    if (Array.isArray(card.options)) {
      const opts = card.options;
      const ans = typeof card.answer === 'number' ? card.answer : Math.max(0, opts.findIndex(o => CL.normAnswer(optLabel(o)) === CL.normAnswer(card.answer)));
      return h('div', choiceQuestion(card, ctx, { question: card.question || '¿Qué muestra este código por consola?', code: card.code, options: opts, answer: ans, allowMulti: false }), runReal(card, ctx));
    }
    const accepted = [].concat(card.answer, card.alternatives || []).map(a => CL.normAnswer(a, card));
    const multiline = String(card.answer).includes('\n');
    const input = h(multiline ? 'textarea.answer-input.mono' : 'input.answer-input.mono', {
      placeholder: 'Escribe la salida exacta…', rows: multiline ? String(card.answer).split('\n').length + 1 : null,
      onkeydown: e => { if (e.key === 'Enter' && (!multiline || e.ctrlKey)) { e.preventDefault(); check(); } }
    });
    const result = h('div.result-slot');
    function check() {
      const ok = accepted.includes(CL.normAnswer(input.value, card));
      input.classList.toggle('input-ok', ok); input.classList.toggle('input-bad', !ok);
      if (!ok) shake(input);
      showResult(result, card, ok);
      ctx.attempt(ok);
      if (ok) { ctx.complete({ correct: true }); input.readOnly = true; }
    }
    return h('div.card-predict',
      md(card.question || '¿Qué muestra este código por consola?'),
      codeBlock(card.code, card.lang || ctx.lang),
      h('div.answer-row', input, h('button.btn.btn-primary', { onclick: check }, 'Comprobar')),
      h('div.row-actions', hintsBlock(card)),
      result, runReal(card, ctx));
  };

  function runReal(card, ctx) {
    const lang = card.lang || ctx.lang;
    if (!CL.canRun(lang) || card.runnable === false) return null;
    const cons = consoleView({ compact: true });
    cons.el.hidden = true;
    const btn = h('button.btn.btn-sm.btn-ghost', {
      onclick: async () => {
        cons.el.hidden = false; cons.clear();
        await CL.runCode({ code: card.code, lang, input: card.input, onLog: cons.log, onStatus: cons.status, wait: 300 });
      }
    }, 'Ejecutarlo de verdad');
    return h('div.run-real', btn, cons.el);
  }

  R.fill = (card, ctx) => {
    // "texto [[resp|alternativa]] texto"
    const blanks = [];
    const codeEl = h('pre.code.fill-code');
    const src = String(card.code || '');
    let last = 0, html = '';
    src.replace(/\[\[([^\]]+)\]\]/g, (m, inner, off) => {
      html += CL.highlight(src.slice(last, off), card.lang || ctx.lang);
      const answers = inner.split('|');
      blanks.push(answers);
      const w = Math.max(3, ...answers.map(a => a.length)) + 1;
      html += `<input class="blank mono" data-i="${blanks.length - 1}" style="width:${w}ch" autocomplete="off" spellcheck="false">`;
      last = off + m.length;
      return m;
    });
    html += CL.highlight(src.slice(last), card.lang || ctx.lang);
    codeEl.innerHTML = html;
    const inputs = [...codeEl.querySelectorAll('input.blank')];
    inputs.forEach((inp, i) => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (inputs[i + 1]) inputs[i + 1].focus(); else check(); }
    }));
    let focused = inputs[0];
    inputs.forEach(inp => inp.addEventListener('focus', () => { focused = inp; }));

    let bank = null;
    if (card.bank || card.distractors) {
      const words = CL.shuffle(blanks.map(b => b[0]).concat(card.distractors || []));
      bank = h('div.word-bank', words.map(wd => h('button.chip.mono', {
        onclick: () => {
          const target = (focused && !focused.value) ? focused : inputs.find(x => !x.value) || focused;
          if (!target) return;
          target.value = wd; CL.sound('tap');
          const nxt = inputs.find(x => !x.value);
          if (nxt) nxt.focus(); focused = nxt || target;
        }
      }, wd)));
    }
    const result = h('div.result-slot');
    function check() {
      let all = true;
      inputs.forEach((inp, i) => {
        const ok = blanks[i].some(a => CL.normAnswer(a, card) === CL.normAnswer(inp.value, card));
        inp.classList.toggle('input-ok', ok); inp.classList.toggle('input-bad', !ok);
        if (!ok) { all = false; shake(inp); }
      });
      showResult(result, card, all);
      ctx.attempt(all);
      if (all) { ctx.complete({ correct: true }); inputs.forEach(i => { i.readOnly = true; }); }
    }
    setTimeout(() => inputs[0] && inputs[0].focus({ preventScroll: true }), 300);
    return h('div.card-fill',
      card.prompt ? md(card.prompt) : null, codeEl, bank,
      h('div.row-actions', h('button.btn.btn-primary', { onclick: check }, 'Comprobar'), hintsBlock(card)),
      result);
  };

  R.order = (card, ctx) => {
    const lines = (card.lines || []).map(String);
    let order = lines.map((_, i) => i);
    if (lines.length > 1) { let tries = 0; do { order = CL.shuffle(order); } while (order.every((v, i) => lines[v] === lines[i]) && tries++ < 20); }
    const list = h('div.order-list');
    let dragIdx = null;
    function render(flash) {
      list.innerHTML = '';
      order.forEach((li, pos) => {
        const text = lines[li];
        const indent = text.match(/^\s*/)[0].length;
        const row = h('div.order-row', { draggable: true },
          h('span.drag-handle', I('drag')),
          h('code.order-code', { style: { paddingLeft: (indent * 0.6) + 'ch' }, html: CL.highlight(text.trimStart(), card.lang || ctx.lang) }),
          h('span.order-btns',
            h('button.icon-btn.sm', { title: 'Subir', disabled: pos === 0, onclick: () => move(pos, pos - 1) }, I('up')),
            h('button.icon-btn.sm', { title: 'Bajar', disabled: pos === order.length - 1, onclick: () => move(pos, pos + 1) }, I('down'))));
        if (flash === pos) row.classList.add('moved');
        row.addEventListener('dragstart', e => { dragIdx = pos; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', '' + pos); });
        row.addEventListener('dragend', () => row.classList.remove('dragging'));
        row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop-target'); });
        row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
        row.addEventListener('drop', e => { e.preventDefault(); if (dragIdx != null && dragIdx !== pos) move(dragIdx, pos); dragIdx = null; });
        list.appendChild(row);
      });
    }
    function move(from, to) {
      if (locked || to < 0 || to >= order.length) return;
      const [x] = order.splice(from, 1); order.splice(to, 0, x);
      CL.sound('tap'); render(to); result.innerHTML = '';
    }
    let locked = false;
    const result = h('div.result-slot');
    function check() {
      const rows = [...list.children];
      let ok = true;
      order.forEach((li, pos) => {
        const good = lines[li].trim() === lines[pos].trim();
        rows[pos].classList.toggle('row-ok', good); rows[pos].classList.toggle('row-bad', !good);
        if (!good) ok = false;
      });
      showResult(result, card, ok);
      ctx.attempt(ok);
      if (ok) { locked = true; ctx.complete({ correct: true }); }
    }
    render();
    return h('div.card-order',
      md(card.prompt || 'Ordena las líneas para que el código funcione:'), list,
      h('div.row-actions', h('button.btn.btn-primary', { onclick: check }, 'Comprobar'), hintsBlock(card)),
      result);
  };

  R.match = (card, ctx) => {
    const pairs = (card.pairs || []).map(p => Array.isArray(p) ? p : [p.left ?? p.a, p.right ?? p.b]);
    const rightOrder = CL.shuffle(pairs.map((_, i) => i));
    const colors = ['#a8823a', '#9c6f68', '#46618f', '#4f8a68', '#7a5a8a', '#7d7440', '#3f7f8f', '#a8603f'];
    const link = {}; // izq -> der
    let selLeft = null;
    const L = pairs.map((p, i) => h('button.match-item', { onclick: () => { selLeft = i; paint(); } }, h('span', { html: mdInline(String(p[0])) })));
    const Rr = rightOrder.map(ri => h('button.match-item', {
      onclick: () => {
        if (selLeft == null) { CL.toast('Primero elige un elemento de la izquierda', 'info', 1400); return; }
        Object.keys(link).forEach(k => { if (link[k] === ri) delete link[k]; });
        link[selLeft] = ri; selLeft = null; CL.sound('tap'); paint();
      }
    }, h('span', { html: mdInline(String(pairs[ri][1])) })));
    function paint() {
      L.forEach((b, i) => {
        b.classList.toggle('selected', selLeft === i);
        b.style.setProperty('--mc', link[i] != null ? colors[i % colors.length] : 'transparent');
        b.classList.toggle('linked', link[i] != null);
        b.classList.remove('row-ok', 'row-bad');
      });
      Rr.forEach((b, pos) => {
        const ri = rightOrder[pos];
        const li = Object.keys(link).find(k => link[k] === ri);
        b.style.setProperty('--mc', li != null ? colors[li % colors.length] : 'transparent');
        b.classList.toggle('linked', li != null);
        b.classList.remove('row-ok', 'row-bad');
      });
    }
    const result = h('div.result-slot');
    function check() {
      if (Object.keys(link).length < pairs.length) { CL.toast('Empareja todos los elementos', 'info'); return; }
      let ok = true;
      L.forEach((b, i) => { const good = link[i] === i; b.classList.add(good ? 'row-ok' : 'row-bad'); if (!good) ok = false; });
      showResult(result, card, ok);
      ctx.attempt(ok);
      if (ok) ctx.complete({ correct: true });
    }
    return h('div.card-match',
      md(card.prompt || 'Empareja cada elemento:'),
      h('div.match-cols', h('div.match-col', L), h('div.match-col', Rr)),
      h('div.row-actions', h('button.btn.btn-primary', { onclick: check }, 'Comprobar'), hintsBlock(card)),
      result);
  };

  R.code = (card, ctx) => {
    const lang = card.lang || ctx.lang;
    if (!CL.canRun(lang)) return ideChallenge(card, ctx, lang);
    const codeKey = CL.langOf(lang) === 'js' ? 'code' : 'code_' + CL.langOf(lang);
    const saved = ctx.state && ctx.state[codeKey];
    const cons = consoleView();
    const testsEl = h('div.tests');
    const tests = (card.tests || []).slice();
    if (card.expectOutput != null) tests.push({ name: 'La salida por consola es la esperada', output: card.expectOutput });
    const result = h('div.result-slot');
    let fails = 0;
    const ed = CL.codeEditor({
      value: saved != null ? saved : (card.starter || ''), lang, onRun: run, minLines: card.minLines || 8,
      onChange: CL.debounce(v => ctx.saveData({ [codeKey]: v }), 400)
    });
    const runLabel = () => ['Ejecutar'];
    const runBtn = h('button.btn.btn-primary', { onclick: run }, runLabel());
    const solBtn = card.solution ? h('button.btn.btn-ghost', { onclick: showSolution }, 'Ver solución') : null;

    function renderTests(results) {
      testsEl.innerHTML = '';
      if (!tests.length) return;
      const list = results || tests.map(t => ({ name: t.name || t.code || t.assert || 'Salida', pending: true, hidden: t.hidden }));
      testsEl.appendChild(h('div.tests-head', h('span', 'Tests'), results ? h('span.tests-count', `${results.filter(r => r.pass).length}/${results.length}`) : null));
      list.forEach((r, i) => {
        const row = h('div.test-row' + (r.pending ? '.pending' : r.pass ? '.pass' : '.fail'), { style: { animationDelay: i * 60 + 'ms' } },
          h('span.test-icon', r.pending ? h('i.pending-dot') : I(r.pass ? 'check' : 'cross')),
          h('div.test-main', h('div.test-name', { html: mdInline(String(r.hidden && !r.pass && !r.pending ? r.name + ' (oculto)' : r.name)) }),
            !r.pending && !r.pass && !r.hidden ? h('div.test-detail.mono',
              r.error ? 'Error: ' + r.error : [r.expected != null ? 'Esperado: ' + r.expected : null, 'Obtenido: ' + r.got].filter(Boolean).join('   ·   ')) : null));
        testsEl.appendChild(row);
      });
    }

    async function run() {
      runBtn.disabled = true; runBtn.replaceChildren('Ejecutando…');
      cons.clear(); result.innerHTML = '';
      const r = await CL.runCode({ code: ed.get(), lang, tests, input: card.input, timeout: card.timeout, wait: card.wait, onLog: cons.log, onStatus: cons.status });
      runBtn.disabled = false; runBtn.replaceChildren(...runLabel());
      if (!r.error && !r.output.length && !tests.length) cons.log('info', '(sin salida)');
      renderTests(tests.length ? r.results : null);
      const ok = tests.length ? r.passed === r.total && r.total > 0 : !r.error;
      if (tests.length || r.error) {
        showResult(result, card, ok, ok ? null : r.error ? 'Hay un error en tu código. Revisa la consola.' : `Pasan ${r.passed} de ${r.total} tests.`);
      } else if (ok) {
        showResult(result, card, true, 'Código ejecutado.');
      }
      ctx.attempt(ok);
      if (ok) ctx.complete({ correct: true });
      else if (++fails >= 2 && solBtn) solBtn.classList.add('pulse-once');
    }
    async function showSolution() {
      if (!(ctx.state && ctx.state.done) && !(await CL.confirmDialog('¿Ver la solución?', 'Merece la pena intentarlo un poco más: es donde de verdad se aprende.', 'Ver solución'))) return;
      CL.modal({
        title: 'Solución', wide: true,
        body: h('div', codeBlock(card.solution, lang), card.explanation ? md(card.explanation) : null),
        actions: [{ label: 'Copiar al editor', onClick: () => { ed.set(card.solution); ctx.saveData({ [codeKey]: card.solution }); } }, { label: 'Cerrar', primary: true }]
      });
    }
    renderTests();
    return h('div.card-code',
      md(card.prompt || ''),
      ed.el,
      h('div.row-actions',
        runBtn,
        h('button.btn', { title: 'Volver al código inicial', onclick: () => { ed.set(card.starter || ''); ctx.saveData({ [codeKey]: card.starter || '' }); } }, 'Reiniciar'),
        hintsBlock(card), solBtn,
        h('span.muted.small.kbd-hint', 'Ctrl+Enter para ejecutar')),
      h('div.code-out', cons.el, testsEl),
      result);
  };

  /* ---------- Reto para hacer en el IDE (lenguajes que no se ejecutan en el navegador) ---------- */
  function ideChallenge(card, ctx, lang) {
    const L = CL.langOf(lang);
    const codeKey = 'code_' + L;
    const saved = ctx.state && ctx.state[codeKey];
    const fileName = card.fileName || fileNameFor(lang, card.starter || card.solution);
    const result = h('div.result-slot');
    const ed = CL.codeEditor({
      value: saved != null ? saved : (card.starter || ''), lang, minLines: card.minLines || 8,
      onChange: CL.debounce(v => ctx.saveData({ [codeKey]: v }), 400)
    });
    const solBtn = card.solution ? h('button.btn.btn-ghost', { onclick: showSolution }, 'Ver solución') : null;

    // Ejemplos de entrada/salida y casos que debe cumplir (como referencia)
    const examples = Array.isArray(card.examples) && card.examples.length ? h('div.io-examples',
      h('div.panel-title', 'Ejemplos'),
      h('table.io-table', h('thead', h('tr', h('th', 'Entrada'), h('th', 'Salida'))),
        h('tbody', card.examples.map(x => h('tr', h('td', h('pre.io', x.input != null ? String(x.input) : '—')), h('td', h('pre.io', String(x.output ?? '')))))))) : null;
    const cases = Array.isArray(card.tests) && card.tests.length ? h('div.io-examples',
      h('div.panel-title', 'Casos que debe cumplir'),
      h('ul.case-list', card.tests.filter(t => !t.hidden).map(t => h('li',
        t.name ? h('span', { html: mdInline(String(t.name)) }) : null,
        t.code != null ? h('code', t.code + (t.expected !== undefined ? '  →  ' + JSON.stringify(t.expected) : '')) : null)))) : null;

    // Comprobación: el alumno pega la salida que le da su IDE
    let check;
    if (card.expectOutput != null) {
      const out = h('textarea.answer-input.paste-output', { rows: Math.min(10, String(card.expectOutput).split('\n').length + 1), placeholder: 'Pega aquí lo que imprime tu programa' });
      check = h('div.ide-check',
        h('div.ide-expected', h('div.panel-title', 'Salida esperada'), h('pre.io', String(card.expectOutput))),
        h('div.ide-paste', h('div.panel-title', 'Tu salida'), out,
          h('div.row-actions', h('button.btn.btn-primary', {
            onclick: () => {
              const ok = CL.normAnswer(out.value, { caseSensitive: true }) === CL.normAnswer(card.expectOutput, { caseSensitive: true });
              out.classList.toggle('input-ok', ok); out.classList.toggle('input-bad', !ok);
              showResult(result, card, ok, ok ? 'La salida coincide.' : (out.value.trim() ? 'La salida no coincide con la esperada. Revisa espacios y saltos de línea.' : 'Pega primero la salida de tu programa.'));
              ctx.attempt(ok);
              if (ok) ctx.complete({ correct: true });
            }
          }, 'Comprobar salida'))));
    } else {
      check = h('div.row-actions', h('button.btn.btn-primary', {
        onclick: () => { showResult(result, card, true, 'Marcado como resuelto.'); ctx.complete({ correct: true }); }
      }, 'Ya me funciona'));
    }

    async function showSolution() {
      if (!(ctx.state && ctx.state.done) && !(await CL.confirmDialog('¿Ver la solución?', 'Merece la pena intentarlo un poco más: es donde de verdad se aprende.', 'Ver solución'))) return;
      CL.modal({
        title: 'Solución', wide: true,
        body: h('div', codeBlock(card.solution, lang), card.explanation ? md(card.explanation) : null),
        actions: [{ label: 'Copiar', onClick: () => CL.copyText(card.solution) }, { label: 'Cerrar', primary: true }]
      });
    }

    return h('div.card-code.card-ide',
      md(card.prompt || ''),
      examples,
      h('p.ide-note', `${langLabel(lang)} no se ejecuta en el navegador: escribe el código aquí o en tu IDE, ejecútalo allí y comprueba el resultado.`),
      ed.el,
      h('div.row-actions',
        h('button.btn', { onclick: () => CL.copyText(ed.get()) }, 'Copiar código'),
        h('button.btn', { onclick: () => CL.download(fileName, ed.get(), 'text/plain') }, 'Descargar ' + fileName),
        h('button.btn.btn-ghost', { onclick: () => { ed.set(card.starter || ''); ctx.saveData({ [codeKey]: card.starter || '' }); } }, 'Reiniciar'),
        hintsBlock(card), solBtn),
      cases,
      check,
      result);
  }

  /* ---------- Animación paso a paso (traza de ejecución) ---------- */
  R.trace = (card, ctx) => {
    const steps = card.steps || [];
    const lang = card.lang || ctx.lang;
    const code = codeBlock(card.code || '', lang);
    const lineMarker = h('div.trace-marker');
    const codeWrap = h('div.trace-code', code, lineMarker);
    const varsEl = h('div.trace-vars');
    const arraysEl = h('div.trace-arrays');
    const stackEl = h('div.trace-stack');
    const outEl = h('div.trace-out');
    const noteEl = h('div.trace-note');
    const counter = h('span.trace-count');
    const bar = h('div.trace-bar', steps.map((_, i) => h('button.trace-tick', { title: 'Paso ' + (i + 1), onclick: () => go(i) })));
    let i = -1, timer = null, prevVars = {}, prevArrays = {};
    const speeds = { lento: 1800, normal: 1100, 'rápido': 550 };
    let speed = speeds[card.speed] || card.speed || 1100;

    const playBtn = h('button.btn.btn-primary.btn-icon.trace-play', { title: 'Reproducir', onclick: () => (timer ? pause() : play()) }, I('play'));
    const controls = h('div.trace-controls',
      h('button.btn.btn-icon', { title: 'Inicio', onclick: () => { pause(); go(0); } }, I('first')),
      h('button.btn.btn-icon', { title: 'Anterior', onclick: () => { pause(); go(i - 1); } }, I('prev')),
      playBtn,
      h('button.btn.btn-icon', { title: 'Siguiente', onclick: () => { pause(); go(i + 1); } }, I('next')),
      h('select.select', { onchange: e => { speed = +e.target.value; if (timer) { pause(); play(); } } },
        Object.entries(speeds).map(([k, v]) => h('option', { value: v, selected: v === speed }, 'Velocidad: ' + k))),
      counter);

    function allArrays(st) {
      const out = {};
      if (st.array) out[st.arrayName || card.arrayName || 'array'] = st.array;
      Object.assign(out, st.arrays || {});
      return out;
    }

    function go(n) {
      if (!steps.length) return;
      n = Math.max(0, Math.min(steps.length - 1, n));
      const st = steps[n];
      const back = n < i;
      i = n;
      // línea actual
      code.querySelectorAll('.ln-active').forEach(x => x.classList.remove('ln-active'));
      const lines = [].concat(st.line || []);
      lines.forEach(l => { const ln = code.querySelector(`.ln[data-line="${l}"]`); if (ln) ln.classList.add('ln-active'); });
      const first = code.querySelector(`.ln[data-line="${lines[0]}"]`);
      if (first) {
        lineMarker.style.opacity = 1;
        lineMarker.style.transform = `translateY(${first.offsetTop}px)`;
        lineMarker.style.height = first.offsetHeight + 'px';
        const top = first.offsetTop - codeWrap.clientHeight / 2;
        codeWrap.scrollTo({ top: Math.max(0, top), behavior: CL.store.settings().reduceMotion ? 'auto' : 'smooth' });
      } else lineMarker.style.opacity = 0;

      // variables (se arrastran de pasos anteriores salvo que se indique "vars")
      const vars = st.vars || {};
      varsEl.innerHTML = '';
      const entries = Object.entries(vars);
      if (entries.length) {
        varsEl.appendChild(h('div.panel-title', 'Variables'));
        entries.forEach(([k, v]) => {
          const val = typeof v === 'string' && !st.rawStrings ? JSON.stringify(v) : fmtVal(v);
          const changed = !back && (!(k in prevVars) || JSON.stringify(prevVars[k]) !== JSON.stringify(v));
          varsEl.appendChild(h('div.var' + (changed ? '.var-changed' : ''), h('span.var-name.mono', k), h('span.var-val.mono', val)));
        });
      }
      prevVars = vars;

      // arrays con punteros, resaltados e intercambios animados
      arraysEl.innerHTML = '';
      const arrs = allArrays(st);
      Object.entries(arrs).forEach(([name, arr], ai) => {
        const hl = new Set(Array.isArray(st.highlight) ? st.highlight : (st.highlight && st.highlight[name]) || []);
        const ptrs = st.pointers ? (Object.values(st.pointers).every(v => typeof v === 'number') ? (ai === 0 ? st.pointers : {}) : st.pointers[name] || {}) : {};
        const prev = prevArrays[name] || [];
        const cells = arr.map((v, k) => {
          const changed = !back && prev.length && JSON.stringify(prev[k]) !== JSON.stringify(v);
          const p = Object.entries(ptrs).filter(([, idx]) => idx === k).map(([pn]) => pn);
          return h('div.cell-wrap',
            h('div.cell' + (hl.has(k) ? '.cell-hl' : '') + (changed ? '.cell-changed' : '') + ((st.done || []).includes(k) ? '.cell-done' : ''), fmtVal(v)),
            h('div.cell-idx', k),
            p.length ? h('div.cell-ptr', p.join(', ')) : null);
        });
        const row = h('div.arr-row', cells);
        arraysEl.appendChild(h('div.arr', h('div.panel-title', name), row));
        if (st.swap && !back && ai === 0) requestAnimationFrame(() => animateSwap(row, st.swap));
      });
      prevArrays = arrs;

      // pila de llamadas
      stackEl.innerHTML = '';
      if (st.stack && st.stack.length) {
        stackEl.appendChild(h('div.panel-title', 'Pila de llamadas'));
        st.stack.slice().reverse().forEach((f, k) => stackEl.appendChild(h('div.frame' + (k === 0 ? '.frame-top' : ''), f)));
      }

      // salida acumulada
      const outs = [];
      for (let k = 0; k <= n; k++) if (steps[k].output != null) outs.push(...String(steps[k].output).split('\n').map(t => ({ t, fresh: k === n })));
      outEl.innerHTML = '';
      if (outs.length) {
        outEl.appendChild(h('div.panel-title', 'Salida'));
        outEl.appendChild(h('div.console-body', outs.map(o => h('div.console-line' + (o.fresh ? '.fresh' : ''), o.t))));
      }

      noteEl.innerHTML = '';
      if (st.note) { const nm = md(st.note); nm.classList.add('anim-rise'); noteEl.appendChild(nm); }

      [...bar.children].forEach((b, k) => { b.classList.toggle('on', k <= n); b.classList.toggle('cur', k === n); });
      counter.textContent = `Paso ${n + 1} / ${steps.length}`;
      if (n === steps.length - 1) { pause(); ctx.complete({ correct: true }); }
    }

    function animateSwap(row, [a, b]) {
      const ca = row.children[a] && row.children[a].querySelector('.cell');
      const cb = row.children[b] && row.children[b].querySelector('.cell');
      if (!ca || !cb || CL.store.settings().reduceMotion) return;
      const dx = cb.getBoundingClientRect().left - ca.getBoundingClientRect().left;
      [[ca, dx], [cb, -dx]].forEach(([el, d]) => {
        el.animate([{ transform: `translate(${d}px, -26px)` }, { transform: `translate(${d / 2}px, -34px)`, offset: 0.4 }, { transform: 'translate(0,0)' }],
          { duration: Math.min(700, speed * 0.6), easing: 'cubic-bezier(.5,0,.3,1.3)' });
      });
    }

    function play() {
      if (i >= steps.length - 1) go(0);
      playBtn.replaceChildren(I('pause'));
      timer = setInterval(() => { if (i >= steps.length - 1) pause(); else go(i + 1); }, speed);
    }
    function pause() { clearInterval(timer); timer = null; playBtn.replaceChildren(I('play')); }

    const el = h('div.card-trace',
      card.prompt ? md(card.prompt) : null,
      h('div.trace-grid', codeWrap, h('div.trace-side', noteEl, varsEl, arraysEl, stackEl, outEl)),
      bar, controls, explanationBlock(card));
    el._cleanup = pause;
    requestAnimationFrame(() => { go(0); if (card.autoplay) play(); });
    return el;
  };

  function fmtVal(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'object') return JSON.stringify(v).replace(/,/g, ', ').replace(/":/g, '": ');
    return String(v);
  }

  /* ---------- Tarjeta HTML/CSS/JS libre (iframe aislado) ---------- */
  // iframe -> manejador. Se busca por contentWindow en cada mensaje (así no se pierden los primeros).
  const frames = new Map();
  window.addEventListener('message', ev => {
    for (const [frame, handler] of frames) {
      if (!frame.isConnected) continue;
      if (ev.source === frame.contentWindow) handler(ev.data || {});
    }
  });

  R.html = (card, ctx) => {
    const cs = getComputedStyle(document.documentElement);
    const vars = ['--accent', '--accent2', '--bg', '--surface', '--surface2', '--text', '--muted', '--ok', '--bad', '--warn', '--border', '--border-strong', '--code-bg', '--font', '--mono', '--radius']
      .map(v => `${v}:${cs.getPropertyValue(v)}`).join(';');
    const libs = [].concat(card.libs || []).filter(u => /^https:\/\//.test(u)).map(u => `<script src="${CL.esc(u)}"><\/script>`).join('');
    const safe = s => String(s || '').replace(/<\/script/gi, '<\\/script');
    const api = `<script>
      (function(){
        const post = m => parent.postMessage(Object.assign({__cl:1}, m), '*');
        window.CardLearner = {
          complete: () => post({type:'complete', correct:true}),
          fail: (msg) => post({type:'fail', msg: String(msg||'')}),
          attempt: (ok) => post({type:'attempt', correct:!!ok}),
          toast: (msg, kind) => post({type:'toast', msg:String(msg), kind}),
          resize: () => post({type:'height', h: Math.ceil(document.body.getBoundingClientRect().height)})
        };
        addEventListener('DOMContentLoaded', () => new ResizeObserver(() => CardLearner.resize()).observe(document.body));
        addEventListener('load', () => CardLearner.resize());
        window.addEventListener('error', e => post({type:'error', msg: e.message + (e.lineno ? ' (línea ' + e.lineno + ')' : '')}));
      })();
    <\/script>`;
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>:root{${vars};color-scheme:${document.documentElement.dataset.theme || 'dark'}}
      html{background:var(--code-bg)}html,body{margin:0}body{padding:${card.padding ?? 16}px;font-family:var(--font);color:var(--text);background:transparent;font-size:16px;line-height:1.5}
      button{font:inherit;cursor:pointer;border-radius:2px;border:1px solid var(--border-strong);background:transparent;color:var(--text);padding:.4em .85em}
      button:hover{border-color:var(--accent)}input,select,textarea{font:inherit;color:var(--text);background:transparent;border:1px solid var(--border-strong);border-radius:2px;padding:.35em .6em}
      code,pre{font-family:var(--mono)}</style><style>${safe(card.css)}</style>${api}${libs}</head>
      <body>${card.html || ''}<script>${safe(card.js)}<\/script></body></html>`;
    const iframe = h('iframe.html-frame', { sandbox: 'allow-scripts allow-modals', srcdoc: doc, title: card.title || 'Interactivo' });
    const fixedH = typeof card.height === 'number' ? card.height : null;
    iframe.style.height = (fixedH || 200) + 'px';
    const errEl = h('div.result-slot');
    frames.set(iframe, m => {
        if (!m.__cl) return;
        if (m.type === 'height' && !fixedH) iframe.style.height = Math.min(Math.max(m.h + 2, 60), 1400) + 'px';
        else if (m.type === 'complete') { ctx.complete({ correct: true }); showResult(errEl, card, true); }
        else if (m.type === 'attempt') ctx.attempt(m.correct);
        else if (m.type === 'fail') { ctx.attempt(false); showResult(errEl, card, false, m.msg || null); }
        else if (m.type === 'toast') CL.toast(m.msg, m.kind || 'info');
        else if (m.type === 'error') { errEl.innerHTML = ''; errEl.appendChild(feedback(false, 'Error en la tarjeta: ' + m.msg)); }
    });
    iframe.addEventListener('load', () => {
      if ((card.completeOn || 'view') === 'view') setTimeout(() => ctx.complete({ correct: true, silent: true }), 600);
    });
    const el = h('div.card-html', card.prompt ? md(card.prompt) : null, iframe, errEl, h('div.row-actions', hintsBlock(card)), card.completeOn === 'api' ? null : explanationBlock(card));
    el._cleanup = () => frames.delete(iframe);
    return el;
  };

  function render(card, ctx) {
    const r = R[card.type];
    if (!r) return h('div.feedback.fb-bad', `Tipo de tarjeta desconocido: "${card.type}"`);
    try { return r(card, ctx); }
    catch (e) {
      console.error(e);
      return h('div.feedback.fb-bad', 'Error al mostrar la tarjeta: ' + e.message);
    }
  }

  CL.cards = { render, renderers: R };
  CL.consoleView = consoleView;
  CL.runnableSnippet = runnableSnippet;
  CL.langTabs = langTabs;
  CL.setPreferredLang = setPreferredLang;
  CL.langLabel = langLabel;
})(window.CL);
