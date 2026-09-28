/* Resaltado de sintaxis ligero y sin dependencias.
 * Un único tokenizador genérico configurado por lenguaje (palabras clave, comentarios,
 * cadenas…), más casos especiales para HTML/XML y Markdown. */
(function (CL) {
  'use strict';

  const w = s => new Set(s.split(/\s+/).filter(Boolean));

  const C_LIKE = { line: ['//'], block: [['/*', '*/']], str: ['"', "'"] };
  const JS_KW = 'break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await get set';

  /* Definición de cada lenguaje. Campos:
   *  kw, lit, bi, types: palabras · line/block: comentarios · str: delimitadores de cadena
   *  triple: cadenas """ · deco: @anotaciones · pre: directivas #include · vars: $variables
   *  ci: palabras clave sin distinguir mayúsculas · keyColon: "clave:" como propiedad
   *  macro: nombre! como llamada (Rust) · tmpl: cadenas con plantilla (`…`) */
  const LANGS = {
    js: Object.assign({}, C_LIKE, {
      kw: w(JS_KW), lit: w('true false null undefined NaN Infinity'), tmpl: true, deco: true,
      bi: w('console Math JSON Object Array String Number Boolean Promise Map Set WeakMap Date RegExp Error Symbol BigInt document window globalThis setTimeout setInterval clearTimeout fetch require module exports process')
    }),
    ts: Object.assign({}, C_LIKE, {
      kw: w(JS_KW + ' interface type enum implements private public protected readonly declare namespace abstract as keyof infer is satisfies'),
      lit: w('true false null undefined NaN Infinity'), tmpl: true, deco: true,
      types: w('string number boolean any unknown never void object bigint symbol Record Partial Readonly Pick Omit Promise Array'),
      bi: w('console Math JSON Object Array String Number Promise Map Set Date Error document window')
    }),
    py: {
      line: ['#'], str: ['"', "'"], triple: true, deco: true,
      kw: w('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'),
      lit: w('True False None'),
      bi: w('print len range enumerate zip map filter sorted reversed sum min max abs round int float str bool list dict set tuple type isinstance open input super self cls object Exception ValueError TypeError KeyError IndexError')
    },
    java: Object.assign({}, C_LIKE, {
      deco: true,
      kw: w('abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record sealed permits yield'),
      lit: w('true false null'), types: w('int long short byte char boolean float double void String Integer Long Double Boolean Object List Map Set ArrayList HashMap'),
      bi: w('System Math Arrays Collections Optional')
    }),
    kotlin: Object.assign({}, C_LIKE, {
      deco: true, tmpl: false,
      kw: w('as break class continue do else for fun if in interface is object package return super this throw try typealias val var when while by catch constructor data enum finally get import init inline internal lateinit open override private protected public sealed set suspend companion'),
      lit: w('true false null'), types: w('Int Long Double Float Boolean String Char Unit Any List Map Set MutableList Array'),
      bi: w('println print listOf mapOf setOf mutableListOf arrayOf')
    }),
    c: Object.assign({}, C_LIKE, {
      pre: true,
      kw: w('auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while'),
      lit: w('NULL true false'), types: w('int long short char float double void unsigned signed size_t bool FILE uint8_t uint32_t int32_t int64_t'),
      bi: w('printf scanf malloc free calloc realloc strlen strcpy strcmp memcpy memset fopen fclose puts')
    }),
    cpp: Object.assign({}, C_LIKE, {
      pre: true,
      kw: w('alignas alignof and asm auto break case catch class const constexpr const_cast continue decltype default delete do dynamic_cast else enum explicit export extern for friend goto if inline mutable namespace new noexcept not operator or private protected public register reinterpret_cast return sizeof static static_assert static_cast struct switch template this thread_local throw try typedef typeid typename union using virtual volatile while override final co_await co_return'),
      lit: w('true false nullptr NULL'), types: w('int long short char float double void unsigned signed bool size_t string vector map set unordered_map pair auto'),
      bi: w('std cout cin endl cerr printf make_shared make_unique move')
    }),
    cs: Object.assign({}, C_LIKE, {
      pre: true, deco: false,
      kw: w('abstract as base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual volatile while async await var record get set init yield'),
      lit: w('true false null'), types: w('int long short byte char bool float double decimal void string object dynamic List Dictionary Task'),
      bi: w('Console Math String Linq')
    }),
    go: Object.assign({}, C_LIKE, {
      str: ['"', "'", '`'],
      kw: w('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'),
      lit: w('true false nil iota'), types: w('int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any'),
      bi: w('fmt make len cap append new delete panic recover copy close print println')
    }),
    rust: Object.assign({}, C_LIKE, {
      str: ['"'], macro: true,
      kw: w('as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while'),
      lit: w('true false None Some Ok Err'), types: w('i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box HashMap'),
      bi: w('std')
    }),
    swift: Object.assign({}, C_LIKE, {
      deco: true,
      kw: w('associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as catch is rethrows throw throws try async await self Self super some any'),
      lit: w('true false nil'), types: w('Int Double Float Bool String Character Array Dictionary Set Optional Void'),
      bi: w('print')
    }),
    dart: Object.assign({}, C_LIKE, {
      deco: true,
      kw: w('abstract as assert async await break case catch class const continue default do dynamic else enum export extends extension external factory final finally for get if implements import in is late library mixin new on operator part required rethrow return set static super switch sync this throw try typedef var void while with yield'),
      lit: w('true false null'), types: w('int double num bool String List Map Set Future Stream Object'),
      bi: w('print')
    }),
    php: Object.assign({}, C_LIKE, {
      line: ['//', '#'], vars: true,
      kw: w('abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while yield'),
      lit: w('true false null TRUE FALSE NULL'),
      bi: w('strlen count array_map array_filter explode implode str_replace json_encode json_decode var_dump print_r')
    }),
    rb: {
      line: ['#'], str: ['"', "'"], vars: false,
      kw: w('alias and begin break case class def defined do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield attr_accessor attr_reader require'),
      lit: w('true false nil'), bi: w('puts print p gets each map select reduce')
    },
    lua: {
      line: ['--'], block: [['--[[', ']]']], str: ['"', "'"],
      kw: w('and break do else elseif end for function goto if in local not or repeat return then until while'),
      lit: w('true false nil'), bi: w('print pairs ipairs table string math require type tostring tonumber')
    },
    r: {
      line: ['#'], str: ['"', "'"],
      kw: w('if else repeat while function for in next break return'),
      lit: w('TRUE FALSE NULL NA Inf NaN T F'), bi: w('print c list data.frame library length sum mean paste cat')
    },
    sql: {
      line: ['--'], block: [['/*', '*/']], str: ["'", '"'], ci: true,
      kw: w('select from where and or not insert into values update set delete create table drop alter add column primary key foreign references join inner left right outer full on as group by order having limit offset distinct union all case when then else end is null like in between exists index view default unique check returning with asc desc'),
      lit: w('true false null'), types: w('int integer bigint smallint serial varchar char text boolean date timestamp numeric decimal float real'),
      bi: w('count sum avg min max coalesce now lower upper length round cast')
    },
    sh: {
      line: ['#'], str: ['"', "'"], vars: true,
      kw: w('if then else elif fi for while until do done case esac in function return local export select break continue'),
      lit: w('true false'), bi: w('echo cd ls cat grep sed awk mkdir rm cp mv chmod sudo npm node git curl pwd touch source exit printf read')
    },
    ps: {
      line: ['#'], block: [['<#', '#>']], str: ['"', "'"], vars: true, ci: true,
      kw: w('if else elseif foreach for while do switch function return param begin process end try catch finally throw'),
      lit: w('$true $false $null'), bi: w('write-host write-output get-childitem set-location get-content')
    },
    css: {
      block: [['/*', '*/']], str: ['"', "'"], keyColon: true,
      kw: w('@media @import @keyframes @font-face @supports important'), lit: w('none auto inherit initial'), bi: w('var calc rgba rgb hsl url min max clamp')
    },
    json: { str: ['"'], keyColon: true, lit: w('true false null') },
    yaml: { line: ['#'], str: ['"', "'"], keyColon: true, lit: w('true false null yes no on off ~') },
    toml: { line: ['#'], str: ['"', "'"], triple: true, keyEquals: true, lit: w('true false') },
    generic: { line: ['//', '#'], block: [['/*', '*/']], str: ['"', "'"] }
  };

  const ALIASES = {
    javascript: 'js', jsx: 'js', mjs: 'js', cjs: 'js', node: 'js', nodejs: 'js',
    typescript: 'ts', tsx: 'ts',
    python: 'py', python3: 'py', py3: 'py',
    kt: 'kotlin', kts: 'kotlin',
    h: 'c', 'c++': 'cpp', cc: 'cpp', hpp: 'cpp', cxx: 'cpp',
    csharp: 'cs', 'c#': 'cs', dotnet: 'cs',
    golang: 'go', rs: 'rust',
    ruby: 'rb', bash: 'sh', shell: 'sh', zsh: 'sh', console: 'sh', terminal: 'sh',
    powershell: 'ps', ps1: 'ps', pwsh: 'ps',
    postgres: 'sql', postgresql: 'sql', mysql: 'sql', sqlite: 'sql', plsql: 'sql',
    scss: 'css', sass: 'css', less: 'css',
    yml: 'yaml', jsonc: 'json', json5: 'json',
    xml: 'html', svg: 'html', vue: 'html', svelte: 'html', htm: 'html',
    md: 'markdown',
    text: 'text', plain: 'text', txt: 'text', output: 'text', plaintext: 'text'
  };

  /** Nombre canónico del lenguaje ('' o undefined → js) */
  function langOf(lang) {
    const l = String(lang || 'js').toLowerCase().trim();
    if (LANGS[l] || l === 'html' || l === 'markdown' || l === 'text') return l;
    return ALIASES[l] || 'generic';
  }

  const e = s => CL.esc(s);
  // Los tokens multilínea se parten por línea para no romper el anidado de <span>
  const wrap = (c, t) => t.split('\n').map(p => p ? `<span class="${c}">${e(p)}</span>` : '').join('\n');

  function highlight(code, lang) {
    code = String(code ?? '');
    const L = langOf(lang);
    if (L === 'text') return e(code);
    if (L === 'html') return highlightHtml(code);
    if (L === 'markdown') return highlightMd(code);
    return tokenize(code, LANGS[L], L);
  }

  function tokenize(code, D, name) {
    let out = '', i = 0;
    const n = code.length;
    const at = s => code.startsWith(s, i);
    const lineStart = () => { let k = i - 1; while (k >= 0 && (code[k] === ' ' || code[k] === '\t')) k--; return k < 0 || code[k] === '\n'; };

    while (i < n) {
      const ch = code[i];
      let m;

      if (/\s/.test(ch)) { let j = i; while (j < n && /\s/.test(code[j])) j++; out += e(code.slice(i, j)); i = j; continue; }

      // comentarios de bloque (antes que los de línea: "--[[" en Lua)
      const blk = (D.block || []).find(([o]) => at(o));
      if (blk) {
        const end = code.indexOf(blk[1], i + blk[0].length);
        const j = end < 0 ? n : end + blk[1].length;
        out += wrap('tk-com', code.slice(i, j)); i = j; continue;
      }
      if ((D.line || []).some(t => at(t))) {
        let j = code.indexOf('\n', i); if (j < 0) j = n;
        out += wrap('tk-com', code.slice(i, j)); i = j; continue;
      }

      // directivas del preprocesador (#include, #define…)
      if (D.pre && ch === '#' && lineStart()) {
        let j = code.indexOf('\n', i); if (j < 0) j = n;
        const line = code.slice(i, j);
        const mm = /^#\s*\w+/.exec(line);
        out += `<span class="tk-kw">${e(mm[0])}</span>` + wrap('tk-str', line.slice(mm[0].length)); i = j; continue;
      }

      // cadenas triples (Python / TOML)
      if (D.triple && (at('"""') || at("'''"))) {
        const q = code.slice(i, i + 3);
        const end = code.indexOf(q, i + 3);
        const j = end < 0 ? n : end + 3;
        out += wrap('tk-str', code.slice(i, j)); i = j; continue;
      }

      // cadenas (con prefijos f"", r"", b"" en Python y @"" / $"" en C#)
      const quotes = (D.str || []).concat(D.tmpl ? ['`'] : []);
      let pre = 0;
      if (/[a-zA-Z@$]/.test(ch) && quotes.includes(code[i + 1]) && /^[fFrRbBuU@$]$/.test(ch) && !/[\w$]/.test(code[i - 1] || '')) pre = 1;
      if (quotes.includes(code[i + pre])) {
        const q = code[i + pre];
        let j = i + pre + 1;
        const multi = q === '`';
        while (j < n && code[j] !== q && (multi || code[j] !== '\n')) j += code[j] === '\\' ? 2 : 1;
        j = Math.min(n, j + 1);
        const text = code.slice(i, j);
        const isKey = (D.keyColon && /^\s*:/.test(code.slice(j))) || (D.keyEquals && lineStart() && /^\s*=/.test(code.slice(j)));
        out += wrap(isKey ? 'tk-prop' : 'tk-str', text); i = j; continue;
      }

      // números
      if ((m = /^(?:0[xob][\da-f_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:e[+-]?\d+)?[a-z]*|\.\d+)/i.exec(code.slice(i, i + 40))) && !/[\w$]/.test(code[i - 1] || '')) {
        out += `<span class="tk-num">${e(m[0])}</span>`; i += m[0].length; continue;
      }

      // @anotaciones / decoradores
      if (D.deco && ch === '@' && (m = /^@[\w.]+/.exec(code.slice(i, i + 60)))) {
        out += `<span class="tk-bi">${e(m[0])}</span>`; i += m[0].length; continue;
      }
      // $variables (PHP, shell, PowerShell)
      if (D.vars && ch === '$' && (m = /^\$(?:\{[^}\n]*\}|[\w:]+|[@#?*!$0-9])/.exec(code.slice(i, i + 60)))) {
        const low = m[0].toLowerCase();
        out += `<span class="${D.lit && D.lit.has(low) ? 'tk-lit' : 'tk-prop'}">${e(m[0])}</span>`; i += m[0].length; continue;
      }
      // reglas CSS: @media, !important
      if (name === 'css' && (m = /^[@!][\w-]+/.exec(code.slice(i, i + 40)))) {
        out += `<span class="tk-kw">${e(m[0])}</span>`; i += m[0].length; continue;
      }
      // colores CSS #fff
      if (name === 'css' && (m = /^#[\da-f]{3,8}\b/i.exec(code.slice(i, i + 12)))) {
        out += `<span class="tk-num">${e(m[0])}</span>`; i += m[0].length; continue;
      }

      // identificadores
      if ((m = /^[A-Za-z_À-￿][\wÀ-￿$-]*/.exec(code.slice(i, i + 80)))) {
        let id = m[0];
        if (name !== 'css' && name !== 'yaml') id = id.replace(/-.*$/, ''); // el guion solo es parte del nombre en CSS/YAML
        const rest = code.slice(i + id.length, i + id.length + 40);
        const key = D.ci ? id.toLowerCase() : id;
        let cls = '';
        if (D.keyColon && /^\s*:(?!:)/.test(rest) && (name !== 'css' || !/^\s*:\s*[\w-]+\s*[{,]/.test(rest))) cls = 'tk-prop';
        else if (D.keyEquals && lineStart() && /^\s*=/.test(rest)) cls = 'tk-prop';
        else if (D.kw && D.kw.has(key)) cls = 'tk-kw';
        else if (D.lit && D.lit.has(key)) cls = 'tk-lit';
        else if (D.types && D.types.has(key)) cls = 'tk-type';
        else if (D.bi && D.bi.has(key)) cls = 'tk-bi';
        else if (D.macro && rest[0] === '!') { cls = 'tk-fn'; id += '!'; }
        else if (/^\s*\(/.test(rest)) cls = 'tk-fn';
        else if (/^[A-Z][a-z]/.test(id) && name !== 'sql') cls = 'tk-type';
        out += cls ? `<span class="${cls}">${e(id)}</span>` : e(id);
        i += id.length; continue;
      }

      // operadores y puntuación
      if ((m = /^(?:=>|->|::|[{}()[\];,.:?]|[-+*/%=<>!&|^~]+)/.exec(code.slice(i, i + 4)))) {
        out += `<span class="tk-op">${e(m[0])}</span>`; i += m[0].length; continue;
      }
      out += e(ch); i++;
    }
    return out;
  }

  function highlightHtml(code) {
    // Resalta etiquetas; el contenido de <script> y <style> se resalta con JS y CSS
    let out = '', last = 0;
    const re = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
    let m;
    while ((m = re.exec(code))) {
      out += markup(code.slice(last, m.index));
      if (m[1]) out += markup(m[1]) + tokenize(m[2], LANGS.js, 'js') + markup(m[3]);
      else out += markup(m[4]) + tokenize(m[5], LANGS.css, 'css') + markup(m[6]);
      last = re.lastIndex;
    }
    return out + markup(code.slice(last));
  }

  function markup(code) {
    return e(code)
      .replace(/&lt;!--[\s\S]*?--&gt;/g, c => wrap('tk-com', c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')))
      .replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g, (_, a, tag, attrs, b) =>
        `<span class="tk-op">${a}</span><span class="tk-kw">${tag}</span>` +
        attrs.replace(/([\w:@.-]+)(=)(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;|[^\s&]+)/g, '<span class="tk-prop">$1</span><span class="tk-op">$2</span><span class="tk-str">$3</span>')
          .replace(/(\s)([\w:@.-]+)(?=\s|$)/g, '$1<span class="tk-prop">$2</span>') +
        `<span class="tk-op">${b}</span>`);
  }

  function highlightMd(code) {
    return code.split('\n').map(line => {
      if (/^\s*#{1,6}\s/.test(line)) return `<span class="tk-kw">${e(line)}</span>`;
      if (/^\s*(```|~~~)/.test(line)) return `<span class="tk-com">${e(line)}</span>`;
      if (/^\s*>/.test(line)) return `<span class="tk-com">${e(line)}</span>`;
      return e(line)
        .replace(/^(\s*)([-*+]|\d+\.)(\s)/, '$1<span class="tk-op">$2</span>$3')
        .replace(/(`[^`]+`)/g, '<span class="tk-str">$1</span>')
        .replace(/(\*\*[^*]+\*\*)/g, '<span class="tk-type">$1</span>')
        .replace(/(\[[^\]]+\]\([^)]+\))/g, '<span class="tk-fn">$1</span>');
    }).join('\n');
  }

  const LABELS = {
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java', kotlin: 'Kotlin', c: 'C', cpp: 'C++', cs: 'C#', go: 'Go',
    rust: 'Rust', swift: 'Swift', dart: 'Dart', php: 'PHP', rb: 'Ruby', lua: 'Lua', r: 'R', sql: 'SQL', sh: 'Shell',
    ps: 'PowerShell', css: 'CSS', json: 'JSON', yaml: 'YAML', toml: 'TOML', html: 'HTML', markdown: 'Markdown'
  };

  /** Bloque de código con números de línea. opts.mark: líneas a marcar; opts.label: mostrar el lenguaje */
  function codeBlock(code, lang, opts = {}) {
    const lines = highlight(String(code ?? ''), lang).split('\n');
    const mark = new Set(opts.mark || []);
    const pre = CL.h('pre.code' + (opts.numbers === false ? '' : '.numbered'));
    const label = opts.label !== false && LABELS[langOf(lang)];
    if (label) pre.dataset.lang = label;
    pre.innerHTML = lines.map((l, i) =>
      `<span class="ln${mark.has(i + 1) ? ' ln-mark' : ''}" data-line="${i + 1}">${l || ' '}</span>`).join('');
    return pre;
  }

  CL.highlight = highlight;
  CL.codeBlock = codeBlock;
  CL.langOf = langOf;
  CL.LANG_LABELS = LABELS;
})(window.CL);
