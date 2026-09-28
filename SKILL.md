---
name: cardlearner-deck
description: Genera mazos de tarjetas interactivas para aprender programación en la app CardLearner. Úsala cuando te pidan crear un curso, lección, mazo o tarjetas de aprendizaje (JavaScript u otros lenguajes) con ejercicios, retos de código con tests, animaciones paso a paso o demos interactivas. La salida es un único fichero JSON con el formato "cardlearner/v1".
---

# CardLearner — cómo generar mazos de tarjetas

CardLearner es una app web que **solo procesa tarjetas**: el usuario le carga un fichero `.json` y la app lo convierte en un curso interactivo con progreso, XP, rachas, animaciones y ejecución real de código JavaScript en un entorno aislado.

Tu trabajo: producir **un único JSON válido** con el formato descrito aquí. Nada de texto antes o después si te piden solo el fichero; si estás en un chat, entrega el JSON en un bloque de código ```json y el nombre sugerido del fichero (p. ej. `promesas-js.json`).

---

## 1. Estructura general

```json
{
  "format": "cardlearner/v1",
  "id": "js-arrays",
  "title": "Arrays en JavaScript",
  "description": "Aprende a crear, recorrer y transformar arrays.",
  "author": "IA",
  "icon": "array",
  "language": "javascript",
  "level": "Principiante",
  "estimatedMinutes": 30,
  "lockSections": false,
  "unlockThreshold": 0.8,
  "theme": { "cardAnimation": "slide" },
  "sections": [
    {
      "id": "basicos",
      "title": "Lo básico",
      "icon": "variables",
      "description": "Crear y leer arrays",
      "cards": []
    }
  ]
}
```
(Las tarjetas van dentro de `cards`; ver sección 3.)

| Campo | Obligatorio | Descripción |
|---|---|---|
| `format` | sí | Siempre `"cardlearner/v1"`. |
| `id` | sí | Identificador único en minúsculas con guiones (`kebab-case`). Si cambia, el progreso se pierde. |
| `title` | sí | Título del mazo. |
| `description` | recomendado | Markdown corto (1-3 frases). |
| `icon` | no | Nombre de un icono de la app (ver sección 2.1). Si se omite, la app genera una marca abstracta propia para el mazo. **Nunca emojis.** |
| `language` | recomendado | Lenguaje por defecto del código del mazo (ver sección 2.2). **Solo JavaScript se ejecuta**; los demás se muestran con su coloreado. |
| `level`, `author`, `estimatedMinutes` | no | Metadatos que se muestran en la portada. |
| `lockSections` | no | `true` = hay que completar el apartado anterior (según `unlockThreshold`, 0-1) para desbloquear el siguiente. |
| `theme` | no | Ver sección 5. |
| `sections` | sí | Lista de **apartados**, cada uno con sus `cards`. |

**Apartado (`section`)**: `id` (kebab-case, único), `title`, `description`, `cards` (array) y opcionalmente `icon` (nombre de icono; si se omite se muestra el número del apartado, que suele quedar mejor).

**Campos comunes de toda tarjeta**:

| Campo | Descripción |
|---|---|
| `id` | kebab-case, único dentro del apartado. **Obligatorio en la práctica** (el progreso se guarda por id). |
| `type` | Uno de: `lesson`, `flashcard`, `quiz`, `truefalse`, `predict`, `fill`, `order`, `match`, `code`, `trace`, `html`. |
| `title` | Título corto. |
| `xp` | XP que da (por defecto según tipo: lesson 5, flashcard 5, truefalse 5, quiz 10, predict 10, fill 10, match 10, trace 10, html 10, order 15, code 25). |
| `animation` | Animación de entrada: `slide` (defecto), `fade`, `zoom`, `flip`, `bounce`, `rise`, `none`. |
| `lang` | Lenguaje del código de esta tarjeta si difiere del mazo. |
| `hints` | Array de pistas (markdown en línea) que se revelan una a una. |
| `explanation` | Markdown que se muestra **tras acertar**. Úsalo siempre en ejercicios: es donde se aprende. |
| `successMessage` / `failMessage` | Mensajes personalizados de acierto/fallo. |

---

## 2. Markdown disponible (en `content`, `question`, `prompt`, `front`, `back`, `explanation`, `note`…)

- `**negrita**`, `*cursiva*`, `~~tachado~~`, `==resaltado==`, `` `código` ``, enlaces, imágenes, listas (también `- [x]` tareas), tablas, citas `>`, títulos `#`/`##`, `---`.
- **Bloques de código** con resaltado: ```` ```js ````. Resalta líneas con ```` ```js {2,4-5} ````.
- **Bloque ejecutable** (el alumno lo edita y lo ejecuta): ```` ```js run ````. Úsalo mucho en lecciones: aprender tocando.
- **Avisos**:
  ```
  :::tip Título opcional
  Texto del aviso (admite markdown y código).
  :::
  ```
  Tipos: `tip`, `info`, `warn`, `danger`, `success`, `note`, `example`.
- **Texto con matiz o animación**: `[texto]{.efecto .otro}`. Recomendados: `mark` (subrayado que se dibuja), `accent`, `accent2`, `typewriter` (se escribe letra a letra), `fade`, `big`, `mono`, `underline`, `muted`. Disponibles pero úsalos casi nunca: `pulse`, `glow`, `float`, `zoom`, `bounce`, `wiggle`, `shake`, `blink`, `rainbow`.
  Ejemplo: `La clave es [la inmutabilidad]{.mark}` · `[console.log("hola")]{.typewriter}`.
- **Spoiler**: `||texto oculto||` (se revela al pulsar).
- No se permite HTML en el markdown (se escapa). Para HTML libre usa la tarjeta `html`.

### 2.1 Iconos

La app usa su propio juego de iconos vectoriales, finos y abstractos. **No uses emojis en ningún campo** (títulos, descripciones, contenido, notas, opciones, ni dentro del código de ejemplo): rompen la estética de la app. En su lugar, si quieres un icono en un mazo o apartado, pon uno de estos nombres en `icon`:

`lesson`, `flashcard`, `quiz`, `truefalse`, `predict`, `fill`, `order`, `match`, `code`, `trace`, `html`, `variables`, `array`, `stack`, `output`, `console`, `sections`, `cards`, `time`, `test`, `hint`, `solution`, `review`, `palette`, `finish`, `effort`, `sample`, `tip`, `info`, `warn`, `danger`, `success`, `note`, `example`, `json`, `lock`, `eye`, `refresh`.

Si dudas, **omite `icon`**: la app genera una marca abstracta única para el mazo y numera los apartados (01, 02…).

### 2.2 Lenguajes de programación

La app colorea la sintaxis de muchos lenguajes y muestra su nombre en la esquina del bloque. El lenguaje se toma, por orden: del bloque de código (```` ```python ````), del campo `lang` de la tarjeta, o del `language` del mazo.

