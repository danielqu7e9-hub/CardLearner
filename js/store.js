/* Persistencia local (localStorage). Todo vive en el navegador: sin servidor. */
(function (CL) {
  'use strict';

  const K = { decks: 'cl.decks', settings: 'cl.settings', progress: 'cl.progress.', stats: 'cl.stats' };
  const mem = {};

  function read(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? (key in mem ? mem[key] : fallback) : JSON.parse(v);
    } catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function write(key, value) {
    mem[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { CL.toast && CL.toast('No se pudo guardar (¿almacenamiento lleno o bloqueado?)', 'bad'); return false; }
  }
  function remove(key) { delete mem[key]; try { localStorage.removeItem(key); } catch (e) { } }

  const DEFAULT_SETTINGS = {
    theme: 'auto',          // auto | dark | light
    useDeckTheme: false,    // aplicar colores del mazo (por defecto: paleta de la app)
    accent: '',             // color de acento forzado por el usuario
    fontScale: 1,
    reduceMotion: false,
    sound: true,
    shuffleOptions: true,
    autoAdvance: false,
    editorFontSize: 14,
    preferredLang: ''       // lenguaje preferido cuando una tarjeta trae variantes
  };

  const store = {
    settings() { return Object.assign({}, DEFAULT_SETTINGS, read(K.settings, {})); },
    saveSettings(patch) { write(K.settings, Object.assign(store.settings(), patch)); },

    decks() { return read(K.decks, {}); },
    deck(id) { return store.decks()[id] || null; },
    saveDeck(deck) {
      const all = store.decks();
      deck.updatedAt = new Date().toISOString();
      all[deck.id] = deck;
      return write(K.decks, all);
    },
    deleteDeck(id) {
      const all = store.decks();
      delete all[id];
      write(K.decks, all);
      remove(K.progress + id);
    },

    progress(deckId) { return read(K.progress + deckId, { cards: {}, xp: 0 }); },
    saveProgress(deckId, p) { write(K.progress + deckId, p); },
    resetProgress(deckId) { remove(K.progress + deckId); },

    cardState(deckId, cardKey) { return store.progress(deckId).cards[cardKey] || null; },
    patchCard(deckId, cardKey, patch) {
      const p = store.progress(deckId);
      p.cards[cardKey] = Object.assign({ attempts: 0 }, p.cards[cardKey], patch, { ts: Date.now() });
      store.saveProgress(deckId, p);
      return p.cards[cardKey];
    },

    stats() { return Object.assign({ xp: 0, streak: 0, lastDay: '', best: 0, days: {} }, read(K.stats, {})); },
    /** Suma XP global y actualiza la racha diaria */
    addXp(deckId, amount) {
      const p = store.progress(deckId);
      p.xp = (p.xp || 0) + amount;
      store.saveProgress(deckId, p);
      const s = store.stats();
      const today = CL.todayKey();
      if (s.lastDay !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        s.streak = s.lastDay === CL.todayKey(y) ? s.streak + 1 : 1;
        s.lastDay = today;
      }
      s.best = Math.max(s.best, s.streak);
      s.xp += amount;
      s.days[today] = (s.days[today] || 0) + amount;
      // guardar solo los últimos 60 días
      const keys = Object.keys(s.days).sort();
      while (keys.length > 60) delete s.days[keys.shift()];
      write(K.stats, s);
      return s;
    },

    level(xp) {
      // cada nivel cuesta un poco más que el anterior
      let lvl = 1, need = 100, acc = 0;
      while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
      return { lvl, into: xp - acc, need };
    },

    exportAll() {
      const out = { format: 'cardlearner-backup/v1', decks: store.decks(), settings: store.settings(), stats: store.stats(), progress: {} };
      Object.keys(out.decks).forEach(id => { out.progress[id] = store.progress(id); });
      return out;
    },
    importBackup(b) {
      write(K.decks, Object.assign(store.decks(), b.decks || {}));
      if (b.settings) write(K.settings, b.settings);
      if (b.stats) write(K.stats, b.stats);
      Object.entries(b.progress || {}).forEach(([id, p]) => write(K.progress + id, p));
    }
  };

  CL.store = store;
})(window.CL);
