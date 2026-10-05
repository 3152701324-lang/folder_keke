const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const outputs = path.join(__dirname, '../outputs');

function inlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
}

// Homepage: static landing page linking to editor, library and demo game.
const home = fs.readFileSync(path.join(outputs, 'index.html'), 'utf8');
assert.ok(home.includes('href="editor.html"'));
assert.ok(home.includes('href="library.html"'));
assert.ok(home.includes('href="game.html"'));
assert.ok(!home.includes('<!--APP_SCRIPT-->'));

// Editor: standalone HTML with inline scripts, no external assets, plus query bootstrapping.
const html = fs.readFileSync(path.join(outputs, 'editor.html'), 'utf8');
assert.ok(!html.includes('<!--APP_SCRIPT-->'));
assert.ok(!/<link[^>]+href\s*=/.test(html));
const scripts = inlineScripts(html);
assert.ok(scripts.length >= 1);
for (const m of scripts) {
  assert.ok(!/\bsrc\s*=/.test(m[1]), 'editor scripts must be inline');
  new vm.Script(m[2], { filename: 'fold-field-inline.js' });
}
for (const id of ['viewport', 'editMode', 'playMode', 'startBtn', 'restartBtn', 'undoBtn', 'teleportBtn', 'exportMap', 'importMap', 'topView', 'fixedView']) {
  assert.ok(html.includes('id="' + id + '"'));
}
assert.ok(html.includes('href="index.html"'));
assert.ok(html.includes('window.__FOLD_FIELD_SEED_MAPS__'));
assert.ok(html.includes('window.__FOLD_FIELD_AUTOPLAY__'));
assert.ok(html.includes('new URLSearchParams'));

// Game: standalone game-only build with the boot payload injected.
const game = fs.readFileSync(path.join(outputs, 'game.html'), 'utf8');
assert.ok(game.includes('window.__FOLD_FIELD_GAME_ONLY__=true'));
assert.ok(!game.includes('<!--APP_SCRIPT-->'));

// Library: local map directory page with seed data and play/edit navigation.
const library = fs.readFileSync(path.join(outputs, 'library.html'), 'utf8');
assert.ok(library.includes('window.__FOLD_FIELD_SEED_MAPS__'));
assert.ok(library.includes('fold-field-map-library-v1'));
assert.ok(library.includes('href="editor.html"'));
assert.ok(library.includes('editor.html?map='));
assert.ok(library.includes('&mode=play'));
for (const id of ['map-list', 'selected-info', 'play', 'edit', 'export', 'delete', 'import', 'refresh']) {
  assert.ok(library.includes('id="' + id + '"'));
}
assert.ok(!library.includes('<!--SEED_MAPS_SCRIPT-->'));
for (const m of inlineScripts(library)) {
  assert.ok(!/\bsrc\s*=/.test(m[1]));
  new vm.Script(m[2], { filename: 'fold-field-library.js' });
}

console.log('PASS: multi-page site, no external scripts or styles, inline JS parses, required controls present, homepage links intact.');
console.log('Homepage size: ' + Buffer.byteLength(home) + ' bytes');
console.log('Editor size: ' + Buffer.byteLength(html) + ' bytes');
console.log('Game size: ' + Buffer.byteLength(game) + ' bytes');
console.log('Library size: ' + Buffer.byteLength(library) + ' bytes');
