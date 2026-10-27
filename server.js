// A.N.T.S ModTecH server: zero dependencies, Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const PASS = process.env.HOST_PASSWORD || 'ants-change-me';
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const TOKEN = crypto.createHmac('sha256', process.env.SECRET || PASS).update('ants-host').digest('hex');
const MAX_RESP = 50000;

let store = { deck: null, responses: {} };
try { store = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
store.responses = store.responses || {};

let saveT; const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(FILE, JSON.stringify(store), () => {}), 500); };
const clients = new Set(); let pingT = null;
const notify = () => { if (pingT) return; pingT = setTimeout(() => { pingT = null; clients.forEach(r => r.write('data: 1\n\n')); }, 400); };
setInterval(() => clients.forEach(r => r.write(': keepalive\n\n')), 25000);

const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const same = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const isHost = req => same(req.headers['x-token'] || '', TOKEN);
const readBody = (req, max) => new Promise((ok, no) => {
  let d = ''; req.on('data', c => { d += c; if (d.length > max) { no(new Error('too large')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { no(e); } });
});
const hits = new Map(); setInterval(() => hits.clear(), 60000);
const limited = req => { const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; const n = (hits.get(ip) || 0) + 1; hits.set(ip, n); return n > 120; };
const clean = r => {
  const o = { s: String(r.s || '').slice(0, 40), u: String(r.u || '').slice(0, 60), t: Date.now() };
  if (r.id) o.id = String(r.id).slice(0, 20);
  if (r.up) o.up = String(r.up).slice(0, 20);
  if (typeof r.v === 'string') o.v = r.v.slice(0, 300);
  else if (typeof r.v === 'number') o.v = r.v;
  else if (Array.isArray(r.v)) o.v = r.v.slice(0, 30).map(Number);
  return o;
};

const page = () => fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/host' || p === '/host/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return res.end(page());
    }
    if (p === '/healthz') return send(res, 200, { ok: true });
    if (!p.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    const r = p.slice(5);
    if (r === 'stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 2000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
    }
    if (r === 'login' && req.method === 'POST') { const b = await readBody(req, 1000); return same(b.password || '', PASS) ? send(res, 200, { token: TOKEN }) : send(res, 401, { error: 'wrong password' }); }
    if (r === 'whoami') return isHost(req) ? send(res, 200, { ok: true }) : send(res, 401, { error: 'not host' });
    if (r === 'deck') {
      if (req.method === 'GET') return send(res, 200, { deck: store.deck });
      if (req.method === 'PUT') { if (!isHost(req)) return send(res, 403, { error: 'host only' }); store.deck = await readBody(req, 300000); persist(); notify(); return send(res, 200, { ok: true }); }
    }
    if (r === 'responses') {
      if (req.method === 'GET') return send(res, 200, { items: Object.entries(store.responses).map(([id, data]) => ({ id, data })) });
      if (req.method === 'POST') {
        if (limited(req)) return send(res, 429, { error: 'slow down' });
        if (Object.keys(store.responses).length >= MAX_RESP) return send(res, 507, { error: 'full' });
        const id = crypto.randomBytes(6).toString('hex'); store.responses[id] = clean(await readBody(req, 4000)); persist(); notify(); return send(res, 200, { id });
      }
      if (req.method === 'DELETE') { if (!isHost(req)) return send(res, 403, { error: 'host only' }); store.responses = {}; persist(); notify(); return send(res, 200, { ok: true }); }
    }
    if (r.startsWith('responses/')) {
      const id = decodeURIComponent(r.slice(10)).slice(0, 120);
      if (req.method === 'PUT') { if (limited(req)) return send(res, 429, { error: 'slow down' }); store.responses[id] = clean(await readBody(req, 4000)); persist(); notify(); return send(res, 200, { ok: true }); }
      if (req.method === 'DELETE') { if (!isHost(req)) return send(res, 403, { error: 'host only' }); delete store.responses[id]; persist(); notify(); return send(res, 200, { ok: true }); }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: e.message }); }
}).listen(PORT, () => console.log('A.N.T.S ModTecH running on port ' + PORT + (PASS === 'ants-change-me' ? ' (WARNING: set HOST_PASSWORD)' : '')));
