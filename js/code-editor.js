/* Editor de código ligero: <textarea> transparente sobre un <pre> resaltado */
(function (CL) {
  'use strict';
  const { h } = CL;

  /**
   * opts: { value, lang, onChange(value), onRun(), minLines, readOnly, placeholder }
   * Devuelve { el, get(), set(v), focus() }
   */
  function codeEditor(opts = {}) {
    const lang = opts.lang || 'js';
    const pre = h('pre.ce-hl', { 'aria-hidden': 'true' });
    const gutter = h('div.ce-gutter');
    const ta = h('textarea.ce-input', {
      spellcheck: false, autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      wrap: opts.wrap ? 'soft' : 'off', readOnly: !!opts.readOnly, placeholder: opts.placeholder || ''
    });
    ta.value = opts.value || '';
    const wrap = h('div.ce' + (opts.wrap ? '.ce-wrap' : ''), { style: { '--ce-min': String(opts.minLines || 6) } },
      opts.wrap ? null : gutter, h('div.ce-scroll', pre, ta));
    wrap.style.fontSize = (CL.store.settings().editorFontSize || 14) + 'px';

    let lineCount = -1;
    function render() {
      const v = ta.value;
      pre.innerHTML = CL.highlight(v, lang) + '\n';
      const n = v.split('\n').length;
      if (lineCount !== n) { lineCount = n; gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); }
      grow();
    }
    // Crece con el contenido hasta un máximo; a partir de ahí hace scroll
    function grow() {
      if (!ta.isConnected) { requestAnimationFrame(() => { if (ta.isConnected) grow(); }); return; }
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight + 2, opts.maxHeight || 560) + 'px';
      sync();
    }
    const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; };

    ta.addEventListener('input', () => { render(); opts.onChange && opts.onChange(ta.value); });
    ta.addEventListener('scroll', sync);

    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    ta.addEventListener('keydown', e => {
      if (opts.readOnly) return;
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); opts.onRun && opts.onRun(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        if (s !== en || e.shiftKey) {
          // indentar / desindentar el bloque seleccionado
          const block = v.slice(ls, en);
          const next = e.shiftKey ? block.replace(/^ {1,2}/gm, '') : block.replace(/^/gm, '  ');
          ins(next, ls, en, 'select');
        } else ins('  ', s, en, 'end');
        fire(); return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const indent = v.slice(ls, s).match(/^\s*/)[0];
        const prev = v[s - 1], nxt = v[s];
        if ('{[('.includes(prev) && prev && pairs[prev] === nxt) {
          ins('\n' + indent + '  \n' + indent, s, en, 'start');
          ta.selectionStart = ta.selectionEnd = s + indent.length + 3;
        } else {
          const extra = /[{[(:]\s*$/.test(v.slice(ls, s)) ? '  ' : '';
          ins('\n' + indent + extra, s, en, 'end');
        }
        fire(); return;
      }
      if (pairs[e.key] && s === en && !e.ctrlKey) {
        const nxt = v[s] || '';
        if ((e.key === '"' || e.key === "'" || e.key === '`') && nxt === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return; }
        if (/[\s)\]};,]|^$/.test(nxt) && !((e.key === "'" || e.key === '"') && /\w/.test(v[s - 1] || ''))) {
          e.preventDefault(); ins(e.key + pairs[e.key], s, en, 'start');
          ta.selectionStart = ta.selectionEnd = s + 1; fire(); return;
        }
      }
      if (')]}'.includes(e.key) && v[s] === e.key && s === en) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return; }
      if (e.key === 'Backspace' && s === en && pairs[v[s - 1]] && pairs[v[s - 1]] === v[s]) {
        e.preventDefault(); ins('', s - 1, s + 1, 'end'); fire(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const block = v.slice(ls, en);
        const allCommented = block.split('\n').every(l => /^\s*\/\//.test(l) || !l.trim());
        ins(allCommented ? block.replace(/^(\s*)\/\/ ?/gm, '$1') : block.replace(/^(\s*)(?=\S)/gm, '$1// '), ls, en, 'select');
        fire();
      }
    });
    // Inserta usando execCommand para conservar el deshacer (Ctrl+Z) del navegador
    function ins(text, a, b, mode) {
      ta.focus();
      ta.setSelectionRange(a, b);
      const ok = document.execCommand && document.execCommand('insertText', false, text);
      if (!ok) ta.setRangeText(text, a, b, 'end');
      if (mode === 'select') ta.setSelectionRange(a, a + text.length);
      else if (mode === 'start') ta.setSelectionRange(a, a);
    }
    function fire() { render(); sync(); opts.onChange && opts.onChange(ta.value); }

    render();
    return {
      el: wrap,
      textarea: ta,
      get: () => ta.value,
      set: v => { ta.value = v; render(); },
      focus: () => ta.focus()
    };
  }

  CL.codeEditor = codeEditor;
})(window.CL);
