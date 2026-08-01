/* ═══════ VINTAGE Cloud Sync Server（零依赖 Node）═══════
 * 1) 托管 ../app 静态资源（前端 + PWA）
 * 2) 提供 /api/* 账号认证与数据云同步
 * 运行：node server/server.js   （可用环境变量 PORT 覆盖，默认 3000）
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_DIR = path.join(__dirname, '..', 'app');
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORT = process.env.PORT || 3000;

/* ── 用户存储（单文件 JSON，个人应用足够；如需更高并发可换数据库）── */
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) || {}; }
  catch (e) { return {}; }
}
function saveUsers(u) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
}
let _users = loadUsers();
function persist() { saveUsers(_users); }

/* ── 密码散列（scrypt）── */
function makeSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPass(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }

/* ── 工具 ── */
function sendJSON(res, code, obj, extra) {
  const head = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }, extra || {});
  res.writeHead(code, head);
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(resolve => {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } });
  });
}
function authEmail(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const found = Object.keys(_users).find(em => _users[em].token === token);
  return found || null;
}
function newToken() { return crypto.randomBytes(24).toString('hex'); }

const DEFAULT_DATA = {
  study:   { tasks: [], links: [], days: {}, pomo: { total: 0, running: false, startedAt: 0, daySec: {}, migrated: 1 } },
  private: { tasks: [], links: [] },
  ai:      { tasks: [], links: [] },
  movie:   { tasks: [], links: [] },
  book:    { tasks: [], links: [] },
  job:     { todo: [], done: [], block: [], improve: [] },
  eur:     { cities: [], luggage: [], amapKey: '' },
  kr:      { days: {} },
  us:      { days: {} },
  notes:   [],
  profile: { name: '', avatar: '' },
  custom:  {}
};

/* ── API 处理 ── */
async function handleApi(req, res, url) {
  const p = url.pathname;

  if (p === '/api/ping') return sendJSON(res, 200, { ok: true, msg: 'vintage-cloud' });

  /* 注册 */
  if (p === '/api/register' && req.method === 'POST') {
    const { email, pass } = await readBody(req);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { msg: '邮箱格式不正确' });
    if (!pass || pass.length < 4) return sendJSON(res, 400, { msg: '密码至少 4 位' });
    if (_users[email]) return sendJSON(res, 409, { msg: '该账号已注册，请直接登录' });
    const salt = makeSalt();
    _users[email] = {
      email, salt, hash: hashPass(pass, salt),
      token: newToken(), created: Date.now(),
      data: JSON.parse(JSON.stringify(DEFAULT_DATA))
    };
    persist();
    return sendJSON(res, 200, { ok: true, token: _users[email].token, data: _users[email].data, created: _users[email].created });
  }

  /* 登录 */
  if (p === '/api/login' && req.method === 'POST') {
    const { email, pass } = await readBody(req);
    const u = _users[email];
    if (!u) return sendJSON(res, 401, { msg: '账号不存在，请先注册' });
    if (u.hash !== hashPass(pass, u.salt)) return sendJSON(res, 401, { msg: '密码不正确' });
    u.token = newToken(); persist();
    return sendJSON(res, 200, { ok: true, token: u.token, data: u.data, created: u.created });
  }

  /* 拉取数据（需 token） */
  if (p === '/api/data' && req.method === 'GET') {
    const em = authEmail(req);
    if (!em) return sendJSON(res, 401, { msg: '未登录或登录已过期' });
    return sendJSON(res, 200, { ok: true, data: _users[em].data, updated: _users[em].updated || 0 });
  }

  /* 写入数据（需 token） */
  if (p === '/api/data' && req.method === 'POST') {
    const em = authEmail(req);
    if (!em) return sendJSON(res, 401, { msg: '未登录或登录已过期' });
    const body = await readBody(req);
    if (!body || !body.data) return sendJSON(res, 400, { msg: '数据为空' });
    // 结构合并，防止客户端缺字段
    const merged = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), body.data);
    merged.profile = Object.assign({ name: '', avatar: '' }, body.data.profile || {});
    _users[em].data = merged;
    _users[em].updated = Date.now();
    persist();
    return sendJSON(res, 200, { ok: true, updated: _users[em].updated });
  }

  /* 账号信息 */
  if (p === '/api/me' && req.method === 'GET') {
    const em = authEmail(req);
    if (!em) return sendJSON(res, 401, { msg: '未登录' });
    const u = _users[em];
    return sendJSON(res, 200, { ok: true, email: em, name: (u.data.profile && u.data.profile.name) || '', created: u.created });
  }

  return sendJSON(res, 404, { msg: 'unknown api' });
}

/* ── 静态文件托管 ── */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain'
};
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(APP_DIR, rel));
  if (!file.startsWith(APP_DIR)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA 兜底：未知路径回 index.html
      fs.readFile(path.join(APP_DIR, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache, must-revalidate' });
        res.end(idx);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    /* 缓存策略：应用外壳（html/css/js/manifest）每次校验，避免发布后仍拿到旧版本；
       图标等不可变资源长缓存 */
    const shell = ['.html', '.css', '.js', '.json', '.webmanifest'].includes(ext);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': shell ? 'no-cache, must-revalidate' : 'public, max-age=604800'
    });
    res.end(buf);
  });
}

/* ── 主服务 ── */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return sendJSON(res, 204, {});
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(e => sendJSON(res, 500, { msg: 'server error' }));
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🪐 VINTAGE cloud running:  http://localhost:${PORT}\n`);
});
