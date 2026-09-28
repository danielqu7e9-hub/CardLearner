/* Markdown seguro (escapa todo el HTML) con extras para tarjetas:
 *  - ```js run      → bloque de código ejecutable
 *  - ```js {2,4}    → resalta líneas 2 y 4
 *  - :::tip Título  … :::   (tip | info | warn | danger | success | note)
 *  - [texto]{.pulse .accent}  → texto con efecto/animación
 *  - ||spoiler||   → texto oculto que se revela al pulsar
 */
(function (CL) {
  'use strict';

  const FX = new Set(['pulse', 'glow', 'shake', 'bounce', 'wiggle', 'typewriter', 'rainbow', 'fade', 'mark', 'float', 'zoom', 'blink',
    'accent', 'accent2', 'ok', 'bad', 'warn', 'muted', 'big', 'small', 'mono', 'underline']);

  function inline(src) {
    const codes = [];
    let s = CL.esc(src).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => safeUrl(url) ? `<img src="${url}" alt="${alt}" loading="lazy">` : alt)
      .replace(/\[([^\]]+)\]\{((?:\s*\.[\w-]+)+)\s*\}/g, (_, txt, cls) => {
        const list = cls.match(/[\w-]+/g).filter(c => FX.has(c));
        const style = list.includes('typewriter') ? ` style="--chars:${txt.replace(/&\w+;/g, 'x').length}"` : '';
        return `<span class="${list.map(c => 'fx-' + c).join(' ')}"${style}>${txt}</span>`;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => safeUrl(url) ? `<a href="${url}" target="_blank" rel="noopener">${t}</a>` : t)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler" tabindex="0" title="Pulsa para revelar">$1</span>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }

  function safeUrl(u) {
    return /^(https?:|data:image\/|\.{0,2}\/|#)/i.test(u.replace(/&amp;/g, '&'));
  }

  const FENCE = /^\s*(```+|~~~+)\s*([\w+#-]*)\s*(.*)$/;

  /** Lee un bloque de código que empieza en la línea i. Devuelve { block, next } */
  function readFence(lines, i) {
    const m = FENCE.exec(lines[i]);
    const fence = m[1], lang = m[2] || 'js', meta = m[3] || '';
    const buf = [];
    i++;
    while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
    const mark = [];
    const mm = /\{([\d,\s-]+)\}/.exec(meta);
    if (mm) mm[1].split(',').forEach(p => {
      const [a, b] = p.split('-').map(Number);
      for (let k = a; k <= (b || a); k++) mark.push(k);
    });
    return { block: { code: buf.join('\n'), lang, run: /\brun\b/.test(meta), mark }, next: i + 1 };
  }

  /** Devuelve { html, blocks } — blocks = bloques de código para montar después */
  function parse(text) {
    const lines = String(text ?? '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let out = '', i = 0;

    const para = [];
    const flush = () => { if (para.length) { out += `<p>${inline(para.join('\n')).replace(/\n/g, '<br>')}</p>`; para.length = 0; } };

    while (i < lines.length) {
      const line = lines[i];
      let m;

      if (FENCE.test(line)) {
        flush();
        // Bloques seguidos (solo separados por líneas vacías) en lenguajes distintos → pestañas
        const group = [];
        let j = i;
        while (j < lines.length && FENCE.test(lines[j])) {
          const r = readFence(lines, j);
          group.push(r.block);
          j = r.next;
          let k = j;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && FENCE.test(lines[k])) j = k; else break;
        }
        const langs = new Set(group.map(b => CL.langOf(b.lang)));
        if (group.length > 1 && langs.size === group.length) {
          blocks.push({ group });
          out += `<div class="md-code" data-block="${blocks.length - 1}"></div>`;
        } else {
          group.forEach(b => { blocks.push(b); out += `<div class="md-code" data-block="${blocks.length - 1}"></div>`; });
        }
        i = j;
        continue;
      }
      if ((m = /^:::\s*(\w+)\s*(.*)$/.exec(line))) {
        flush();
        const kind = m[1].toLowerCase(), title = m[2];
        const buf = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        const inner = parse(buf.join('\n'));
        inner.blocks.forEach((b, k) => { blocks.push(b); inner.html = inner.html.replace(`data-block="${k}"`, `data-block="X${blocks.length - 1}"`); });
        const names = { tip: 'Consejo', info: 'Nota', warn: 'Atención', warning: 'Atención', danger: 'Cuidado', success: 'Bien', note: 'Nota', example: 'Ejemplo' };
        out += `<div class="callout callout-${CL.esc(kind)}"><div class="callout-title">${inline(title || names[kind] || kind)}</div>${inner.html.replace(/data-block="X/g, 'data-block="')}</div>`;
        continue;
      }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
        flush();
        const lvl = Math.min(m[1].length + 1, 5);
        out += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
        i++; continue;
      }
      if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) { flush(); out += '<hr>'; i++; continue; }
      if (/^>\s?/.test(line)) {
        flush();
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out += `<blockquote>${parse(buf.join('\n')).html}</blockquote>`;
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        flush();
        out += parseList();
        continue;
      }
      if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        flush();
        const row = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
        const head = row(line);
        i += 2;
        let body = '';
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body += '<tr>' + row(lines[i++]).map(c => `<td>${c}</td>`).join('') + '</tr>';
        out += `<div class="table-wrap"><table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
        continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      para.push(line);
      i++;
    }
    flush();
    return { html: out, blocks };

    function parseList() {
      const baseIndent = lines[i].match(/^\s*/)[0].length;
      const ordered = /^\s*\d+[.)]/.test(lines[i]);
      let html = ordered ? '<ol>' : '<ul>';
      while (i < lines.length) {
        const l = lines[i];
        const ind = l.match(/^\s*/)[0].length;
        const mm = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(l);
        if (!l.trim()) { i++; if (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) continue; break; }
        if (mm && ind === baseIndent) {
          let item = mm[2];
          const task = /^\[([ xX])\]\s+/.exec(item);
          if (task) item = `<span class="task${task[1].trim() ? ' task-done' : ''}"></span> ` + inline(item.slice(task[0].length));
          else item = inline(item);
          i++;
          if (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && lines[i].match(/^\s*/)[0].length > baseIndent) item += parseList();
          html += `<li>${item}</li>`;
        } else if (mm && ind > baseIndent) {
          html = html.replace(/<\/li>$/, '') + parseList() + '</li>';
        } else if (!mm && ind > baseIndent) {
          html = html.replace(/<\/li>$/, '') + '<br>' + inline(l.trim()) + '</li>';
          i++;
        } else break;
      }
      return html + (ordered ? '</ol>' : '</ul>');
    }
  }

  /** Renderiza a un elemento DOM, montando bloques de código (ejecutables si procede). */
  function md(text, cls = 'md') {
    const { html, blocks } = parse(text);
    const el = CL.h('div.' + cls);
    el.innerHTML = html;
    el.querySelectorAll('.md-code').forEach(ph => {
      const b = blocks[+ph.dataset.block];
      const one = x => x.run && CL.runnableSnippet ? CL.runnableSnippet(x.code, x.lang) : CL.codeBlock(x.code, x.lang, { mark: x.mark });
      ph.replaceWith(b.group && CL.langTabs ? CL.langTabs(b.group.map(x => ({ lang: x.lang, render: () => one(x) }))) : one(b));
    });
    el.querySelectorAll('.spoiler').forEach(sp => {
      const reveal = () => sp.classList.add('revealed');
      sp.addEventListener('click', reveal);
      sp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') reveal(); });
    });
    return el;
  }

  CL.md = md;
  CL.mdInline = inline;
})(window.CL);