| Lenguaje | Nombres aceptados |
|---|---|
| JavaScript | `javascript`, `js`, `jsx`, `node` |
| TypeScript | `typescript`, `ts`, `tsx` |
| Python | `python`, `py` |
| Java · Kotlin | `java` · `kotlin`, `kt` |
| C · C++ · C# | `c`, `h` · `cpp`, `c++` · `csharp`, `cs`, `c#` |
| Go · Rust · Swift · Dart | `go` · `rust`, `rs` · `swift` · `dart` |
| PHP · Ruby · Lua · R | `php` · `ruby`, `rb` · `lua` · `r` |
| SQL | `sql`, `postgresql`, `mysql`, `sqlite` |
| Shell · PowerShell | `bash`, `sh`, `shell`, `zsh` · `powershell`, `ps1` |
| HTML/XML · CSS | `html`, `xml`, `svg`, `vue` · `css`, `scss`, `less` |
| Datos | `json`, `yaml`, `yml`, `toml`, `markdown` |
| Sin color | `text`, `output` |

Cualquier otro nombre se colorea de forma genérica (cadenas, números y comentarios).

#### Qué se ejecuta y qué no

| Tipo de lenguaje | Lenguajes | Qué hace la app |
|---|---|---|
| **Se ejecuta en el navegador** | JavaScript, TypeScript, **Python** (Python 3.13 real, con Pyodide) | Bloques ```` ```python run ````, botón "Ejecutarlo de verdad" en `predict` y retos `code` con **tests automáticos**. |
| **Se practica en el IDE** | Java, Kotlin, C++, C#, C, Go, Rust… | Se muestra coloreado. Los retos `code` pasan a **modo IDE**: el alumno copia o descarga el código, lo ejecuta en su IDE y pega la salida, que se compara con `expectOutput`. |

Los tests de Python se escriben **en Python**: `{ "code": "suma(2, 3)", "expected": 5 }`, `{ "assert": "len(lista) == 3" }`. El valor se compara con `expected` (listas → arrays, diccionarios → objetos, `None` → `null`, `True` → `true`). `input()` lee las líneas del campo `"input"` de la tarjeta.

La primera vez que se ejecuta Python o TypeScript la app descarga su motor (unos segundos, necesita internet); después queda en caché.

### 2.3 Varios lenguajes a la vez

Un mismo mazo puede enseñar varios lenguajes y el alumno elige el suyo (pestañas en la tarjeta o *Ajustes → Lenguaje preferido*). Hay dos mecanismos:

**a) Bloques de código seguidos en lenguajes distintos → pestañas.** En cualquier texto markdown, si pones varios bloques uno detrás de otro (solo separados por líneas vacías), cada uno en un lenguaje, se muestran como pestañas:

````
```java
System.out.println("Hola");
```

```kotlin
println("Hola")
```

```python run
print("Hola")
```
````

**b) `variants` en la tarjeta.** Los campos comunes (título, enunciado, pistas…) van en la tarjeta; los que cambian según el lenguaje van en `variants`, una entrada por lenguaje. La variante elegida se mezcla sobre la tarjeta:

```json
{ "id": "division", "type": "predict", "title": "División entre enteros",
  "question": "¿Qué muestra este código?",
  "variants": {
    "java":   { "code": "int a = 7, b = 2;\nSystem.out.println(a / b);", "answer": "3" },
    "python": { "code": "a = 7\nb = 2\nprint(a / b)", "answer": "3.5", "explanation": "En Python `/` siempre da decimales." }
  } }
