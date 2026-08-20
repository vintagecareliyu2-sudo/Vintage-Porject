/* ═══════ VINTAGE Sync：云同步客户端 ════════
 * 自动探测同源 /api（部署到云端后端时自动启用，纯本地打开则降级为仅本机存储）。
 * 也可在 index.html 通过 <script>window.VINTAGE_SYNC_URL='https://你的域名'</script> 强制指定。
 */
'use strict';

const Sync = (() => {
  /* 同步目标：默认同源（部署后端后自动可用）；可手动覆盖 */
  const FORCED = (window.VINTAGE_SYNC_URL || '').replace(/\/$/, '');
  const SAME_ORIGIN = (location.protocol === 'http:' || location.protocol === 'https:')
    ? (location.origin + '') : '';
  let _mode = 'local';          /* 'cloud' | 'local' */
  let _url = '';
  let _available = null;        /* Promise，探测完成后定 */
  let _status = 'local';        /* 'cloud' | 'local' | 'offline' */
  const _subs = [];

  function token() { try { return localStorage.getItem('vintage_cloud_token') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('vintage_cloud_token', t); else localStorage.removeItem('vintage_cloud_token'); } catch (e) {} }
  function cloudEmail() { try { return localStorage.getItem('vintage_cloud_email') || ''; } catch (e) { return ''; } }
  function setCloudEmail(e) { try { if (e) localStorage.setItem('vintage_cloud_email', e); else localStorage.removeItem('vintage_cloud_email'); } catch (e) {} }

  function notify() { _subs.forEach(fn => { try { fn(_status); } catch (e) {} }); }
  function setStatus(s) { _status = s; notify(); }

  async function api(path, opts) {
    const base = _url || SAME_ORIGIN;
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch(base + path, Object.assign({ method: 'GET', headers }, opts || {}));
    let j = {};
    try { j = await res.json(); } catch (e) {}
    if (!res.ok) throw Object.assign(new Error(j.msg || 'sync error'), { code: res.status, body: j });
    return j;
  }

  /* 探测后端是否可用（幂等） */
  function detect() {
    if (_available) return _available;
    _available = (async () => {
      const base = FORCED || SAME_ORIGIN;
      if (!base) { _mode = 'local'; _url = ''; return false; }
      try {
        const res = await fetch(base + '/api/ping', { method: 'GET' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.ok) { _mode = 'cloud'; _url = base; return true; }
      } catch (e) {}
      _mode = 'local'; _url = ''; return false;
    })();
    return _available;
  }

  async function register(email, pass) {
    await detect();
    const j = await api('/api/register', { method: 'POST', body: JSON.stringify({ email, pass }) });
    setToken(j.token); setCloudEmail(email);
    setStatus('cloud');
    return { ok: true, data: j.data };
  }
  async function login(email, pass) {
    await detect();
    const j = await api('/api/login', { method: 'POST', body: JSON.stringify({ email, pass }) });
    setToken(j.token); setCloudEmail(email);
    setStatus('cloud');
    return { ok: true, data: j.data };
  }
  async function pull() {
    const j = await api('/api/data');
    setStatus('cloud');
    return j.data;
  }
  let _timer = null;
  function push(data) {
    if (_mode !== 'cloud') return;
    if (_timer) return;                       // 防抖：600ms 内的多次保存合并为一次
    _timer = setTimeout(async () => {
      _timer = null;
      try { await api('/api/data', { method: 'POST', body: JSON.stringify({ data }) }); setStatus('cloud'); }
      catch (e) { setStatus('offline'); }
    }, 600);
  }
  function logout() { setToken(''); setCloudEmail(''); setStatus('local'); }

  async function resetPassword(email, oldPass, newPass) {
    await detect();
    const j = await api('/api/reset-password', { method: 'POST', body: JSON.stringify({ email, oldPass, newPass }) });
    setToken(j.token); setStatus('cloud');
    return { ok: true };
  }

  return {
    detect, register, login, pull, push, logout, resetPassword,
    enabled: () => _mode === 'cloud',
    isCloudEmail: (em) => cloudEmail() === em,
    status: () => _status,
    onStatus: (fn) => { _subs.push(fn); },
    /* 启动后若已有云会话，异步拉取最新数据 */
    async resume() {
      await detect();
      if (_mode !== 'cloud' || !token()) { setStatus('local'); return false; }
      try { return await pull(); } catch (e) { setStatus('offline'); return null; }
    }
  };
})();
