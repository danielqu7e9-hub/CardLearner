# CardLearner

App web **sin backend** para aprender programación con tarjetas interactivas. Le cargas un mazo en JSON (o `.js`) y lo convierte en un curso con lecciones, retos de código con tests, animaciones paso a paso, progreso, XP y rachas.

La idea: le das [`SKILL.md`](SKILL.md) a otra IA, le pides un curso ("hazme un mazo sobre promesas en JavaScript") y cargas el JSON que te devuelva.

## Cómo abrirla

- **Doble clic en `index.html`**: funciona directamente en el navegador.
- O con un servidor local (recomendado si tu navegador bloquea algo en `file://`):
  ```bash
  node tools/serve.js
  ```
  y abre http://localhost:5173

Todo (mazos, progreso, ajustes) se guarda en el `localStorage` del navegador. Usa **Copia de seguridad** en la portada para exportarlo.

## Cargar mazos

- **Abrir .json / .js**, **arrastrar** ficheros a la ventana, o **Pegar JSON**.
- Se aceptan `.json` y `.js` (`export default {...}`, `module.exports = {...}`, `window.X = {...}` o `CardLearner.load({...})`).
- Si el mazo tiene problemas, la app lo importa igualmente y te enseña los avisos.

## Tipos de tarjeta

| Tipo | Qué es |
|---|---|
| `lesson` | Explicación en markdown con bloques de código **ejecutables**, avisos y texto animado |
| `flashcard` | Tarjeta que se gira; autoevaluación y cola de repaso |
| `quiz` / `truefalse` | Opción múltiple (una o varias correctas) / verdadero-falso |
| `predict` | Adivina la salida del código (y luego ejecútalo de verdad) |
| `fill` | Rellena huecos del código, con banco de palabras opcional |
| `order` | Ordena líneas de código (arrastrar o flechas) |
| `match` | Empareja conceptos |
| `code` | Reto con editor, consola y **tests automáticos** (JS, TS, Python); en Java, Kotlin, C++, C#… pasa a **modo IDE** |
| `trace` | **Animación paso a paso**: línea actual, variables, arrays con intercambios, pila de llamadas, salida |
| `html` | Demo libre HTML/CSS/JS en un iframe aislado, con API para completar la tarjeta |

El formato completo está en [`SKILL.md`](SKILL.md) y hay un mazo de ejemplo con todos los tipos en [`decks/ejemplo-javascript.json`](decks/ejemplo-javascript.json).

## Editor integrado

Botón **Editar** en cualquier mazo (o **Crear desde cero**):
- Crear, reordenar, duplicar, mover y borrar **apartados** y **tarjetas**.
- Campos de texto con resaltado + resto de campos en JSON, con **vista previa en vivo**.
- Tema del mazo (colores, modo, animación de entrada, bordes, fuente).
- **Comprobar**: ejecuta la solución de cada reto contra sus tests, verifica que el código inicial *no* los pase y que las respuestas de `predict` coinciden con la salida real. Muy útil para revisar mazos generados por IA.
- **{ } JSON** para editar el mazo entero a mano, y exportar / copiar.

## Estética

Las tarjetas se tratan como objetos físicos: rectángulos de papel color cuarzo sobre un tapete azul marino, con el canto de las tarjetas de debajo visible para que se lean como un mazo, y una animación de "repartir" al pasar de una a otra. Líneas de 1px, sin sombras difusas ni degradados, oro solo como acento. Una sola familia tipográfica (IBM Plex Sans y Plex Mono, desde Google Fonts; sin conexión, fuentes del sistema). Los iconos (`js/icons.js`) son vectoriales, propios y abstractos, y solo aparecen donde un botón no tiene texto o para identificar el tipo de tarjeta.

## Personalización

- Ajustes: tema claro/oscuro/auto, usar o no los colores del mazo, acento propio, tamaño de texto y del editor, sonidos, reducir animaciones, barajar opciones, avanzar solo al acertar.
- Cada mazo puede traer su `theme` y cada tarjeta su `color` y `animation`.

## Lenguajes

- **Se ejecutan en el navegador**: JavaScript, TypeScript (se traduce con el compilador oficial) y **Python** (CPython real con [Pyodide](https://pyodide.org)). TypeScript y Python se descargan de jsDelivr la primera vez que se usan y quedan en caché.
- **Se practican en el IDE**: Java, Kotlin, C++, C#, Go, Rust… La tarjeta muestra el enunciado, el código (para copiar o descargar como `Main.java`, `Program.cs`…) y la salida esperada; el alumno pega la salida de su programa y la app la compara.
- **Resaltado** para más de 25 lenguajes.
- **Varios lenguajes en un mismo mazo**: las tarjetas pueden traer `variants` por lenguaje y los bloques de código seguidos se muestran como pestañas. El lenguaje elegido se recuerda (Ajustes → Lenguaje preferido).

## Seguridad

- El código del alumno se ejecuta en **Web Workers** (sin acceso a la página) con límite de tiempo, así que un bucle infinito no congela la app; el motor de Python se reinicia solo si hay que cortarlo.
- Las tarjetas `html` se ejecutan en un iframe `sandbox` sin acceso a la app ni a tus datos.
- El markdown escapa cualquier HTML.
- Importar un `.js` **ejecuta ese fichero** para leer el mazo: carga solo ficheros de confianza (o usa `.json`).

## Estructura

```
index.html            entrada
css/styles.css        estilos, temas y animaciones
js/util.js            utilidades (DOM, toasts, modales, sonido, confeti)
js/icons.js           iconos vectoriales y marcas generadas
js/markdown.js        markdown seguro con efectos y bloques ejecutables
js/highlight.js       resaltado de sintaxis
js/store.js           persistencia (localStorage), XP, niveles, rachas
js/deck.js            formato del mazo: parseo, normalización, validación, plantillas
js/runner.js          ejecución aislada (JS, TypeScript, Python) + tests
js/code-editor.js     editor de código ligero
js/cards.js           renderizado de cada tipo de tarjeta
js/editor.js          editor de mazos
js/app.js             vistas, router, importación, ajustes
js/sample-deck.js     mazo de ejemplo (JavaScript)
js/sample-deck-multi.js  mazo de ejemplo en cinco lenguajes
tools/serve.js        servidor estático opcional
tools/export-sample.js  regenera decks/ejemplo-javascript.json
SKILL.md              instrucciones para que otra IA genere mazos
```