```

- Funciona con **todos** los tipos: `quiz` (cada variante con sus `options`/`answer`), `fill` (`code` con sus huecos), `order` (`lines`), `trace` (`code`; los `steps` pueden ser comunes si las líneas coinciden), `code` (`starter`, `solution`, `tests` o `expectOutput`)…
- **Ojo con las diferencias reales entre lenguajes**: la respuesta de `predict` o el `expectOutput` a menudo cambian (`7 / 2` es 3 en Java y 3.5 en Python; `true` se imprime `True` en Python y C#, y `1` en C++; `System.out.println(2.0)` muestra `2.0`, pero `cout << 2.0` muestra `2`). Pon en cada variante **la salida que da ese lenguaje**.
- Las claves de `variants` usan los nombres de la tabla de arriba (`java`, `kotlin`, `cpp`, `csharp`, `python`…).
- Pon en `"language"` del mazo el lenguaje principal; se usa cuando el alumno no ha elegido ninguno.

### 2.4 Tono y estilo

El resultado no debe parecer escrito por una IA:
- Frases claras y sobrias. Nada de "¡Genial!", "¡Vamos allá!", "¡Súper!" ni signos de exclamación en cada frase.
- Sin emojis, sin adornos, sin relleno motivacional. Explica como un buen profesor: directo, preciso, con ejemplos concretos.
- Títulos cortos y descriptivos ("Recorrer arrays", no "🚀 ¡Domina los arrays como un pro!").
- En los ejemplos de código usa datos realistas (nombres, precios, fechas), no `foo`/`bar` ni emojis en strings.
- Los efectos de texto son un acento puntual, no decoración: como mucho uno por tarjeta, y preferiblemente `mark`.
- No abuses de los avisos `:::`: uno por lección como mucho.

> Recuerda que en JSON los saltos de línea dentro de strings se escriben `\n` y las comillas `\"`.

---

