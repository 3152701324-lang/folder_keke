const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../outputs');
const port = Number(process.env.FOLD_PORT || 4173);
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const target = path.resolve(root, '.' + (pathname==='/'?'/index.html':pathname));
  if (!target.startsWith(root+path.sep)) { res.writeHead(403);res.end();return; }
  fs.readFile(target,(err,data) => { if(err){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',target.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data); });
});
server.on('error',error=>{console.error(error.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log('FOLD FIELD ready at http://127.0.0.1:'+port));
