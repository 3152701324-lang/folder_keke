const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = __dirname;
const outputs = path.join(root, '../outputs');
async function build() {
const result = await esbuild.build({
  stdin: { contents: fs.readFileSync(path.join(root, 'app.js'), 'utf8'), loader: 'js', sourcefile: path.join(root, 'app.js'), resolveDir: root },
  plugins: [{ name: 'workspace-files', setup(build) {
    build.onResolve({filter:/.*/}, args => {
      const packages = { three:'three/build/three.module.js', lucide:'lucide/dist/esm/lucide.js' };
      const file = packages[args.path] ? path.join(root,'node_modules',packages[args.path]) : args.path.startsWith('three/') ? path.join(root,'node_modules',args.path) : path.resolve(args.importer ? path.dirname(args.importer) : root,args.path);
      return {path:file,namespace:'workspace'};
    });
    build.onLoad({filter:/.*/,namespace:'workspace'}, args => ({contents:fs.readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'js'}));
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
const html = template.replace('<!--APP_SCRIPT-->', () => '<script>' + code + '</script>');
fs.mkdirSync(outputs, {recursive:true});
fs.writeFileSync(path.join(outputs, 'index.html'), html, 'utf8');
const demoPath = path.join(outputs, 'fold-field-demo.json');
const demoMap = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
const boot = '<script>window.__FOLD_FIELD_EXPORT_MAP__=' + JSON.stringify(demoMap).replace(/</g, '\\u003c') + ';window.__FOLD_FIELD_GAME_ONLY__=true;</script>';
const gameHtml = template.replace('<!--APP_SCRIPT-->', () => boot + '<script>' + code + '</script>');
fs.writeFileSync(path.join(outputs, 'game.html'), gameHtml, 'utf8');
console.log('Built standalone HTML: ' + Buffer.byteLength(html).toLocaleString() + ' bytes');
console.log('Built standalone game HTML: ' + Buffer.byteLength(gameHtml).toLocaleString() + ' bytes');
}
build().catch(error=>{console.error(error);process.exit(1);});