## 3. Tipos de tarjeta

### 3.1 `lesson` — explicación
```json
{ "id": "que-es-un-array", "type": "lesson", "title": "¿Qué es un array?",
  "content": "Un **array** es una lista ordenada.\n\n```js run\nconst frutas = [\"manzana\", \"pera\"];\nconsole.log(frutas.length);\n```\n\n:::tip\nLos índices empiezan en **0**.\n:::" }
```
Opcional: `code` (se añade al final como bloque ejecutable; `"run": false` para que sea solo lectura). Se completa al verla.

### 3.2 `flashcard` — tarjeta que se gira
```json
{ "id": "push-pop", "type": "flashcard", "title": "push vs pop",
  "front": "¿Qué hace `arr.pop()`?", "back": "Quita y **devuelve** el último elemento." }
```
El alumno se autoevalúa ("Lo sabía" / "Repasar"); las marcadas van a la cola de repaso.

### 3.3 `quiz` — opción múltiple
```json
{ "id": "indice", "type": "quiz", "title": "Índices",
  "question": "¿Qué devuelve `[10, 20, 30][1]`?",
  "code": "const a = [10, 20, 30];\nconsole.log(a[1]);",
  "options": ["10", "20", "30", "undefined"],
  "answer": 1,
  "explanation": "Los índices empiezan en 0, así que `[1]` es el segundo elemento." }
```
- `answer`: índice (desde 0) de la correcta, o **array de índices** si hay varias (se convierte en selección múltiple con botón "Comprobar").
- `options` pueden ser strings u objetos `{ "text": "...", "feedback": "por qué es incorrecta" }`.
- `code` opcional, `shuffle: false` para no barajar.

### 3.4 `truefalse`
```json
{ "id": "const-array", "type": "truefalse", "title": "¿V o F?",
  "statement": "Un array declarado con `const` no se puede modificar.",
  "answer": false,
  "explanation": "`const` impide reasignar, pero puedes hacer `push`." }
```

### 3.5 `predict` — predice la salida
```json
{ "id": "predice-map", "type": "predict", "title": "¿Qué imprime?",
  "code": "const r = [1, 2, 3].map(n => n * 10);\nconsole.log(r.length);\nconsole.log(r[2]);",
  "answer": "3\n30",
  "alternatives": [],
  "explanation": "`map` mantiene la longitud." }
```
- El alumno escribe la salida exacta; una línea por cada `console.log`. Se ignoran espacios extra y mayúsculas (`"caseSensitive": true` para distinguirlas).
- **La salida debe coincidir con la real**: la app muestra un botón "Ejecutarlo de verdad" y el editor lo comprueba. Formato de la consola: strings sin comillas en primer nivel, arrays como `[1, 2, 3]`, objetos como `{ a: 1, b: "x" }`, `Map(1) {1 => 2}`.
- Variante de opciones: añade `"options": [...]` y pon en `answer` el índice o el texto correcto.

### 3.6 `fill` — rellenar huecos
```json
{ "id": "completa-filter", "type": "fill", "title": "Completa",
  "prompt": "Quédate con los números mayores que 2:",
  "code": "const r = [1, 2, 3, 4].[[filter]](n => n [[>]] 2);",
  "bank": true,
  "distractors": ["map", "<"],
  "explanation": "..." }
```
- Cada hueco: `[[respuesta]]` o `[[resp1|resp2]]` (varias respuestas válidas).
- `bank: true` muestra un banco de palabras pulsables (las respuestas + `distractors`). Sin banco, el alumno escribe.

### 3.7 `order` — ordenar líneas (Parsons)
```json
{ "id": "ordena-bucle", "type": "order", "title": "Ordena",
  "prompt": "Ordena para imprimir 1, 2, 3:",
  "lines": ["for (let i = 1; i <= 3; i++) {", "  console.log(i);", "}"] }
```
`lines` va **en el orden correcto**; la app las baraja. Conserva la indentación con espacios. Entre 3 y 8 líneas es lo ideal.

### 3.8 `match` — emparejar
```json
{ "id": "metodos", "type": "match", "title": "Empareja",
  "prompt": "Une cada método con su efecto:",
  "pairs": [["`push`", "Añade al final"], ["`shift`", "Quita el primero"], ["`slice`", "Copia una parte"]] }
