const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = __dirname;
const outputs = path.join(root, '../outputs');

const PRE_BOOT_JS = `(function () {
  var STORAGE_KEY = 'fold-field-map-v1';
  var LIBRARY_KEY = 'fold-field-map-library-v1';
  try {
    var params = new URLSearchParams(window.location.search);
    var mapId = params.get('map');
    var mode = params.get('mode');
    if (mapId) {
      var seeds = window.__FOLD_FIELD_SEED_MAPS__ || [];
      var item = null;
      for (var i = 0; i < seeds.length; i++) { if (seeds[i].map_id === mapId) { item = seeds[i]; break; } }
      if (!item) {
        try {
          var lib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
          if (Array.isArray(lib)) { for (var j = 0; j < lib.length; j++) { if (lib[j].map_id === mapId) { item = lib[j]; break; } } }
        } catch (e) {}
      }
      if (item && item.map) { localStorage.setItem(STORAGE_KEY, JSON.stringify(item.map)); }
    }
    if (mode === 'play') { window.__FOLD_FIELD_AUTOPLAY__ = true; }
    if (window.location.search) { window.history.replaceState(null, '', window.location.pathname + window.location.hash); }
  } catch (e) {}
})();`;

const POST_BOOT_JS = `(function () {
  try {
    if (window.__FOLD_FIELD_AUTOPLAY__) {
      var btn = document.getElementById('startBtn');
      if (btn) btn.click();
    }
  } catch (e) {}
})();`;

async function build() {
  const result = await esbuild.build({
    stdin: { contents: fs.readFileSync(path.join(root, 'app.js'), 'utf8'), loader: 'js', sourcefile: path.join(root, 'app.js'), resolveDir: root },
    plugins: [{ name: 'workspace-files', setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const packages = { three: 'three/build/three.module.js', lucide: 'lucide/dist/esm/lucide.js' };
        const file = packages[args.path] ? path.join(root, 'node_modules', packages[args.path]) : args.path.startsWith('three/') ? path.join(root, 'node_modules', args.path) : path.resolve(args.importer ? path.dirname(args.importer) : root, args.path);
        return { path: file, namespace: 'workspace' };
      });
      build.onLoad({ filter: /.*/, namespace: 'workspace' }, args => ({ contents: fs.readFileSync(args.path, 'utf8'), loader: args.path.endsWith('.json') ? 'json' : 'js' }));
    }}],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    legalComments: 'inline',
    target: ['es2020'],
  });

  const template = fs.readFileSync(path.join(root, 'editor.html'), 'utf8');
  const code = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  fs.mkdirSync(outputs, { recursive: true });

  const demoMap = JSON.parse(fs.readFileSync(path.join(outputs, 'fold-field-demo.json'), 'utf8'));
  const seedMaps = [{
    map_id: 'demo',
    map_name: demoMap.name || '内置演示关卡',
    author: '内置示例',
    version: demoMap.version || 1,
    is_official: true,
    published: false,
    map: demoMap
  }];
  const seedScript = '<script>window.__FOLD_FIELD_SEED_MAPS__=' + JSON.stringify(seedMaps).replace(/</g, '\\u003c') + ';</script>';

  const editorHtml = template.replace('<!--APP_SCRIPT-->', function () {
    return seedScript + '<script>' + PRE_BOOT_JS + '</script><script>' + code + '</script><script>' + POST_BOOT_JS + '</script>';
  });
  fs.writeFileSync(path.join(outputs, 'editor.html'), editorHtml, 'utf8');

  const boot = '<script>window.__FOLD_FIELD_EXPORT_MAP__=' + JSON.stringify(demoMap).replace(/</g, '\\u003c') + ';window.__FOLD_FIELD_GAME_ONLY__=true;</script>';
  const gameHtml = template.replace('<!--APP_SCRIPT-->', function () {
    return boot + '<script>' + code + '</script>';
  });
  fs.writeFileSync(path.join(outputs, 'game.html'), gameHtml, 'utf8');

  const libraryTemplate = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
  const libraryHtml = libraryTemplate.replace('<!--SEED_MAPS_SCRIPT-->', function () { return seedScript; });
  fs.writeFileSync(path.join(outputs, 'library.html'), libraryHtml, 'utf8');

  fs.copyFileSync(path.join(root, 'home.html'), path.join(outputs, 'index.html'));

  console.log('Built editor HTML: ' + Buffer.byteLength(editorHtml).toLocaleString() + ' bytes');
  console.log('Built standalone game HTML: ' + Buffer.byteLength(gameHtml).toLocaleString() + ' bytes');
  console.log('Built library HTML: ' + Buffer.byteLength(libraryHtml).toLocaleString() + ' bytes');
  console.log('Copied home page to outputs/index.html');
}

build().catch(error => { console.error(error); process.exit(1); });
