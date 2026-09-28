/* Iconos vectoriales propios: geométricos, abstractos y de trazo fino.
 * Todos en viewBox 24x24. La clase "a" marca el detalle en color de acento. */
(function (CL) {
  'use strict';

  const P = {
    brand: '<rect x="3.5" y="7.5" width="11.5" height="13" rx="2.5"/><path class="a" d="M8.5 3.5h9.5a2.5 2.5 0 0 1 2.5 2.5v8.5"/>',

    /* tipos de tarjeta */
    lesson: '<path d="M4 6.5h11"/><path d="M4 12h16"/><path d="M4 17.5h6"/><circle class="a f" cx="15" cy="17.5" r="1.3"/>',
    flashcard: '<rect x="3.5" y="7.5" width="12" height="13" rx="2"/><path d="M8.5 4.5h10a2 2 0 0 1 2 2V12" stroke-dasharray="2.2 2.2"/><path class="a" d="M7 14h5"/>',
    quiz: '<path d="M18.4 7.1A8 8 0 1 0 20 12"/><circle class="a f" cx="14.5" cy="9.5" r="1.6"/>',
    truefalse: '<path d="M12 4a8 8 0 0 0 0 16"/><path class="a" d="M12 4a8 8 0 0 1 8 8"/><path d="M12 7v10"/>',
    predict: '<path d="M3 12c2.5-4 5.5-6 9-6s6.5 2 9 6"/><path d="M5.5 15.5c2 1.7 4.1 2.5 6.5 2.5"/><circle class="a f" cx="12" cy="12" r="2"/>',
    fill: '<path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path class="a" d="M10.5 5h3"/><path d="M8 12h8"/>',
    order: '<path d="M4 6h9"/><path class="a" d="M8 12h12"/><path d="M4 18h13"/>',
    match: '<circle cx="6" cy="7" r="2.5"/><circle class="a" cx="18" cy="17" r="2.5"/><path d="M8.2 8.5l7.6 7" stroke-dasharray="2 2.4"/>',
    code: '<path d="M8.5 6.5 3 12l5.5 5.5"/><path class="a" d="M15.5 6.5 21 12l-5.5 5.5"/><path d="M13.5 4.5l-3 15" opacity=".45"/>',
    trace: '<path d="M3 18c3 0 3-12 6-12s3 12 6 12 3-6 6-6"/><circle class="a f" cx="15" cy="18" r="1.8"/>',
    html: '<path d="M4 8V6a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/><circle class="a" cx="10.5" cy="13.5" r="2.5"/>',

    /* estadísticas */
    streak: '<path d="M5 20v-4"/><path d="M10 20v-8"/><path class="a" d="M15 20V8"/><path d="M20 20V4" opacity=".4"/>',
    level: '<path d="M12 3l8 9-8 9-8-9 5-5.6"/><circle class="a f" cx="12" cy="12" r="1.8"/>',
    xp: '<path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-5"/><path class="a" d="M12 8.5v7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"/><path class="a" d="M18.4 5.6l-1.8 1.8"/>',

    /* meta */
    sections: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect class="a" x="13" y="13" width="7" height="7" rx="1.5"/><path d="M13 7.5h7M7.5 13v7"/>',
    cards: '<rect x="3.5" y="6" width="11" height="14" rx="2"/><path d="M18 8v10a3 3 0 0 1-3 3"/><path class="a" d="M20.5 6v8"/>',
    time: '<path d="M20 12a8 8 0 1 1-4-6.9"/><path class="a" d="M12 7.5V12l3 2"/>',
    author: '<path d="M4 20c4-1 6-3 8-7l4-8"/><path class="a" d="M14.5 17.5H20"/>',

    /* acciones */
    play: '<path d="M7 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8 5v14"/><path class="a" d="M16 5v14"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    first: '<path d="M6 5v14"/><path d="M17 5l-7 7 7 7"/>',
    last: '<path d="M18 5v14"/><path d="M7 5l7 7-7 7"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M20 12H5"/><path d="M10 6l-6 6 6 6"/>',
    forward: '<path d="M4 12h15"/><path d="M14 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6l-5 5m-2 2-5 5"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path class="a" d="M4 4.5v4h4"/>',
    hint: '<circle cx="12" cy="13" r="4.5"/><path class="a" d="M12 3.5v2M5 6.5l1.4 1.4M19 6.5l-1.4 1.4"/><path d="M10.5 21h3"/>',
    solution: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M17 12v3.5"/><path class="a" d="M20.5 12v2.5"/>',
    edit: '<path d="M5 19l1-4L16 5l3 3L9 18z"/><path class="a" d="M13.5 7.5l3 3"/>',
    download: '<path d="M12 3.5v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path class="a" d="M4.5 20h15"/>',
    delete: '<path d="M4.5 7h15"/><path d="M6.5 7l1 12.5h9L17.5 7"/><path class="a" d="M10 4h4"/>',
    add: '<path d="M12 4.5v5.5m0 4v5.5"/><path class="a" d="M4.5 12h15"/>',
    open: '<path d="M3.5 18V6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v1.5"/><path class="a" d="M3.5 18l3-7h15l-3 7z"/>',
    paste: '<rect x="5" y="5" width="14" height="16" rx="2"/><path class="a" d="M9 3.5h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
    create: '<path d="M20 12a8 8 0 1 1-8-8"/><path class="a" d="M12 8.5v7M8.5 12h7"/>',
    sample: '<path d="M12 3c.6 4.8 4.2 8.4 9 9-4.8.6-8.4 4.2-9 9-.6-4.8-4.2-8.4-9-9 4.8-.6 8.4-4.2 9-9z"/><circle class="a f" cx="12" cy="12" r="1.3"/>',
    backup: '<path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 7v10c0 1.7 3.6 3 8 3"/><path class="a" d="M20 11v6c0 1.7-3.6 3-8 3"/>',
    restore: '<path d="M19.5 12A7.5 7.5 0 1 1 12 4.5c2.8 0 4.8 1.4 6 3.5"/><path class="a" d="M18.5 3.5v4.5H14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path class="a" d="M16 4.5H6.5a2 2 0 0 0-2 2V16"/>',
    json: '<path d="M8 4c-2 0-3 1-3 3v2.5c0 1.5-1 2.5-2 2.5 1 0 2 1 2 2.5V17c0 2 1 3 3 3"/><path class="a" d="M16 4c2 0 3 1 3 3v2.5c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5V17c0 2-1 3-3 3"/>',
    check: '<path d="M4.5 12.5l5 5L20 7"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    test: '<path d="M9 3.5h6"/><path d="M10 3.5v6L4.5 19a1.2 1.2 0 0 0 1 1.8h13a1.2 1.2 0 0 0 1-1.8L14 9.5v-6"/><path class="a" d="M7.5 15h9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5c-2.3 0-4.2-.9-5.7-2"/><circle class="a" cx="12" cy="12" r="2.5"/>',
    duplicate: '<rect x="3.5" y="8.5" width="12" height="12" rx="2"/><path class="a" d="M8.5 5V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H19"/>',
    refresh: '<path d="M20 5v5h-5"/><path d="M19.5 10A8 8 0 1 0 20 14"/>',
    drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle class="a" cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/><circle class="a f" cx="12" cy="16" r="1.3"/>',
    review: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path class="a" d="M18.5 3v4h-4M5.5 21v-4h4"/>',
    palette: '<circle cx="12" cy="12" r="8.5"/><circle class="a f" cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="15.5" cy="10" r="1.1"/>',
    finish: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5" opacity=".5"/><circle class="a f" cx="12" cy="12" r="1.8"/>',
    effort: '<path d="M4 18A9 9 0 0 1 20 12"/><circle class="a f" cx="20" cy="12" r="1.5"/><path d="M4 18h6" opacity=".5"/>',
    drop: '<path d="M12 3.5v12"/><path d="M7 10.5l5 5 5-5"/><path class="a" d="M4 15v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V15"/>',

    /* paneles */
    variables: '<path d="M7 4.5c-1.5 0-2.5.8-2.5 2.5v10c0 1.7 1 2.5 2.5 2.5"/><path d="M17 4.5c1.5 0 2.5.8 2.5 2.5v10c0 1.7-1 2.5-2.5 2.5"/><path class="a" d="M9.5 12h5"/>',
    array: '<rect x="2.5" y="8.5" width="5.5" height="7" rx="1"/><rect class="a" x="9.25" y="8.5" width="5.5" height="7" rx="1"/><rect x="16" y="8.5" width="5.5" height="7" rx="1" stroke-dasharray="2 1.6"/>',
    stack: '<path d="M4 17.5h16" opacity=".5"/><path d="M6 13h12"/><path class="a" d="M8 8.5h8"/>',
    output: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path class="a" d="M7.5 10l3 2.5-3 2.5"/><path d="M13 15h3.5"/>',
    explanation: '<path d="M4 5h16v11H11l-4 3.5V16H4z"/><path class="a" d="M8.5 10.5h7"/>',
    console: '<path d="M4.5 7l5 5-5 5"/><path class="a" d="M12 17.5h7.5"/>',

    /* avisos */
    tip: '<circle cx="12" cy="12" r="3.5"/><path class="a" d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    info: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path class="a" d="M12 11v5.5"/><circle class="a f" cx="12" cy="7.8" r=".9"/>',
    warn: '<path d="M10.3 4.5 3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.5"/><path class="a" d="M12 10v4.5"/>',
    danger: '<path d="M8.3 3.5h7.4l5.3 5.3v7.4l-5.3 5.3H8.3L3 16.2V8.8"/><path class="a" d="M9 12h6"/>',
    success: '<path d="M20 12a8 8 0 1 1-4-6.9"/><path class="a" d="M8.5 12.5l2.5 2.5 6-6.5"/>',
    note: '<path d="M5 4.5h10l4 4v11H5z"/><path class="a" d="M8.5 12h7M8.5 15.5h4"/>',
    example: '<path d="M4 20l6-6"/><rect class="a" x="10" y="4" width="10" height="10" rx="2"/>'
  };

  const ALIASES = { warning: 'warn', error: 'danger', flash: 'flashcard', book: 'lesson', 'true-false': 'truefalse', star: 'level', fire: 'streak', gem: 'xp' };

  function svg(name, cls) {
    const key = P[name] ? name : ALIASES[name];
    if (!key) return '';
    return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[key]}</svg>`;
  }

  /** Devuelve un <svg> como nodo (o null si no existe el icono) */
  function icon(name, cls) {
    const s = svg(name, cls);
    if (!s) return null;
    const t = document.createElement('template');
    t.innerHTML = s;
    return t.content.firstChild;
  }

  const has = name => !!(P[name] || ALIASES[name]);

  /* ---------- Marca abstracta generada a partir de un texto (para mazos) ---------- */
  function hash(s) {
    let x = 2166136261;
    for (const c of String(s)) { x ^= c.codePointAt(0); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function rng(seed) {
    let a = seed || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const arc = (cx, cy, r, a0, a1) => {
    const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map(v => v.toFixed(2)).join(' ');
    return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  };

  /** Composición geométrica única por mazo: arcos, órbitas y un punto dorado */
  function mark(seed, cls) {
    const r = rng(hash(seed));
    const style = Math.floor(r() * 4);
    let body = '';
    const rot = Math.round(r() * 360);
    if (style === 0) {            // órbitas concéntricas abiertas
      [16, 11, 6].forEach((rad, i) => {
        const a0 = r() * Math.PI * 2, span = Math.PI * (1.1 + r() * 0.7);
        body += `<path class="${i === 1 ? 'a' : ''}" d="${arc(24, 24, rad, a0, a0 + span)}"/>`;
      });
      body += `<circle class="a f" cx="24" cy="24" r="2"/>`;
    } else if (style === 1) {     // dos cuadrados girados que se cruzan
      const s = 17 + r() * 5;
      body += `<rect x="${24 - s / 2}" y="${24 - s / 2}" width="${s}" height="${s}" rx="3" transform="rotate(${rot} 24 24)"/>`;
      body += `<rect class="a" x="${24 - s / 2 + 5}" y="${24 - s / 2 + 5}" width="${s}" height="${s}" rx="3" transform="rotate(${rot + 45} 24 24)" stroke-dasharray="${(8 + r() * 10).toFixed(1)} 4"/>`;
    } else if (style === 2) {     // círculo partido y línea
      const a0 = r() * Math.PI * 2;
      body += `<path d="${arc(24, 24, 15, a0, a0 + Math.PI * 1.55)}"/>`;
      body += `<path class="a" d="M${(24 + 15 * Math.cos(a0 + Math.PI * 1.75)).toFixed(1)} ${(24 + 15 * Math.sin(a0 + Math.PI * 1.75)).toFixed(1)}L24 24"/>`;
      body += `<circle class="a f" cx="24" cy="24" r="2.2"/>`;
    } else {                      // tres barras con ritmo
      const hs = [0, 1, 2].map(() => 10 + r() * 20);
      hs.forEach((hh, i) => { body += `<path class="${i === 1 ? 'a' : ''}" d="M${14 + i * 10} ${36} V${36 - hh}"/>`; });
      body += `<path d="M9 36h30" opacity=".35"/>`;
    }
    return `<svg class="mark${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
  }

  /** Nodo de icono para un mazo/apartado: nombre de icono conocido o marca generada */
  function glyph(iconName, seed) {
    const t = document.createElement('template');
    t.innerHTML = iconName && has(iconName) ? svg(iconName) : mark(seed || iconName || 'x');
    return t.content.firstChild;
  }

  /** Quita emojis de textos cortos (títulos, etiquetas) */
  function noEmoji(s) {
    return String(s ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{E0020}-\u{E007F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  }

  CL.icon = icon;
  CL.iconSvg = svg;
  CL.hasIcon = has;
  CL.mark = mark;
  CL.glyph = glyph;
  CL.noEmoji = noEmoji;
  CL.ICON_NAMES = Object.keys(P);
})(window.CL);