```
De 3 a 6 parejas. Admite markdown en línea.

### 3.9 `code` — reto de programación con tests (el tipo más valioso)
```json
{ "id": "reto-maximo", "type": "code", "title": "Reto: el máximo",
  "prompt": "Escribe `maximo(nums)` que devuelva el número más grande.\nSi el array está vacío devuelve `null`.",
  "starter": "function maximo(nums) {\n  // tu código\n}\n",
  "solution": "function maximo(nums) {\n  if (nums.length === 0) return null;\n  return Math.max(...nums);\n}\n",
  "tests": [
    { "name": "`maximo([1, 5, 3])` → 5", "code": "maximo([1, 5, 3])", "expected": 5 },
    { "name": "Negativos", "code": "maximo([-4, -2])", "expected": -2 },
    { "name": "Vacío → null", "code": "maximo([])", "expected": null },
    { "name": "Es una función", "assert": "typeof maximo === 'function'" },
    { "name": "Caso grande", "code": "maximo([3, 99, 7, 42])", "expected": 99, "hidden": true }
  ],
  "hints": ["Mira `Math.max`.", "El operador `...` expande un array."],
  "explanation": "`Math.max(...nums)` pasa cada elemento como argumento." }
```
Tipos de test (se ejecutan tras el código del alumno, con acceso a sus variables y funciones):

| Test | Pasa si… |
|---|---|
| `{ "code": "expr", "expected": valor }` | `expr` evaluada es **igual en profundidad** a `expected` (arrays, objetos, números, strings, `null`, booleanos). Acepta promesas (se esperan). Para decimales añade `"tolerance": 0.001`. |
| `{ "assert": "expr" }` | `expr` es verdadera. |
| `{ "output": "texto" }` | La salida completa por consola es exactamente ese texto (líneas separadas por `\n`). |
| `{ "logIncludes": "texto" }` | La salida contiene ese texto. |

Otros campos: `"expectOutput": "..."` (atajo para un test de salida), `"hidden": true` en un test (no muestra el detalle), `"input": "línea1\nlínea2"` (lo que leen `input()` en Python o `prompt()` en JS), `"timeout": 3000` (ms, para cortar bucles infinitos), `"wait": 500` (ms a esperar a `setTimeout`/promesas antes de comprobar), `"minLines"` (altura del editor).
Si no hay tests, la tarjeta se completa al ejecutar sin errores (modo *playground*).

**Reglas de oro para retos**:
1. La `solution` **debe pasar todos los tests** y el `starter` **no** debe pasarlos. (El usuario puede verificarlo con el botón *Comprobar* del editor.)
2. El `starter` debe ejecutarse sin errores de sintaxis (deja la función vacía con un comentario).
3. Nombra los tests como el alumno los leerá: `"`sumar([1,2])` → 3"`.
4. Incluye casos límite (vacío, negativos, mayúsculas…) y al menos uno oculto.
5. El entorno es un **Web Worker**: no hay `document` ni DOM; `alert` va a la consola y `prompt` lee de `"input"`. `await` en el nivel superior está permitido.

#### Retos en modo IDE (Java, Kotlin, C++, C#…)

Cuando el lenguaje del reto no se ejecuta en el navegador, la tarjeta cambia de forma: muestra el enunciado, un editor con el `starter` (para escribir allí o copiarlo), botones **Copiar** y **Descargar** (con el nombre de fichero adecuado, p. ej. `Main.java`), la **salida esperada** y un cuadro donde el alumno pega lo que imprime su programa.

```json
{ "id": "reto-pares", "type": "code", "title": "Reto: contar pares", "lang": "java",
  "prompt": "Completa `contarPares` para que devuelva cuántos números pares hay.",
  "starter": "public class Main {\n    static int contarPares(int[] nums) {\n        // tu código aquí\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(contarPares(new int[]{1, 2, 3, 4, 6}));\n        System.out.println(contarPares(new int[]{}));\n    }\n}",
  "solution": "…",
  "expectOutput": "3\n0",
  "examples": [{ "input": "[1, 2, 3, 4, 6]", "output": "3" }, { "input": "[]", "output": "0" }],
  "fileName": "Main.java" }
