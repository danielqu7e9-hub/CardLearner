// Genera los JSON de decks/ a partir de los mazos de ejemplo de js/
// Uso: node tools/export-sample.js
const fs = require('fs');
const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'js', 'sample-deck.js'));
require(path.join(__dirname, '..', 'js', 'sample-deck-multi.js'));
for (const [file, deck] of [['ejemplo-javascript.json', window.CL.SAMPLE_DECK], ['ejemplo-cinco-lenguajes.json', window.CL.SAMPLE_DECK_MULTI]]) {
  const out = path.join(__dirname, '..', 'decks', file);
  fs.writeFileSync(out, JSON.stringify(deck, null, 2) + '\n');
  console.log('Escrito', out);
}
