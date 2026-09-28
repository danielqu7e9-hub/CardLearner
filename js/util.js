/* Utilidades generales compartidas por toda la app */
window.CL = window.CL || {};

(function (CL) {
  'use strict';

  /** Crea un elemento: h('div.clase#id', {attrs}, ...hijos) */
  function h(tag, attrs, ...children) {
    const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => {
      if (t === '.') el.classList.add(v); else el.id = v;
    });
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs); attrs = null;
    }
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') {
          for (const [sk, sv] of Object.entries(v)) {
            if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
          }
        }
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') el.value = v;
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    appendAll(el, children);
    return el;
  }

  function appendAll(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'x';
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 8);
  }

  const clone = v => JSON.parse(JSON.stringify(v));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function todayKey(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- Toasts ---------- */
  function toast(msg, kind = 'info', ms = 2600) {
    const root = document.getElementById('toasts');
    const el = h('div.toast.toast-' + kind, msg);
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, actions = [], wide = false, onClose }) {
    const root = document.getElementById('modal-root');
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const box = h('div.modal' + (wide ? '.modal-wide' : ''),
      h('div.modal-head', h('h3', title || ''), h('button.icon-btn', { onclick: close, title: 'Cerrar' }, CL.icon ? CL.icon('close') : '×')),
      h('div.modal-body', body),
      actions.length ? h('div.modal-actions', actions.map(a =>
        h('button.btn' + (a.primary ? '.btn-primary' : '') + (a.danger ? '.btn-danger' : ''), {
          onclick: () => { const r = a.onClick && a.onClick(); if (r !== false) close(); }
        }, a.label))) : null
    );
    const wrap = h('div.modal-backdrop', { onmousedown: e => { if (e.target === wrap) close(); } }, box);
    root.appendChild(wrap);
    document.addEventListener('keydown', onKey);
    return { close, el: box };
  }

  function confirmDialog(title, text, okLabel = 'Aceptar', danger = false) {
    return new Promise(res => {
      let ok = false;
      modal({
        title, body: h('p', text),
        actions: [{ label: 'Cancelar' }, { label: okLabel, primary: !danger, danger, onClick: () => { ok = true; } }],
        onClose: () => res(ok)
      });
    });
  }

  /* ---------- Sonido (WebAudio, sin ficheros) ---------- */
  let actx;
  function sound(kind) {
    if (!CL.store || !CL.store.settings().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { ok: [660, 880], bad: [220, 170], done: [523, 659, 784, 1046], tap: [440] }[kind] || [440];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'sine';
        o.frequency.value = f;
        const t = actx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.05 : 0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + 0.2);
      });
    } catch (e) { /* sin audio */ }
  }

  function download(filename, text, mime = 'application/json') {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copiado al portapapeles', 'ok'); }
    catch (e) {
      const ta = h('textarea', { value: text }); document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); toast('Copiado', 'ok');
    }
  }

  /** Normaliza texto para comparar respuestas escritas. */
  function normAnswer(s, { caseSensitive = false } = {}) {
    let r = String(s ?? '').replace(/\r/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .split('\n').map(l => l.trim().replace(/\s+/g, ' ')).join('\n').trim();
    return caseSensitive ? r : r.toLowerCase();
  }

  Object.assign(CL, { h, esc, slug, uid, clone, shuffle, debounce, todayKey, toast, modal, confirmDialog, sound, download, copyText, normAnswer });
})(window.CL);