```

- `expectOutput` es **obligatorio en la práctica**: es lo que permite comprobar el resultado. Sin él, el alumno solo puede marcar "Ya me funciona".
- El `starter` debe ser un **programa completo que compile**, con el `main` que imprime los casos de prueba; el alumno solo rellena la función o clase.
- `expectOutput` debe ser **exactamente** lo que imprime la `solution` en ese lenguaje (formato de números y booleanos incluido).
- `examples` (opcional) muestra una tabla de entrada/salida. `tests` también se muestran como "casos que debe cumplir", solo como referencia.
- `fileName` es opcional; si falta se deduce (en Java, del nombre de la `public class`).
- Con `variants`, un mismo reto puede ser de IDE en Java y ejecutable con tests en Python.

### 3.10 `trace` — animación paso a paso (visualiza la ejecución)
Muestra el código, resalta la línea actual y anima variables, arrays, pila de llamadas y salida. Ideal para bucles, algoritmos de ordenación/búsqueda, recursión, punteros, etc.

```json
{ "id": "traza-busqueda", "type": "trace", "title": "Búsqueda lineal",
  "prompt": "Reproduce la animación y observa cómo avanza `i`.",
  "code": "const a = [4, 8, 15];\nconst buscado = 8;\nfor (let i = 0; i < a.length; i++) {\n  if (a[i] === buscado) {\n    console.log(\"Encontrado en\", i);\n    break;\n  }\n}",
  "arrayName": "a",
  "autoplay": false,
  "speed": "normal",
  "steps": [
    { "line": 1, "array": [4, 8, 15], "note": "Tenemos un array de 3 números." },
    { "line": 2, "vars": { "buscado": 8 }, "array": [4, 8, 15] },
    { "line": 3, "vars": { "buscado": 8, "i": 0 }, "array": [4, 8, 15], "pointers": { "i": 0 } },
    { "line": 4, "vars": { "buscado": 8, "i": 0 }, "array": [4, 8, 15], "pointers": { "i": 0 }, "highlight": [0], "note": "¿4 === 8? No." },
    { "line": 3, "vars": { "buscado": 8, "i": 1 }, "array": [4, 8, 15], "pointers": { "i": 1 } },
    { "line": 4, "vars": { "buscado": 8, "i": 1 }, "array": [4, 8, 15], "pointers": { "i": 1 }, "highlight": [1], "note": "¿8 === 8? **¡Sí!**" },
    { "line": 5, "vars": { "buscado": 8, "i": 1 }, "array": [4, 8, 15], "done": [1], "output": "Encontrado en 1" }
  ],
  "explanation": "En el peor caso recorre todo el array: O(n)." }
```
Campos de cada paso (todos opcionales salvo `line`):

| Campo | Qué hace |
|---|---|
| `line` | Línea actual (desde 1) o array de líneas. |
| `vars` | Objeto con **todas** las variables visibles en ese paso (no es acumulativo). Las que cambian respecto al paso anterior parpadean. |
| `note` | Explicación en markdown de ese paso. **Pon notas en los pasos clave.** |
| `array` | Array a dibujar como celdas (nombre con `arrayName` del card o del paso). |
| `arrays` | Varios arrays: `{ "izq": [1,2], "der": [3] }`. |
| `highlight` | Índices a resaltar (o `{ "nombreArray": [índices] }`). |
| `pointers` | Flechas bajo celdas: `{ "i": 0, "j": 2 }` (o `{ "nombreArray": { "i": 0 } }`). |
| `swap` | `[a, b]`: anima el intercambio de esas dos celdas (el `array` del paso ya debe venir intercambiado). |
| `done` | Índices "terminados" (en verde). |
| `stack` | Pila de llamadas, de la base a la cima: `["global", "factorial(3)", "factorial(2)"]`. |
| `output` | Texto que se imprime **en ese paso** (la salida se acumula). |

Campos de la tarjeta: `code`, `steps`, `prompt`, `autoplay` (bool), `speed` (`"lento"`, `"normal"`, `"rápido"` o ms), `arrayName`.
**Los pasos deben ser fieles a la ejecución real** (valores y líneas correctos). Entre 6 y 25 pasos.

### 3.11 `html` — demo interactiva libre (HTML + CSS + JS)
Para animaciones y visualizaciones a medida: se ejecuta en un iframe aislado que hereda los colores del tema.
```json
{ "id": "demo-botones", "type": "html", "title": "Eventos en acción",
  "prompt": "Pulsa el botón 3 veces.",
  "height": "auto",
  "completeOn": "api",
  "html": "<button id=\"b\">Púlsame</button>\n<p id=\"o\">0 clics</p>",
  "css": "button{font-size:20px} #o{transition:transform .3s}",
  "js": "let n = 0;\nb.onclick = () => {\n  o.textContent = ++n + ' clics';\n  o.animate([{transform:'scale(1.4)'},{transform:'none'}], 300);\n  if (n === 3) CardLearner.complete();\n};",
  "libs": [] }
