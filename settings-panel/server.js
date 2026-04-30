const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 5496;
const CONFIG_PATH = path.join(process.env.HOME || '/root', '.kimi', 'config.toml');
const PUBLIC_DIR = path.join(__dirname, 'public');

function readConfig() {
  try {
    return fs.readFileSync(CONFIG_PATH, 'utf8');
  } catch (e) {
    return '';
  }
}

function writeConfig(text) {
  fs.writeFileSync(CONFIG_PATH, text, 'utf8');
}

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath);
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(statusCode, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url || '/';
  if (reqUrl === '//') reqUrl = '/';
  const host = req.headers.host || 'localhost';
  const url = new URL(reqUrl, `http://${host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/config/raw' && req.method === 'GET') {
    const text = readConfig();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
    return;
  }

  if (url.pathname === '/api/config/raw' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        writeConfig(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/restart' && req.method === 'POST') {
    exec('pm2 restart kimi-web-v2', (err, stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: !err,
        output: stdout || stderr || '',
        error: err ? err.message : null,
      }));
    });
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, url.pathname);
  if (url.pathname === '/') filePath = path.join(PUBLIC_DIR, 'index.html');
  serveFile(res, filePath);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Settings panel running at http://127.0.0.1:${PORT}`);
});
