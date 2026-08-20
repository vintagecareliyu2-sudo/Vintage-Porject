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
  /* 原子写入：先写临时文件再 rename，避免写入中途进程崩溃导致 users.json 损坏 */
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(u, null, 2));
  fs.renameSync(tmp, USERS_FILE);
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
  study:   { tasks: [], links: [], days: {}, pomo: { total: 0, running: false, startedAt: 0, daySec: {}, migrated: 1 }, subjectPreset: 'general' },
  private: { items: [], links: [] },
  ai:      { tasks: [], prompts: [], chats: [], links: [] },
  movie:   { movies: [], tasks: [], links: [] },
  book:    { books: [], tasks: [], links: [] },
  job:     { todo: [], done: [], block: [], improve: [] },
  eur:     { cities: [], luggage: [], amapKey: '' },
  kr:      { days: {} },
  us:      { days: {} },
  notes:   [],
  profile: { name: '', avatar: '' },
  custom:  {}
};

/* ── 数据规范化 / 旧数据迁移（注册与 POST /api/data 共用）──
 * 深度合并 DEFAULT_DATA，保证云端存储的结构始终与前端一致，
 * 旧账号缺字段时自动补齐，不会因为后端默认值过期而归零。 */
function normalizeData(input) {
  const def = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const d = input && typeof input === 'object' ? input : {};
  for (const k in def) if (d[k] === undefined) d[k] = def[k];

  const study = d.study || (d.study = def.study);
  if (!study.pomo) study.pomo = def.study.pomo;
  else for (const k in def.study.pomo) if (study.pomo[k] === undefined) study.pomo[k] = def.study.pomo[k];
  if (!study.days) study.days = {};
  if (study.subjectPreset === undefined) study.subjectPreset = 'general';
  if (!Array.isArray(study.tasks)) study.tasks = [];
  if (!Array.isArray(study.links)) study.links = [];

  const priv = d.private || (d.private = def.private);
  if (!Array.isArray(priv.items)) priv.items = [];
  if (!Array.isArray(priv.links)) priv.links = [];

  const ai = d.ai || (d.ai = def.ai);
  ['tasks', 'prompts', 'chats', 'links'].forEach(k => { if (!Array.isArray(ai[k])) ai[k] = []; });

  const mv = d.movie || (d.movie = def.movie);
  ['movies', 'tasks', 'links'].forEach(k => { if (!Array.isArray(mv[k])) mv[k] = []; });

  const bk = d.book || (d.book = def.book);
  ['books', 'tasks', 'links'].forEach(k => { if (!Array.isArray(bk[k])) bk[k] = []; });

  const job = d.job || (d.job = def.job);
  ['todo', 'done', 'block', 'improve'].forEach(k => { if (!Array.isArray(job[k])) job[k] = []; });

  const eur = d.eur || (d.eur = def.eur);
  if (!Array.isArray(eur.cities)) eur.cities = [];
  if (!Array.isArray(eur.luggage)) eur.luggage = [];
  if (eur.amapKey === undefined) eur.amapKey = '';

  if (!d.kr) d.kr = { days: {} }; if (!d.kr.days) d.kr.days = {};
  if (!d.us) d.us = { days: {} }; if (!d.us.days) d.us.days = {};
  if (!Array.isArray(d.notes)) d.notes = [];
  if (!d.profile) d.profile = { name: '', avatar: '' };
  if (!d.custom) d.custom = {};
  return d;
}

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
      data: normalizeData({})
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
    // 结构规范化 + 旧数据迁移，保证云端结构与前端一致
    const merged = normalizeData(body.data);
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

  /* 登出（使当前 token 失效，防止旧 token 被复用） */
  if (p === '/api/logout' && req.method === 'POST') {
    const em = authEmail(req);
    if (em) { _users[em].token = newToken(); persist(); }
    return sendJSON(res, 200, { ok: true });
  }

  /* 修改密码（需原密码校验） */
  if (p === '/api/reset-password' && req.method === 'POST') {
    const { email, oldPass, newPass } = await readBody(req);
    if (!email || !oldPass || !newPass) return sendJSON(res, 400, { msg: '缺少必要字段' });
    if (newPass.length < 4) return sendJSON(res, 400, { msg: '新密码至少 4 位' });
    const u = _users[email];
    if (!u) return sendJSON(res, 401, { msg: '账号不存在' });
    if (u.hash !== hashPass(oldPass, u.salt)) return sendJSON(res, 401, { msg: '原密码不正确' });
    u.salt = makeSalt(); u.hash = hashPass(newPass, u.salt); u.token = newToken(); persist();
    return sendJSON(res, 200, { ok: true, token: u.token });
  }

  /* 导出本人云端数据（打包备份，供本机导入恢复） */
  if (p === '/api/export' && req.method === 'GET') {
    const em = authEmail(req);
    if (!em) return sendJSON(res, 401, { msg: '未登录' });
    return sendJSON(res, 200, { ok: true, email: em, data: _users[em].data, exported: Date.now() });
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
