/* ═══════ VINTAGE Store：账号 + 数据持久化（含存储降级 + 云同步）═══════ */
'use strict';

const Store = (() => {
  const ACC_KEY = 'vintage_accounts';
  const SES_KEY = 'vintage_session';
  const CSES = 'vintage_cloud_session';   /* 云账号 email */
  const CTOK = 'vintage_cloud_token';     /* 云会话 token */
  const CCRE = 'vintage_cloud_created';   /* 云账号注册时间 */
  let _uid = null;
  let _data = null;

  /* ── 存储安全层：localStorage 不可用时降级到内存，避免功能整体失效 ── */
  const _mem = {};
  let _persistent = true;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { _persistent = false; return k in _mem ? _mem[k] : null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { _persistent = false; _mem[k] = v; return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} delete _mem[k]; }
  function persistent() { if (_persistent) { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { _persistent = false; } } return _persistent; }

  /* 简单散列（本地存储用，非明文即可） */
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36) + '_' + s.length;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const cloudEmail = () => lsGet(CSES) || '';
  const cloudToken = () => lsGet(CTOK) || '';

  function accounts() { try { return JSON.parse(lsGet(ACC_KEY)) || []; } catch (e) { return []; } }
  function saveAccounts(a) { lsSet(ACC_KEY, JSON.stringify(a)); }

  function defaultData() {
    return {
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
      profile: { name: '', avatar: '' },   /* 账号资料，云同步随数据走 */
      custom:  {}   /* 侧边栏自定义：{modId:{icon,label}} */
    };
  }

  function seed(d) {
    const t = (title) => ({ id: uid(), title, done: false, images: [], note: '', logs: [] });
    d.movie.tasks.push(t('示例：星际穿越（重看）'));
    d.book.tasks.push(t('示例：《置身事内》第三章'));
    d.eur.cities.push({ id: uid(), name: 'PARIS', days: [{ id: uid(), title: 'DAY 1 · 抵达', items: [
      { id: uid(), text: '戴高乐机场 → 市区 RER B', cat: '交通', done: false },
      { id: uid(), text: '入住玛黑区酒店', cat: '住宿', done: false },
      { id: uid(), text: '塞纳河傍晚散步', cat: '景点', done: false }
    ] }] });
    d.eur.luggage.push({ id: uid(), text: '护照 + 签证复印件', done: false }, { id: uid(), text: '欧标转换插头', done: false });
    d.notes.push({ id: uid(), title: '示例：美联储利率观察', text: '记录要点……点击进入可编辑文字、添加图片、涂鸦。', images: [], doodle: '', updated: Date.now() });
    return d;
  }

  /* 云可用时注册：走服务端 */
  async function register(email, pass) {
    if (typeof Sync !== 'undefined') await Sync.detect();
    if (typeof Sync !== 'undefined' && Sync.enabled() && isEmail(email)) {
      try {
        const r = await Sync.register(email, pass);
        _uid = 'cloud:' + email; _data = null;
        lsSet('vintage_data_' + _uid, JSON.stringify(r.data));
        lsSet(SES_KEY, _uid);
        lsSet(CSES, email); lsSet(CTOK, cloudToken() || ''); lsSet(CCRE, String(Date.now()));
        return { ok: true, id: _uid };
      } catch (e) { return { ok: false, msg: e.message || '云端注册失败' }; }
    }
    const list = accounts();
    if (list.find(a => a.email === email)) return { ok: false, msg: '该账号已注册，请直接登录' };
    const acc = { id: uid(), email, pass: hash(pass), created: Date.now(), name: '', avatar: '' };
    list.push(acc); saveAccounts(list);
    lsSet('vintage_data_' + acc.id, JSON.stringify(seed(defaultData())));
    return { ok: true, id: acc.id };
  }

  /* 云可用时登录：走服务端并拉取云端数据 */
  async function login(email, pass) {
    if (typeof Sync !== 'undefined') await Sync.detect();
    if (typeof Sync !== 'undefined' && Sync.enabled() && isEmail(email)) {
      try {
        const r = await Sync.login(email, pass);
        _uid = 'cloud:' + email; _data = null;
        lsSet('vintage_data_' + _uid, JSON.stringify(r.data));
        lsSet(SES_KEY, _uid);
        lsSet(CSES, email); lsSet(CTOK, cloudToken() || ''); lsSet(CCRE, String(r.created || Date.now()));
        return { ok: true };
      } catch (e) { return { ok: false, msg: e.message || '云端登录失败' }; }
    }
    const acc = accounts().find(a => a.email === email);
    if (!acc) return { ok: false, msg: '账号不存在，请先注册' };
    if (acc.pass !== hash(pass)) return { ok: false, msg: '密码不正确' };
    lsSet(SES_KEY, acc.id); _uid = acc.id; _data = null;
    return { ok: true };
  }

  function resetPass(email, newPass) {
    if (typeof Sync !== 'undefined' && Sync.enabled() && isEmail(email))
      return { ok: false, msg: '云端账号暂不支持重置，请重新注册或使用本地账号' };
    const list = accounts();
    const acc = list.find(a => a.email === email);
    if (!acc) return { ok: false, msg: '账号不存在' };
    acc.pass = hash(newPass); saveAccounts(list);
    return { ok: true };
  }

  function session() {
    const id = lsGet(SES_KEY);
    if (id && id.indexOf('cloud:') === 0) {
      if (cloudToken()) { _uid = id; return current(); }
      lsDel(SES_KEY); lsDel(CSES); lsDel(CTOK); lsDel(CCRE);
    }
    if (id) { const acc = accounts().find(a => a.id === id); if (acc) { _uid = id; return acc; } }
    return null;
  }
  function current() {
    const id = _uid || lsGet(SES_KEY);
    if (id && id.indexOf('cloud:') === 0) {
      const d = data();
      return { id, email: id.slice(6), name: (d.profile && d.profile.name) || '', avatar: (d.profile && d.profile.avatar) || '', created: Number(lsGet(CCRE) || 0), isCloud: true };
    }
    return accounts().find(a => a.id === id) || null;
  }
  function logout() {
    lsDel(SES_KEY); lsDel(CSES); lsDel(CTOK); lsDel(CCRE);
    if (typeof Sync !== 'undefined') Sync.logout();
    _uid = null; _data = null;
  }

  /* 个人资料更新（昵称 / 头像 emoji 或图片 dataURL），写入 data().profile 以便云同步携带 */
  function updateProfile(fields) {
    const d = data();
    if (!d.profile) d.profile = { name: '', avatar: '' };
    if (fields.name !== undefined) d.profile.name = fields.name;
    if (fields.avatar !== undefined) d.profile.avatar = fields.avatar;
    save();
    if (_uid && _uid.indexOf('cloud:') !== 0) {
      const list = accounts();
      const acc = list.find(a => a.id === _uid);
      if (acc) { if (fields.name !== undefined) acc.name = fields.name; if (fields.avatar !== undefined) acc.avatar = fields.avatar; saveAccounts(list); }
    }
    return true;
  }
  /* 本机账号列表（切换账号用，不暴露密码） */
  function listAccounts() {
    return accounts().map(a => ({ id: a.id, email: a.email, name: a.name || '', avatar: a.avatar || '' }));
  }

  function data() {
    if (_data) return _data;
    try { _data = JSON.parse(lsGet('vintage_data_' + _uid)); } catch (e) { _data = null; }
    if (!_data) _data = defaultData();
    /* 结构兜底 + 旧数据迁移 */
    const def = defaultData();
    for (const k in def) if (_data[k] === undefined) _data[k] = def[k];
    if (!_data.study.days) _data.study.days = {};
    if (!_data.study.pomo) _data.study.pomo = { total: 0, running: false, startedAt: 0, daySec: {}, migrated: 1 };
    if (!_data.study.pomo.daySec) _data.study.pomo.daySec = {};
    if (!_data.profile) _data.profile = { name: '', avatar: '' };
    if (!_data.custom) _data.custom = {};
    /* 迁移：旧版按任务记录的番茄钟时长并入累计 */
    if (!_data.study.pomo.migrated) {
      const oldMin = (_data.study.tasks || []).reduce((s, t) => s + (t.logs || []).reduce((a, l) => a + (l.min || 0), 0), 0);
      _data.study.pomo.total += oldMin * 60;
      _data.study.pomo.migrated = 1;
    }
    return _data;
  }
  function save() {
    if (!_uid || !_data) return;
    const ok = lsSet('vintage_data_' + _uid, JSON.stringify(_data));
    if (typeof Sync !== 'undefined' && Sync.enabled()) Sync.push(_data);   /* 防抖推送云端 */
    if (!ok && typeof FX !== 'undefined') FX.toast('⚠ 当前环境无法持久保存，请在浏览器中打开');
  }

  /* 应用从云端拉取的最新数据（不回推，避免回声） */
  function applyRemote(d) {
    if (!d) return;
    _data = d;
    lsSet('vintage_data_' + _uid, JSON.stringify(_data));
  }

  /* 图片压缩为缩略 dataURL（最长边 900px） */
  function resizeImage(file, cb, max = 900) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (Math.max(w, h) > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.78));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* 导出 / 导入（本地备份，与云端不冲突） */
  function exportData() {
    const blob = new Blob([JSON.stringify({ v: 1, exported: Date.now(), data: data() })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vintage-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  }
  function importData(file, cb) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj.data) throw 0;
        _data = obj.data; save(); cb(true);
      } catch (e) { cb(false); }
    };
    r.readAsText(file);
  }

  return { uid, register, login, resetPass, session, current, logout, data, save, applyRemote,
           resizeImage, exportData, importData, updateProfile, listAccounts, persistent };
})();
