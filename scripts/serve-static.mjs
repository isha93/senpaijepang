#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const dir = path.resolve(process.cwd(), String(args.dir || '.'));
const port = Number(args.port || 3000);
const title = String(args.title || 'Static App');

if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error(`index.html not found in ${dir}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname || '/';
  const filePath = pathname === '/' ? path.join(dir, 'index.html') : path.join(dir, pathname);

  if (!filePath.startsWith(dir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`${title} running at http://localhost:${port}`);
});
