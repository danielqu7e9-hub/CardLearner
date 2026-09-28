/* Formato de mazo: parseo (.json / .js), normalización y validación */
(function (CL) {
  'use strict';

  const FORMAT = 'cardlearner/v1';

  const TYPES = {
    lesson:    { label: 'Lección',         xp: 5 },
    flashcard: { label: 'Tarjeta',         xp: 5 },
    quiz:      { label: 'Pregunta',        xp: 10 },
    truefalse: { label: 'Verdadero o falso', xp: 5 },
    predict:   { label: 'Predicción',      xp: 10 },
    fill:      { label: 'Completar',       xp: 10 },
    order:     { label: 'Ordenar',         xp: 15 },
    match:     { label: 'Emparejar',       xp: 10 },
    code:      { label: 'Reto',            xp: 25 },
    trace:     { label: 'Paso a paso',     xp: 10 },
    html:      { label: 'Interactivo',     xp: 10 }
  };

  /** Parsea el texto de un fichero .json o .js y devuelve el objeto del mazo */
  function parseText(text, filename = '') {
    const t = String(text).replace(/^﻿/, '').trim();
    try { return JSON.parse(t); } catch (jsonErr) {
      if (/\.json$/i.test(filename)) throw new Error('JSON no válido: ' + jsonErr.message);
    }
    // Fichero .js: admite `export default {...}`, `module.exports = {...}`,
    // `window.X = {...}`, `CardLearner.load({...})`, `const deck = {...}` o un objeto suelto.
    let captured = null;
    const fakeWin = {};
    const mod = { exports: {} };
    const api = { load: d => { captured = d; }, deck: d => { captured = d; } };
    const attempts = [
      'return (' + t.replace(/;\s*$/, '') + ')',
      t.replace(/\bexport\s+default\s+/, 'return ')
        .replace(/^\s*(?:const|let|var)\s+([\w$]+)\s*=/m, 'return ')
    ];
    let lastErr;
    for (const src of attempts) {
      try {
        const r = new Function('window', 'module', 'exports', 'CardLearner', 'globalThis', src)(fakeWin, mod, mod.exports, api, fakeWin);
        const found = captured || (looksLikeDeck(r) && r) || (looksLikeDeck(mod.exports) && mod.exports) ||
          Object.values(fakeWin).find(looksLikeDeck);
        if (found) return found;
      } catch (e) { lastErr = e; }
    }
    throw new Error('No se encontró un mazo válido en el fichero' + (lastErr ? ': ' + lastErr.message : ''));
  }

  function looksLikeDeck(o) {
    return o && typeof o === 'object' && (Array.isArray(o.sections) || Array.isArray(o.cards));
  }

  /** Completa valores por defecto, genera ids y recoge avisos. No lanza salvo error grave. */
  function normalize(raw) {
    if (!looksLikeDeck(raw)) throw new Error('El mazo necesita un array "sections" (o "cards").');
    const warnings = [];
    const d = CL.clone(raw);
    d.format = d.format || FORMAT;
    d.title = d.title || 'Mazo sin título';
    d.id = CL.slug(d.id || d.title);
    d.theme = d.theme && typeof d.theme === 'object' ? d.theme : {};
    if (!d.sections && d.cards) d.sections = [{ id: 'general', title: 'General', cards: d.cards }];
    delete d.cards;

    const secIds = new Set();
    d.sections.forEach((s, si) => {
      if (!s || typeof s !== 'object') { d.sections[si] = s = { title: 'Apartado ' + (si + 1), cards: [] }; warnings.push(`Apartado ${si + 1}: no es un objeto.`); }
      s.title = s.title || 'Apartado ' + (si + 1);
      let sid = CL.slug(s.id || s.title);
      while (secIds.has(sid)) sid += '-' + si;
      secIds.add(sid); s.id = sid;
      if (!Array.isArray(s.cards)) { s.cards = []; warnings.push(`"${s.title}": no tiene "cards".`); }
      const ids = new Set();
      s.cards.forEach((c, ci) => {
        const where = `"${s.title}" › tarjeta ${ci + 1}`;
        if (!c || typeof c !== 'object') { s.cards[ci] = c = { type: 'lesson', content: String(c) }; }
        if (!c.type) { c.type = guessType(c); warnings.push(`${where}: sin "type", se asume "${c.type}".`); }
        c.type = String(c.type).toLowerCase();
        if (!TYPES[c.type]) warnings.push(`${where}: tipo desconocido "${c.type}".`);
        let cid = CL.slug(c.id || c.title || c.type + '-' + (ci + 1));
        while (ids.has(cid)) cid += '-' + ci;
        ids.add(cid); c.id = cid;
        if (c.variants != null && (typeof c.variants !== 'object' || Array.isArray(c.variants))) { warnings.push(`${where}: "variants" debe ser un objeto { lenguaje: { campos } }.`); delete c.variants; }
        const langs = variantLangs(c);
        if (langs.length) langs.forEach(l => validateCard(resolveCard(c, d, l), where + ' [' + l + ']', warnings));
        else validateCard(resolveCard(c, d), where, warnings);
      });
    });
    return { deck: d, warnings };
  }

  function guessType(c) {
    if (c.tests || c.starter) return 'code';
    if (c.steps) return 'trace';
    if (c.options) return 'quiz';
    if (c.front) return 'flashcard';
    if (c.lines) return 'order';
    if (c.pairs) return 'match';
    if (c.html || c.js) return 'html';
    return 'lesson';
  }

  function validateCard(c, where, w) {
    const need = (k, msg) => { if (c[k] == null || c[k] === '') w.push(`${where} (${c.type}): falta "${k}"${msg ? ' — ' + msg : ''}.`); };
    switch (c.type) {
      case 'lesson': need('content'); break;
      case 'flashcard': need('front'); need('back'); break;
      case 'quiz':
        need('question'); need('options'); need('answer', 'índice (o array de índices) de la opción correcta');
        if (Array.isArray(c.options) && c.answer != null) {
          [].concat(c.answer).forEach(a => { if (!(a >= 0 && a < c.options.length)) w.push(`${where}: "answer" ${a} fuera de rango.`); });
        }
        break;
      case 'truefalse': need('statement'); if (typeof c.answer !== 'boolean') w.push(`${where}: "answer" debe ser true o false.`); break;
      case 'predict': need('code'); need('answer'); break;
      case 'fill': need('code'); if (c.code && !/\[\[[^\]]+\]\]/.test(c.code)) w.push(`${where}: "code" no tiene huecos [[respuesta]].`); break;
      case 'order': need('lines'); break;
      case 'match': need('pairs'); break;
      case 'code':
        need('prompt');
        if (CL.canRun && !CL.canRun(c.lang)) {
          // Lenguajes "de IDE": no se ejecutan aquí; la salida esperada permite comprobar lo que pegue el alumno
          if (c.expectOutput == null) w.push(`${where}: en ${c.lang} el reto se hace en el IDE; añade "expectOutput" para poder comprobar la salida.`);
        } else if (!Array.isArray(c.tests) && !c.expectOutput) w.push(`${where}: sin "tests" ni "expectOutput" (se completará al ejecutar).`);
        break;
      case 'trace': need('code'); need('steps'); break;
      case 'html': if (!c.html && !c.js) w.push(`${where}: necesita "html" y/o "js".`); break;
    }
  }

  function stats(deck) {
    let cards = 0, xp = 0;
    deck.sections.forEach(s => s.cards.forEach(c => { cards++; xp += cardXp(c); }));
    return { sections: deck.sections.length, cards, xp };
  }

  /* ---------- Variantes por lenguaje ----------
   * Una tarjeta puede traer su contenido en varios lenguajes:
   *   { type: 'predict', question: '...', variants: { java: { code, answer }, python: { code, answer } } }
   * Los campos de la variante elegida se mezclan sobre los de la tarjeta. */
  const variantLangs = c => (c && c.variants && typeof c.variants === 'object' && !Array.isArray(c.variants)) ? Object.keys(c.variants) : [];

  /** Devuelve la tarjeta resuelta para el lenguaje preferido (o el más adecuado). Añade .lang y ._langs */
  function resolveCard(card, deck, preferred) {
    const langs = variantLangs(card);
    const base = card.lang || (deck && deck.language) || 'javascript';
    if (!langs.length) return Object.assign({}, card, { lang: base, _langs: [] });
    const same = want => want && langs.find(l => CL.langOf(l) === CL.langOf(want));
    const pick = same(preferred) || same(card.lang) || same(deck && deck.language) || langs[0];
    const merged = Object.assign({}, card, card.variants[pick], { lang: pick, _langs: langs });
    delete merged.variants;
    return merged;
  }

  const cardXp = c => c.xp != null ? +c.xp : (TYPES[c.type] ? TYPES[c.type].xp : 5);
  const cardKey = (s, c) => s.id + '/' + c.id;

  function blankDeck() {
    return {
      format: FORMAT, id: CL.uid('mazo'), title: 'Nuevo mazo', description: '', language: 'javascript',
      theme: {},
      sections: [{ id: 'intro', title: 'Introducción', cards: [{ id: 'hola', type: 'lesson', title: 'Primera lección', content: '## Título\n\nEscribe aquí tu lección.' }] }]
    };
  }

  /** Plantillas de tarjeta para el editor */
  const TEMPLATES = {
    lesson: { type: 'lesson', title: 'Nueva lección', content: '## Título\n\nTexto con **negrita**, `código` y [énfasis]{.mark}.\n\n```js run\nconsole.log("Hola");\n```\n\n:::tip\nUn consejo útil.\n:::' },
    flashcard: { type: 'flashcard', title: 'Concepto', front: '¿Qué hace `Array.map`?', back: 'Crea un **nuevo array** aplicando una función a cada elemento.' },
    quiz: { type: 'quiz', title: 'Pregunta', question: '¿Qué imprime `typeof null`?', options: ['"null"', '"object"', '"undefined"'], answer: 1, explanation: 'Es un error histórico de JavaScript.' },
    truefalse: { type: 'truefalse', title: 'V/F', statement: '`const` impide modificar las propiedades de un objeto.', answer: false, explanation: '`const` impide reasignar la variable, no mutar el objeto.' },
    predict: { type: 'predict', title: '¿Qué imprime?', code: 'let a = 2;\na += 3;\nconsole.log(a * 2);', answer: '10', explanation: 'a = 5, 5 * 2 = 10.' },
    fill: { type: 'fill', title: 'Completa', prompt: 'Completa para recorrer el array:', code: 'for ([[const|let]] n [[of]] nums) {\n  console.log(n);\n}', explanation: '`for...of` recorre valores.' },
    order: { type: 'order', title: 'Ordena', prompt: 'Ordena para sumar del 1 al 3:', lines: ['let total = 0;', 'for (let i = 1; i <= 3; i++) {', '  total += i;', '}', 'console.log(total);'] },
    match: { type: 'match', title: 'Empareja', prompt: 'Une cada método con lo que hace:', pairs: [['push', 'Añade al final'], ['pop', 'Quita del final'], ['shift', 'Quita del principio']] },
    code: { type: 'code', title: 'Reto', prompt: 'Escribe `doble(n)` que devuelva el doble de `n`.', starter: 'function doble(n) {\n  // tu código\n}\n', solution: 'function doble(n) {\n  return n * 2;\n}\n', tests: [{ name: 'doble(2) → 4', code: 'doble(2)', expected: 4 }, { name: 'doble(-3) → -6', code: 'doble(-3)', expected: -6 }], hints: ['Usa `return`.'] },
    trace: { type: 'trace', title: 'Paso a paso', code: 'let s = 0;\nfor (let i = 0; i < 3; i++) {\n  s += i;\n}', steps: [{ line: 1, vars: { s: 0 }, note: 'Empezamos con s = 0' }, { line: 2, vars: { s: 0, i: 0 } }, { line: 3, vars: { s: 0, i: 0 }, note: 's += 0' }, { line: 2, vars: { s: 0, i: 1 } }, { line: 3, vars: { s: 1, i: 1 } }, { line: 2, vars: { s: 1, i: 2 } }, { line: 3, vars: { s: 3, i: 2 } }, { line: 4, vars: { s: 3 }, note: 'Fin: s = 3' }] },
    html: { type: 'html', title: 'Demo interactiva', height: 220, html: '<button id="b">Púlsame</button>\n<p id="o"></p>', css: 'button{font-size:18px}', js: 'let n = 0;\nb.onclick = () => {\n  o.textContent = "Clicks: " + (++n);\n  if (n >= 3) CardLearner.complete();\n};', completeOn: 'api' }
  };

  CL.deck = { FORMAT, TYPES, TEMPLATES, parseText, normalize, stats, cardXp, cardKey, blankDeck, looksLikeDeck, resolveCard, variantLangs };
})(window.CL);