```
- API dentro del iframe: `CardLearner.complete()` (completa la tarjeta), `CardLearner.fail("mensaje")`, `CardLearner.attempt(true|false)`, `CardLearner.toast("texto")`.
- `completeOn`: `"view"` (defecto, se completa al verla) o `"api"` (solo cuando llames a `CardLearner.complete()`).
- `height`: número en px o se ajusta solo. `padding`: px.
- Variables CSS disponibles: `--accent`, `--accent2`, `--text`, `--muted`, `--surface`, `--surface2`, `--border`, `--ok`, `--bad`, `--warn`, `--font`, `--mono`.
- `libs`: URLs `https://` de librerías (p. ej. `https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js`). Úsalas solo si aportan mucho; mejor CSS/JS nativo.
- Los elementos con `id` son accesibles como variables globales (`b`, `o`), pero es más claro usar `document.getElementById`.

---

## 4. Guía pedagógica (cómo hacer un buen mazo)

1. **Progresión**: de lo concreto a lo abstracto. Cada apartado = un concepto; 4–10 tarjetas por apartado; 3–8 apartados por mazo.
2. **Patrón recomendado por apartado**:
   `lesson` (con ```js run```) → `trace` o `html` (verlo en movimiento) → `quiz`/`truefalse` (comprobar comprensión) → `predict` (leer código) → `fill`/`order` (escribir con ayuda) → `code` (escribir solo).
3. **Mezcla tipos**: no pongas más de 2 tarjetas seguidas del mismo tipo.
4. **Lecciones cortas**: máx. ~150 palabras y un bloque ejecutable. Mejor 2 lecciones pequeñas que 1 larga.
5. **Siempre `explanation`** en ejercicios, explicando el *por qué*, no solo la respuesta. En quizzes, añade `feedback` a las opciones incorrectas típicas (errores comunes).
6. **Pistas graduales**: la primera orienta, la última casi da la solución.
7. **Animaciones con propósito**: usa `trace` para algoritmos y flujo de control; `html` para conceptos visuales (DOM, eventos, CSS, estructuras de datos). En las tarjetas `html` sigue la estética de la app, que imita tarjetas de papel sobre un tapete azul marino: el iframe es un panel marino; usa formas **rectangulares** (sin `border-radius` o como mucho 2px), líneas de 1px, sin sombras difusas ni degradados, colores `var(--text)` (cuarzo), `var(--accent)` (oro) y `var(--muted)`, y transiciones cortas y sobrias. Nada de colores saturados, brillos ni rebotes.
8. **Dificultad creciente** en los retos `code` y XP acorde (`"xp": 30-50` para los difíciles).
9. Último apartado: un **proyecto/reto final** que combine lo aprendido.
10. Escribe en el idioma del usuario, con el tono descrito en 2.4.

## 5. Tema (`theme`)

