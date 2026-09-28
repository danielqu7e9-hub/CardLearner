/* Ejecuta el código del alumno en Web Workers aislados.
 *
 * Motores:
 *  - JavaScript: un worker nuevo por ejecución (se destruye al terminar o si se cuelga).
 *  - TypeScript: se traduce a JavaScript en un worker con el compilador de TypeScript
 *    (se descarga una vez) y luego se ejecuta como JavaScript.
 *  - Python: Pyodide (CPython compilado a WebAssembly) en un worker persistente,
 *    que se descarga y arranca solo la primera vez.
 *
 * Todos comparten el mismo formato de tests: valor esperado, aserción o salida por consola.
 */
(function (CL) {
  'use strict';

  // Rama estable 0.29 (Python 3.13): la 314.x usa sintaxis que algunos navegadores aún no cargan en workers
  const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
  const TYPESCRIPT_URL = 'https://cdn.jsdelivr.net/npm/typescript@5.9.3/lib/typescript.js';

  /* ================= Utilidades compartidas (se copian dentro de los workers) ================= */

  function fmt(v, depth = 0, seen = new WeakSet(), top = true) {
    if (typeof v === 'string') return top ? v : JSON.stringify(v);
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'bigint') return v + 'n';
    if (typeof v === 'symbol') return v.toString();
    if (typeof v === 'function') return (/^class\s/.test(Function.prototype.toString.call(v)) ? 'class ' : 'ƒ ') + (v.name || '(anónima)') + (/^class/.test(Function.prototype.toString.call(v)) ? '' : '()');
    if (typeof v !== 'object') return String(v);
    if (seen.has(v)) return '[Circular]';
    if (v instanceof Error) return v.name + ': ' + v.message;
    if (v instanceof Date) return v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (typeof Promise !== 'undefined' && v instanceof Promise) return 'Promise {…}';
    if (depth > 4) return Array.isArray(v) ? '[…]' : '{…}';
    seen.add(v);
    let r;
    if (Array.isArray(v)) {
      r = '[' + v.map(x => fmt(x, depth + 1, seen, false)).join(', ') + ']';
    } else if (v instanceof Map) {
      r = 'Map(' + v.size + ') {' + [...v].map(([k, x]) => fmt(k, depth + 1, seen, false) + ' => ' + fmt(x, depth + 1, seen, false)).join(', ') + '}';
    } else if (v instanceof Set) {
      r = 'Set(' + v.size + ') {' + [...v].map(x => fmt(x, depth + 1, seen, false)).join(', ') + '}';
    } else {
      const name = v.constructor && v.constructor !== Object && v.constructor.name ? v.constructor.name + ' ' : '';
      const keys = Object.keys(v);
      r = name + (keys.length ? '{ ' + keys.map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + fmt(v[k], depth + 1, seen, false)).join(', ') + ' }' : '{}');
    }
    seen.delete(v);
    return r;
  }

  function deepEq(a, b, tol) {
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      return tol ? Math.abs(a - b) <= tol : a === b;
    }
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
    if (a instanceof Map) a = Object.fromEntries(a);
    if (a instanceof Set) a = [...a];
    if (a instanceof Date) a = a.toISOString();
    if (typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEq(a[k], b[k], tol));
  }

  function norm(s) { return String(s).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim(); }

  /** Evalúa un test de salida por consola (común a todos los motores) */
  function outputTest(t, outText, r) {
    if (t.output != null) {
      r.expected = String(t.output); r.got = outText;
      r.pass = norm(outText) === norm(t.output);
      return true;
    }
    if (t.logIncludes != null) {
      r.expected = '… ' + t.logIncludes + ' …'; r.got = outText;
      r.pass = norm(outText).includes(norm(t.logIncludes));
      return true;
    }
    return false;
  }

  const SHARED = [fmt, deepEq, norm, outputTest].map(f => f.toString()).join('\n');

  /* ================= Worker de JavaScript ================= */

  function jsWorkerMain() {
    const HEADER_LINES = 3;
    let phase = 'run';
    const output = [];
    let inputLines = [];

    const send = m => postMessage(m);
    const mkLog = level => (...args) => {
      if (phase !== 'run') return;
      const text = args.map(a => fmt(a)).join(' ');
      output.push(text);
      send({ kind: 'log', level, text });
    };
    const con = {
      log: mkLog('log'), info: mkLog('info'), warn: mkLog('warn'), error: mkLog('error'), debug: mkLog('log'),
      table: d => mkLog('log')(Array.isArray(d) ? d.map((r, i) => i + ': ' + fmt(r, 0, new WeakSet(), false)).join('\n') : fmt(d)),
      clear() { }, group: mkLog('info'), groupEnd() { }, assert: (c, ...a) => { if (!c) mkLog('error')('Assertion failed:', ...a); },
      time() { }, timeEnd() { }, count: mkLog('log')
    };
    self.console = con;
    self.alert = m => con.log('[alert] ' + fmt(m));
    // prompt() lee de la entrada que define la tarjeta ("input"), línea a línea
    self.prompt = () => inputLines.length ? inputLines.shift() : null;

    function errLine(e) {
      const m = /<anonymous>:(\d+):(\d+)/.exec((e && e.stack) || '');
      return m ? Math.max(1, +m[1] - HEADER_LINES) : null;
    }

    self.onmessage = async ev => {
      const { code, tests, wait, input } = ev.data;
      inputLines = input != null ? String(input).split('\n') : [];
      const t0 = Date.now();
      let error = null, runner;
      try {
        // Las variables del alumno quedan en el mismo ámbito que la función de evaluación de los tests
        runner = new Function('__clAfter',
          'return (async () => {\n' + code + '\n;return __clAfter((__clE) => eval(__clE));\n})()');
      } catch (e) {
        error = { message: e.name + ': ' + e.message, line: null };
        send({ kind: 'log', level: 'error', text: error.message });
        send({ kind: 'done', error, results: (tests || []).map(t => ({ name: t.name || t.code || t.assert || 'Salida', hidden: !!t.hidden, pass: false, error: 'El código no compila' })), output, time: 0 });
        return;
      }
      let evalFn = null;
      try {
        await runner(async fn => { evalFn = fn; });
      } catch (e) {
        error = { message: (e && e.name ? e.name + ': ' + e.message : fmt(e)), line: errLine(e) };
        send({ kind: 'log', level: 'error', text: error.message, line: error.line });
      }
      if (wait) await new Promise(r => setTimeout(r, wait));
      phase = 'tests';
      const results = [];
      const outText = output.join('\n');
      for (const t of tests || []) {
        const r = { name: t.name || t.code || t.assert || 'Salida', hidden: !!t.hidden };
        try {
          if (error && !evalFn) throw new Error('El código no se pudo ejecutar');
          if (outputTest(t, outText, r)) { /* hecho */ }
          else if (t.assert != null) {
            const v = await evalFn(t.assert);
            r.got = fmt(v, 0, new WeakSet(), false); r.pass = !!v;
          } else if (t.code != null) {
            let v = await evalFn(t.code);
            if (v && typeof v.then === 'function') v = await v;
            r.got = fmt(v, 0, new WeakSet(), false);
            r.expected = fmt(t.expected, 0, new WeakSet(), false);
            r.pass = deepEq(v, t.expected, t.tolerance);
          } else { r.pass = !error; }
        } catch (e) {
          r.pass = false;
          r.error = e && e.name ? e.name + ': ' + e.message : fmt(e);
        }
        results.push(r);
      }
      send({ kind: 'done', error, results, output, time: Date.now() - t0 });
    };

    // Errores no capturados en callbacks asíncronos (setTimeout, etc.) → a la consola
    self.addEventListener('error', e => { e.preventDefault(); mkLog('error')(String(e.message).replace(/^Uncaught /, '')); });
    self.addEventListener('unhandledrejection', e => { e.preventDefault(); mkLog('error')('Promesa rechazada: ' + fmt(e.reason)); });
    send({ kind: 'ready' });
  }

  /* ================= Worker de Python (Pyodide) ================= */

  function pyWorkerMain(PYODIDE_URL) {
    let py = null, loading = null;

    async function boot() {
      importScripts(PYODIDE_URL + 'pyodide.js');
      py = await self.loadPyodide({ indexURL: PYODIDE_URL });
    }

    // Último mensaje y línea de un traceback de Python
    function pyError(e) {
      const text = String((e && e.message) || e);
      const lines = text.trim().split('\n').filter(Boolean);
      const message = lines[lines.length - 1] || text;
      const all = [...text.matchAll(/File "<exec>", line (\d+)/g)];
      return { message, line: all.length ? +all[all.length - 1][1] : null };
    }

    // Convierte un valor de Python a JS para compararlo con el "expected" del JSON
    function toPlain(v) {
      if (v && typeof v.toJs === 'function') {
        const r = v.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
        v.destroy && v.destroy();
        v = r;
      }
      const fix = x => {
        if (x === undefined) return null;
        if (x instanceof Set) return [...x].map(fix);
        if (Array.isArray(x)) return x.map(fix);
        if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = fix(x[k]); return o; }
        if (typeof x === 'bigint' && x <= BigInt(Number.MAX_SAFE_INTEGER) && x >= -BigInt(Number.MAX_SAFE_INTEGER)) return Number(x);
        return x;
      };
      return fix(v);
    }

    // repr() al estilo Python de un valor JSON (para mostrar el "esperado")
    function pyRepr(v) {
      if (v === null || v === undefined) return 'None';
      if (v === true) return 'True';
      if (v === false) return 'False';
      if (typeof v === 'string') return v.includes("'") && !v.includes('"') ? JSON.stringify(v) : "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
      if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
      if (typeof v === 'object') return '{' + Object.keys(v).map(k => pyRepr(k) + ': ' + pyRepr(v[k])).join(', ') + '}';
      return String(v);
    }

    self.onmessage = async ev => {
      const { code, tests, input } = ev.data;
      const send = m => postMessage(m);
      try {
        if (!py) {
          send({ kind: 'status', text: 'Cargando Python… (solo la primera vez, unos segundos)' });
          loading = loading || boot();
          await loading;
        }
      } catch (e) {
        loading = null;
        send({ kind: 'done', error: { message: 'No se pudo cargar Python. Hace falta conexión a internet la primera vez. (' + ((e && e.message) || e) + ')' }, results: [], output: [] });
        return;
      }
      send({ kind: 'started' });

      const t0 = Date.now();
      const output = [];
      let phase = 'run';
      py.setStdout({ batched: s => { if (phase !== 'run') return; output.push(s); send({ kind: 'log', level: 'log', text: s }); } });
      py.setStderr({ batched: s => { if (phase !== 'run') return; send({ kind: 'log', level: 'error', text: s }); } });
      const inputLines = input != null ? String(input).split('\n') : [];
      py.setStdin({ stdin: () => (inputLines.length ? inputLines.shift() : undefined) });

      const ns = py.globals.get('dict')();
      let error = null, ran = false;
      try {
        try { await py.loadPackagesFromImports(code); } catch (e) { /* los imports de la librería estándar no necesitan descarga */ }
        await py.runPythonAsync(code, { globals: ns });
        ran = true;
      } catch (e) {
        error = pyError(e);
        send({ kind: 'log', level: 'error', text: error.message, line: error.line });
      }

      phase = 'tests';
      const results = [];
      const outText = output.join('\n');
      for (const t of tests || []) {
        const r = { name: t.name || t.code || t.assert || 'Salida', hidden: !!t.hidden };
        try {
          if (!ran && (t.code != null || t.assert != null)) throw new Error('El código no se pudo ejecutar');
          if (outputTest(t, outText, r)) { /* hecho */ }
          else if (t.assert != null) {
            const v = py.runPython('bool(' + t.assert + ')', { globals: ns });
            r.got = String(v); r.pass = v === true;
          } else if (t.code != null) {
            py.runPython('__cl_v = (' + t.code + ')', { globals: ns });
            r.got = py.runPython('repr(__cl_v)', { globals: ns });
            r.expected = pyRepr(t.expected);
            r.pass = deepEq(toPlain(ns.get('__cl_v')), t.expected, t.tolerance);
          } else { r.pass = !error; }
        } catch (e) {
          r.pass = false;
          r.error = pyError(e).message;
        }
        results.push(r);
      }
      ns.destroy && ns.destroy();
      send({ kind: 'done', error, results, output, time: Date.now() - t0 });
    };
    postMessage({ kind: 'ready' });
  }

  /* ================= Worker de TypeScript (solo traduce a JS) ================= */

  function tsWorkerMain(TYPESCRIPT_URL) {
    let loaded = false;
    // Decodifica un source map (VLQ) → para cada línea de JS, su línea en el TypeScript original
    function lineMapFrom(mapText) {
      const map = JSON.parse(mapText);
      const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const out = [];
      let srcLine = 0;
      map.mappings.split(';').forEach((line, gi) => {
        let first = null;
        line.split(',').filter(Boolean).forEach(seg => {
          const vals = []; let shift = 0, value = 0;
          for (const ch of seg) {
            const d = B64.indexOf(ch);
            value += (d & 31) << shift;
            if (d & 32) shift += 5;
            else { vals.push(value & 1 ? -(value >> 1) : value >> 1); value = 0; shift = 0; }
          }
          if (vals.length >= 4) { srcLine += vals[2]; if (first == null) first = srcLine; }
        });
        out[gi + 1] = first != null ? first + 1 : null;
      });
      return out;
    }
    self.onmessage = ev => {
      const { program, exprs } = ev.data;
      try {
        if (!loaded) { postMessage({ kind: 'status', text: 'Cargando TypeScript… (solo la primera vez)' }); importScripts(TYPESCRIPT_URL); loaded = true; }
      } catch (e) {
        postMessage({ kind: 'done', error: 'No se pudo cargar TypeScript. Hace falta conexión a internet la primera vez.' });
        return;
      }
      const opts = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, sourceMap: true, removeComments: false };
      const res = ts.transpileModule(program, { compilerOptions: opts, reportDiagnostics: true, fileName: 'main.ts' });
      const diag = (res.diagnostics || []).map(d => {
        const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null;
        return { message: ts.flattenDiagnosticMessageText(d.messageText, '\n'), line: pos ? pos.line + 1 : null };
      });
      const js = res.outputText.replace(/\/\/# sourceMappingURL=.*$/m, '');
      const tx = (exprs || []).map(e => {
        if (e == null) return e;
        const o = ts.transpileModule('(' + e + ');', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
        return o.trim().replace(/;$/, '');
      });
      postMessage({ kind: 'done', js, exprs: tx, diagnostics: diag, lineMap: res.sourceMapText ? lineMapFrom(res.sourceMapText) : null });
    };
  }

  /* ================= Gestión de workers ================= */

  const urls = {};
  function workerSource(kind) {
    if (kind === 'js') return SHARED + '\n(' + jsWorkerMain.toString() + ')()';
    if (kind === 'py') return SHARED + '\n(' + pyWorkerMain.toString() + ')(' + JSON.stringify(PYODIDE_URL) + ')';
    return '(' + tsWorkerMain.toString() + ')(' + JSON.stringify(TYPESCRIPT_URL) + ')';
  }
  function makeWorker(kind, forceData) {
    const src = workerSource(kind);
    if (forceData || !urls[kind]) {
      try { urls[kind] = forceData ? null : URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); } catch (e) { urls[kind] = null; }
      if (!urls[kind]) urls[kind] = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(src);
    }
    return new Worker(urls[kind]);
  }

  const failResult = (tests, message, extra) => Object.assign({
    error: { message }, output: [], passed: 0, total: (tests || []).length,
    results: (tests || []).map(t => ({ name: t.name || t.code || t.assert || 'Salida', hidden: !!t.hidden, pass: false, error: message }))
  }, extra || {});

  /* ---------- JavaScript ---------- */
  function runJs(opts, lineMap) {
    return new Promise(resolve => {
      let w;
      try { w = makeWorker('js'); }
      catch (e) { resolve(failResult(opts.tests, 'Este navegador no permite ejecutar código aislado: ' + e.message)); return; }
      const tests = (opts.tests || []).slice();
      const limit = (opts.timeout || 3000) + (opts.wait || 0);
      const mapLine = l => (lineMap && l && lineMap[l]) || l;
      const timer = setTimeout(() => {
        w.terminate();
        const msg = 'Tiempo agotado (' + limit + ' ms). ¿Hay un bucle infinito?';
        opts.onLog && opts.onLog('error', msg);
        resolve(failResult(tests, msg, { timedOut: true }));
      }, limit);
      let ready = false;
      w.onmessage = ev => {
        const m = ev.data;
        if (m.kind === 'ready') ready = true;
        else if (m.kind === 'log') opts.onLog && opts.onLog(m.level, m.text + (m.line ? ' (línea ' + mapLine(m.line) + ')' : ''));
        else if (m.kind === 'done') {
          clearTimeout(timer); w.terminate();
          if (m.error && m.error.line) m.error.line = mapLine(m.error.line);
          resolve(Object.assign(m, { passed: m.results.filter(r => r.pass).length, total: m.results.length }));
        }
      };
      w.onerror = ev => {
        ev.preventDefault();
        clearTimeout(timer); w.terminate();
        // Si el worker ni siquiera arrancó (p. ej. blob: bloqueado en file://), reintenta con data: URL
        if (!ready && urls.js && urls.js.startsWith('blob:')) {
          urls.js = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(workerSource('js'));
          runJs(opts, lineMap).then(resolve);
          return;
        }
        resolve(failResult(tests, ev.message || 'Error'));
      };
      w.postMessage({ code: String(opts.code || ''), tests, wait: opts.wait || 0, input: opts.input });
    });
  }

  /* ---------- TypeScript ---------- */
  let tsWorker = null;
  function transpileTs(program, exprs, onStatus) {
    return new Promise(resolve => {
      if (!tsWorker) tsWorker = makeWorker('ts');
      tsWorker.onmessage = ev => {
        const m = ev.data;
        if (m.kind === 'status') onStatus && onStatus(m.text);
        else if (m.kind === 'done') { if (typeof m.error === 'string') { tsWorker.terminate(); tsWorker = null; } resolve(m); }
      };
      tsWorker.onerror = ev => { ev.preventDefault(); tsWorker.terminate(); tsWorker = null; resolve({ error: 'No se pudo cargar TypeScript.' }); };
      tsWorker.postMessage({ program, exprs });
    });
  }

  async function runTs(opts) {
    const tests = opts.tests || [];
    const exprs = [];
    tests.forEach(t => { exprs.push(t.code != null ? t.code : null, t.assert != null ? t.assert : null); });
    const tr = await transpileTs(String(opts.code || ''), exprs, opts.onStatus);
    opts.onStatus && opts.onStatus(null);
    if (typeof tr.error === 'string') { opts.onLog && opts.onLog('error', tr.error); return failResult(tests, tr.error); }
    if (tr.diagnostics && tr.diagnostics.length) {
      const d = tr.diagnostics[0];
      const msg = 'Error de sintaxis: ' + d.message;
      opts.onLog && opts.onLog('error', msg + (d.line ? ' (línea ' + d.line + ')' : ''));
      return failResult(tests, 'El código no compila', { error: { message: msg, line: d.line } });
    }
    const jsTests = tests.map((t, i) => Object.assign({}, t,
      t.code != null ? { code: tr.exprs[i * 2] } : null,
      t.assert != null ? { assert: tr.exprs[i * 2 + 1] } : null));
    return runJs(Object.assign({}, opts, { code: tr.js, tests: jsTests }), tr.lineMap);
  }

  /* ---------- Python ---------- */
  let pyWorker = null;
  let pyQueue = Promise.resolve();

  function runPy(opts) {
    const job = pyQueue.then(() => runPyNow(opts));
    pyQueue = job.catch(() => { });
    return job;
  }

  function runPyNow(opts) {
    return new Promise(resolve => {
      const tests = (opts.tests || []).slice();
      if (!pyWorker) {
        try { pyWorker = makeWorker('py'); }
        catch (e) { resolve(failResult(tests, 'Este navegador no permite ejecutar código aislado: ' + e.message)); return; }
      }
      const w = pyWorker;
      const limit = (opts.timeout || 5000) + (opts.wait || 0);
      let timer = null;
      const kill = msg => {
        w.terminate(); if (pyWorker === w) pyWorker = null;
        opts.onStatus && opts.onStatus(null);
        opts.onLog && opts.onLog('error', msg);
        resolve(failResult(tests, msg, { timedOut: true }));
      };
      // La descarga inicial puede tardar: margen amplio hasta que Python arranca
      timer = setTimeout(() => kill('Python tardó demasiado en cargar. Revisa tu conexión.'), 90000);
      w.onmessage = ev => {
        const m = ev.data;
        if (m.kind === 'status') opts.onStatus && opts.onStatus(m.text);
        else if (m.kind === 'started') {
          opts.onStatus && opts.onStatus(null);
          clearTimeout(timer);
          timer = setTimeout(() => kill('Tiempo agotado (' + limit + ' ms). ¿Hay un bucle infinito?'), limit);
        }
        else if (m.kind === 'log') opts.onLog && opts.onLog(m.level, m.text + (m.line ? ' (línea ' + m.line + ')' : ''));
        else if (m.kind === 'done') {
          clearTimeout(timer);
          opts.onStatus && opts.onStatus(null);
          if (!m.results.length && m.error && /No se pudo cargar/.test(m.error.message)) { opts.onLog && opts.onLog('error', m.error.message); w.terminate(); pyWorker = null; }
          resolve(Object.assign(m, { passed: m.results.filter(r => r.pass).length, total: m.results.length }));
        }
      };
      w.onerror = ev => { ev.preventDefault(); clearTimeout(timer); w.terminate(); pyWorker = null; resolve(failResult(tests, 'Error en el motor de Python: ' + (ev.message || ''))); };
      w.postMessage({ code: String(opts.code || ''), tests, input: opts.input });
    });
  }

  /* ================= API ================= */

  const RUNNABLE = { js: 'JavaScript', ts: 'TypeScript', py: 'Python' };

  /** ¿Se puede ejecutar este lenguaje en el navegador? */
  function canRun(lang) { return !!RUNNABLE[CL.langOf(lang)]; }

  /**
   * Ejecuta código. opts: { code, lang, tests, timeout, wait, input, onLog(level,text), onStatus(text|null) }
   * Devuelve Promise<{ error, results, output, time, timedOut, passed, total }>
   */
  function runCode(opts) {
    const L = CL.langOf(opts.lang || 'js');
    if (L === 'py') return runPy(opts);
    if (L === 'ts') return runTs(opts);
    if (L === 'js') return runJs(opts);
    const msg = 'Este lenguaje no se ejecuta en el navegador.';
    return Promise.resolve(failResult(opts.tests, msg, { unsupported: true }));
  }

  CL.runCode = runCode;
  CL.canRun = canRun;
  CL.RUNNABLE_LANGS = RUNNABLE;
})(window.CL);