```json
"theme": {
  "accent": "#7c5cff", "accent2": "#22d3ee",
  "mode": "auto",
  "background": "#0e0f1c", "surface": "#171828", "text": "#e9e9f6",
  "codeBackground": "#0b0c17",
  "radius": 18,
  "font": "system-ui, sans-serif",
  "cardAnimation": "slide"
}
```
Todo opcional y **normalmente conviene omitirlo**: la app tiene su propia paleta (azul marino, cuarzo y oro) y por defecto ignora los colores del mazo salvo que el usuario active "Usar colores del mazo". Si aun así defines colores, que sean sobrios y con buen contraste, y fija `mode` (`"dark"` o `"light"`).

## 6. Checklist antes de entregar

- [ ] JSON válido (sin comentarios, sin comas finales, `\n` en saltos de línea, comillas escapadas).
- [ ] `format: "cardlearner/v1"` y `id` en kebab-case.
- [ ] Todos los `id` de apartados y tarjetas son únicos y en kebab-case.
- [ ] Cada tarjeta tiene sus campos obligatorios (`quiz`: question/options/answer; `code`: prompt + tests; `trace`: code + steps; etc.).
- [ ] En `quiz`, `answer` es un índice válido (empieza en 0).
- [ ] En `predict`, `answer` es **exactamente** la salida real del código.
- [ ] En `code`, la `solution` pasa todos los tests y el `starter` no.
- [ ] En retos de Java, Kotlin, C++, C#… hay `expectOutput` igual a la salida real de la `solution`, y el `starter` es un programa completo que compila.
- [ ] En cada variante, `answer` / `expectOutput` son los de **ese** lenguaje (no copiados de otro).
- [ ] En `trace`, líneas y valores coinciden con la ejecución real.
- [ ] En `fill`, cada hueco usa `[[...]]`.
- [ ] Hay variedad de tipos y al menos una animación (`trace` o `html`) por apartado cuando tenga sentido.
- [ ] Ningún emoji en todo el JSON; `icon` solo con nombres de la lista 2.1 (u omitido).
- [ ] Tono sobrio, sin exclamaciones ni frases motivacionales de relleno.

## 7. Mini-ejemplo completo

```json
{
  "format": "cardlearner/v1",
  "id": "condicionales-js",
  "title": "Condicionales en JS",
  "language": "javascript",
  "sections": [
    {
      "id": "if-else",
      "title": "if / else",
      "cards": [
        { "id": "intro-if", "type": "lesson", "title": "Tomar decisiones",
          "content": "Con `if` el programa [elige un camino]{.mark}.\n\n```js run\nconst edad = 17;\nif (edad >= 18) {\n  console.log(\"Puedes votar\");\n} else {\n  console.log(\"Aún no\");\n}\n```\n\nCambia `edad` y vuelve a ejecutar." },
        { "id": "predice-if", "type": "predict", "title": "¿Qué imprime?",
          "code": "const n = 0;\nif (n) {\n  console.log(\"sí\");\n} else {\n  console.log(\"no\");\n}",
          "answer": "no",
          "explanation": "`0` es un valor *falsy*: en un `if` se comporta como `false`." },
        { "id": "reto-signo", "type": "code", "title": "Reto: signo",
          "prompt": "Escribe `signo(n)` que devuelva `\"positivo\"`, `\"negativo\"` o `\"cero\"`.",
          "starter": "function signo(n) {\n  \n}\n",
          "solution": "function signo(n) {\n  if (n > 0) return \"positivo\";\n  if (n < 0) return \"negativo\";\n  return \"cero\";\n}\n",
          "tests": [
            { "name": "signo(5)", "code": "signo(5)", "expected": "positivo" },
            { "name": "signo(-2)", "code": "signo(-2)", "expected": "negativo" },
            { "name": "signo(0)", "code": "signo(0)", "expected": "cero" }
          ],
          "hints": ["Necesitas dos `if` y un `return` final."] }
      ]
    }
  ]
}
```

Mazos de referencia completos:
- `decks/ejemplo-javascript.json`: todos los tipos de tarjeta, en JavaScript.
- `decks/ejemplo-cinco-lenguajes.json`: variantes en Java, Kotlin, C++, C# y Python, con pestañas en las lecciones, retos en modo IDE y retos de Python con tests.
