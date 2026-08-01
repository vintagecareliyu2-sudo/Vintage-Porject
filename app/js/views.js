/* ═══════ VINTAGE Views 1：待办模块 / 任务详情 / Study 打卡+秒表 / 语言打卡 ═══════ */
'use strict';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $m = () => document.getElementById('main');

const MODULES = [
  { id: 'study',   icon: '🎓', label: 'Study Project' },
  { id: 'private', icon: '🗝️', label: 'Private Info' },
  { id: 'job',     icon: '💼', label: 'Job Content' },
  { id: 'ai',      icon: '🤖', label: 'AI skill' },
  { id: 'eur',     icon: '🗺️', label: 'EUR trvl' },
  { id: 'kr',      flag: 'kr', label: 'Korea Language' },
  { id: 'us',      flag: 'us', label: 'USA Language' },
  { id: 'movie',   icon: '🎬', label: 'Movie' },
  { id: 'book',    icon: '📖', label: 'Book' },
  { id: 'notes',   icon: '📜', label: '時政及金融筆記匯總' }
];
/* 自定义覆盖（侧边栏可编辑）：存在 data().custom */
const modCustom = id => { try { return (Store.data().custom || {})[id] || {}; } catch (e) { return {}; } };
const modLabel = m => modCustom(m.id).label || m.label;
const modIcon = m => {
  const c = modCustom(m.id);
  if (c.icon) return `<span class="menu-icon">${esc(c.icon)}</span>`;
  return m.flag ? `<span class="flag flag-${m.flag}"></span>` : `<span class="menu-icon">${m.icon}</span>`;
};
const modOf = id => MODULES.find(m => m.id === id);

/* ── 页面头部 ── */
function pageHead(mod, sub) {
  return `<div class="page-head">${modIcon(mod)}<span class="page-title">${esc(modLabel(mod))}</span>
    <span class="page-sub">${sub || ''}</span></div><div class="arc-line"></div>`;
}

/* ══════════ 待办类模块（private/ai/book）══════════ */
const TODO_SUBS = { private: 'KEEP IT SECRET', ai: 'LEVEL UP', book: 'READING LIST' };

function todoListView(modId, tab) {
  const mod = modOf(modId), d = Store.data()[modId];
  tab = tab || 'tasks';
  const tasks = d.tasks;
  let listHtml;
  if (tab === 'tasks') {
    listHtml = tasks.length ? tasks.map(t => `
      <div class="t-item glass press" data-id="${t.id}">
        <span class="t-check" data-act="check">✓</span>
        <span class="t-title">${esc(t.title)}</span>
        ${t.images.length ? `<span class="t-badge">🖼 ×${t.images.length}</span>` : ''}
        <button class="t-del" data-act="del">✕</button>
        <span class="t-arrow">›</span>
      </div>`).join('') : `<div class="empty">— 暂无条目，先添加一个 —</div>`;
    listHtml = `
      <div class="add-row"><input class="ginput" id="new-task" placeholder="添加新条目…" maxlength="80">
      <button class="add-btn press" id="add-task">添加</button></div>${listHtml}`;
  } else {
    const links = d.links;
    listHtml = `
      <div class="add-row"><input class="ginput" id="new-url" placeholder="粘贴网址 https://…">
      <button class="add-btn press" id="add-url">收藏</button></div>` +
      (links.length ? links.map(l => `
      <div class="link-item glass" data-id="${l.id}">
        <span class="link-fav">🔗</span>
        <span class="link-body"><span class="link-t">${esc(l.title)}</span><br><span class="link-u">${esc(l.url)}</span></span>
        <a class="link-go press" href="${esc(l.url)}" target="_blank" rel="noopener">访问 ↗</a>
        <button class="t-del" data-act="dellink">✕</button>
      </div>`).join('') : `<div class="empty">— 暂无收藏网址 —</div>`);
  }
  $m().innerHTML = pageHead(mod, TODO_SUBS[modId]) + `
    <div class="tabs">
      <span class="tab ${tab === 'tasks' ? 'active' : ''}" data-tab="tasks">任务列表</span>
      <span class="tab ${tab === 'links' ? 'active' : ''}" data-tab="links">网址收藏</span>
    </div>${listHtml}`;

  $m().querySelectorAll('.tab').forEach(el => el.onclick = () => todoListView(modId, el.dataset.tab));

  if (tab === 'tasks') {
    const add = () => {
      const inp = document.getElementById('new-task');
      const v = inp.value.trim(); if (!v) return;
      d.tasks.unshift({ id: Store.uid(), title: v, done: false, images: [], note: '', logs: [] });
      Store.save(); todoListView(modId, 'tasks'); FX.toast('已添加');
    };
    document.getElementById('add-task').onclick = add;
    document.getElementById('new-task').onkeydown = e => { if (e.key === 'Enter') add(); };
    $m().querySelectorAll('.t-item').forEach(el => {
      el.onclick = e => {
        const act = e.target.dataset.act;
        const t = d.tasks.find(x => x.id === el.dataset.id);
        if (act === 'check') {
          t.done = !t.done; Store.save();
          if (t.done) { FX.burstFrom(e.target); FX.sweep(el); }
          el.classList.toggle('done', t.done);
        } else if (act === 'del') {
          d.tasks = d.tasks.filter(x => x.id !== t.id); Store.save(); todoListView(modId, 'tasks');
        } else {
          location.hash = `#/${modId}/t/${t.id}`;
        }
      };
      const t = d.tasks.find(x => x.id === el.dataset.id);
      if (t && t.done) el.classList.add('done');
    });
  } else {
    const add = () => {
      const inp = document.getElementById('new-url');
      let v = inp.value.trim(); if (!v) return;
      if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
      let title = v; try { title = new URL(v).hostname.replace(/^www\./, ''); } catch (e) {}
      d.links.unshift({ id: Store.uid(), url: v, title });
      Store.save(); todoListView(modId, 'links'); FX.toast('已收藏');
    };
    document.getElementById('add-url').onclick = add;
    document.getElementById('new-url').onkeydown = e => { if (e.key === 'Enter') add(); };
    $m().querySelectorAll('[data-act="dellink"]').forEach(b => b.onclick = e => {
      const id = e.target.closest('.link-item').dataset.id;
      d.links = d.links.filter(x => x.id !== id); Store.save(); todoListView(modId, 'links');
    });
  }
}

/* ══════════ 任务详情（图片墙 + 备注）══════════ */
function taskDetailView(modId, taskId) {
  const mod = modOf(modId), d = Store.data()[modId];
  const t = d.tasks.find(x => x.id === taskId);
  if (!t) { location.hash = '#/' + modId; return; }

  const thumbs = t.images.map((src, i) => `
    <span class="thumb-wrap"><img class="thumb" src="${src}" alt="">
    <button class="thumb-x" data-i="${i}">✕</button></span>`).join('');

  $m().innerHTML = pageHead(mod, '任务详情') + `
    <span class="back-link" onclick="location.hash='#/${modId}'">‹ 返回列表</span>
    <div class="t-item glass" style="cursor:default">
      <span class="t-check" id="dt-check">✓</span>
      <span class="t-title" style="white-space:normal">${esc(t.title)}</span>
    </div>
    <div class="sec-label">IMAGES · 图片（点击放大）</div>
    <div class="thumb-grid">${thumbs}
      <label class="upload-btn press">＋<input type="file" id="up-img" accept="image/*" multiple hidden></label>
    </div>
    <div class="sec-label">NOTE · 备注</div>
    <textarea class="note-area" id="dt-note" placeholder="记录内容、心得、要点…">${esc(t.note)}</textarea>`;

  const chk = document.getElementById('dt-check');
  if (t.done) chk.parentElement.classList.add('done');
  chk.onclick = () => {
    t.done = !t.done; Store.save();
    chk.parentElement.classList.toggle('done', t.done);
    if (t.done) FX.burstFrom(chk);
  };
  document.getElementById('up-img').onchange = e => {
    [...e.target.files].forEach(f => Store.resizeImage(f, url => {
      t.images.push(url); Store.save(); taskDetailView(modId, taskId);
    }));
  };
  $m().querySelectorAll('.thumb-x').forEach(b => b.onclick = () => {
    t.images.splice(+b.dataset.i, 1); Store.save(); taskDetailView(modId, taskId);
  });
  let noteTimer;
  document.getElementById('dt-note').oninput = e => {
    t.note = e.target.value;
    clearTimeout(noteTimer); noteTimer = setTimeout(() => Store.save(), 500);
  };
}

/* ══════════ 打卡日历通用（kr / us / study 共用）══════════ */
const LANG_MODS = [
  { k: 'w', name: '单词', ico: '🔤' },
  { k: 'd', name: '对话', ico: '💬' },
  { k: 's', name: '语句', ico: '✏️' },
  { k: 'r', name: '文章跟读', ico: '📄' },
  { k: 'q', name: '问题总结', ico: '❓' }
];
const STUDY_MODS = [
  { k: 'rd', name: '阅读学习', ico: '📖' },
  { k: 'pr', name: '练习实操', ico: '✍️' },
  { k: 'rv', name: '复习巩固', ico: '🔁' },
  { k: 'nt', name: '笔记整理', ico: '📝' },
  { k: 'qs', name: '问题总结', ico: '❓' }
];
const dayModsOf = modId => {
  if (modId === 'study') {
    const d = Store.data().study;
    const preset = d.subjectPreset || 'general';
    return DEFAULT_STUDY_PRESETS[preset] || STUDY_MODS;
  }
  return LANG_MODS;
};
const dayScore = (rec, mods) => rec ? (mods || LANG_MODS).filter(m => rec[m.k]).length : 0;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function langView(modId, ym) {
  const mod = modOf(modId), d = Store.data()[modId];
  const MODS = dayModsOf(modId);
  const now = new Date();
  let [Y, M] = ym ? ym.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const first = new Date(Y, M - 1, 1);
  const daysIn = new Date(Y, M, 0).getDate();
  const todayStr = ymd(now);

  /* 一行 = 一周（周一开始），仅当月日期，其余留空 */
  let cells = [];
  const lead = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysIn; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  let checked = 0;
  const rows = weeks.map((w, wi) => `<div class="cal-week"><span class="cal-wlab">W${wi + 1}</span>` +
    w.map(day => {
      if (!day) return `<span class="cal-day blank"></span>`;
      const ds = `${Y}-${String(M).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const sc = dayScore(d.days[ds], MODS);
      if (sc > 0) checked++;
      const isToday = ds === todayStr;
      const isFuture = ds > todayStr;
      const cls = sc >= 5 ? 'full' : sc > 0 ? 'some' : '';
      return `<span class="cal-day ${cls} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}" data-d="${ds}">
        ${sc > 0 ? '✓' : day}</span>`;
    }).join('') + `</div>`).join('');

  const prev = M === 1 ? `${Y - 1}-12` : `${Y}-${M - 1}`;
  const next = M === 12 ? `${Y + 1}-1` : `${Y}-${M + 1}`;

  /* Study 专属：学科切换 + 累计秒表番茄钟卡片 */
  const presetCard = modId === 'study' ? `
    <div class="glass" style="padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--txt3)">学习学科：</span>
      <select class="ginput" id="study-preset" style="padding:6px 10px;font-size:12px;width:auto">
        <option value="general" ${(d.subjectPreset||'general')==='general'?'selected':''}>📚 通用学习</option>
        <option value="law" ${d.subjectPreset==='law'?'selected':''}>⚖️ 法学</option>
        <option value="language" ${d.subjectPreset==='language'?'selected':''}>🌍 语言学习</option>
      </select>
      <span style="font-size:10px;color:var(--txt3);margin-left:auto">切换后打卡项会相应变化</span>
    </div>` : '';
  const pomoCard = modId === 'study' ? `
    <div class="glass pomo-mini" id="pomo-card">
      <div class="pm-left">
        <div class="pm-label">🍅 POMODORO · 累计学习时钟</div>
        <div class="pm-clock" id="pm-clock">00:00:00</div>
        <div class="pm-sub" id="pm-sub">今日 0 分钟</div>
      </div>
      <button class="pm-btn press" id="pm-toggle">开始</button>
    </div>` : '';

  $m().innerHTML = pageHead(mod, 'DAILY CHECK-IN') + presetCard + pomoCard + `
    <div class="stats-row">
      <div class="stat-card glass"><span class="stat-label">本月打卡</span>
        <span class="stat-value" id="lv-c">0<small> 天</small></span>${FX.ring(Math.round(checked / daysIn * 100))}</div>
      <div class="stat-card glass"><span class="stat-label">今日状态</span>
        <span class="stat-value">${dayScore(d.days[todayStr], MODS)}<small> / 5 模块</small></span></div>
    </div>
    <div class="glass" style="padding:18px 20px">
      <div class="cal-head">
        <button class="cal-nav press" id="cal-prev">‹</button>
        <span class="cal-month">${Y} 年 ${M} 月</span>
        <button class="cal-nav press" id="cal-next">›</button>
      </div>
      <div class="cal-dow"><span></span>${'一二三四五六日'.split('').map(x => `<span>${x}</span>`).join('')}</div>
      ${rows}
      <div class="cal-legend">
        <span><i style="background:var(--gold-grad)"></i>全部完成</span>
        <span><i style="border:1.5px solid rgba(212,175,55,0.55)"></i>部分完成</span>
        <span><i style="border:1.5px dashed rgba(255,255,255,0.2)"></i>未打卡</span>
      </div>
    </div>
    <div id="day-panel"></div>`;

  document.getElementById('lv-c').innerHTML = `${checked}<small> 天</small>`;
  document.getElementById('cal-prev').onclick = () => langView(modId, prev);
  document.getElementById('cal-next').onclick = () => langView(modId, next);
  $m().querySelectorAll('.cal-day[data-d]').forEach(el => el.onclick = () => {
    if (el.classList.contains('future')) return FX.toast('未来的日子还没到呢');
    renderDayPanel(modId, el.dataset.d);
    document.getElementById('day-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  /* 默认展开今天（当月时） */
  if (Y === now.getFullYear() && M === now.getMonth() + 1) renderDayPanel(modId, todayStr);
  if (modId === 'study') {
    bindPomoMini();
    const sel = document.getElementById('study-preset');
    if (sel) sel.onchange = () => { d.subjectPreset = sel.value; Store.save(); langView(modId, `${Y}-${M}`); FX.toast('学习模块已切换'); };
  }
}

function renderDayPanel(modId, ds) {
  const d = Store.data()[modId];
  const MODS = dayModsOf(modId);
  const rec = d.days[ds] || {};
  const panel = document.getElementById('day-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="sec-label">${ds} · 学习模块（${dayScore(rec, MODS)}/5）</div>
    <div class="day-mods">${MODS.map(m => `
      <div class="day-mod glass press ${rec[m.k] ? 'done' : ''}" data-k="${m.k}">
        <span class="dm-ico">${m.ico}</span>
        <span class="dm-name">${m.name}</span>
        <span class="t-check">✓</span>
      </div>`).join('')}
    </div>`;
  panel.querySelectorAll('.day-mod').forEach(el => {
    const t = el.querySelector('.t-check');
    const paint = () => {
      const on = !!(d.days[ds] && d.days[ds][el.dataset.k]);
      t.style.background = on ? 'linear-gradient(135deg,#F3A183,#D4AF37)' : '';
      t.style.borderColor = on ? 'transparent' : '';
      t.style.color = on ? '#1a1408' : 'transparent';
    };
    paint();
    el.onclick = () => {
      d.days[ds] = d.days[ds] || {};
      d.days[ds][el.dataset.k] = d.days[ds][el.dataset.k] ? 0 : 1;
      Store.save();
      if (d.days[ds][el.dataset.k]) {
        FX.burstFrom(t);
        if (dayScore(d.days[ds], MODS) >= 5) FX.toast('🎉 今日 5 项全部完成！');
      }
      /* 重新渲染日历 + 保持当天面板展开 */
      const [y, m] = ds.split('-').map(Number);
      langView(modId, `${y}-${m}`);
      renderDayPanel(modId, ds);
    };
  });
}

/* ══════════ Study 累计秒表番茄钟（全局计时，可暂停/开始）══════════ */
const PomoClock = { timer: null };

function pomoElapsed(p) {
  return p.total + (p.running ? Math.max(0, Math.floor((Date.now() - p.startedAt) / 1000)) : 0);
}
function pomoTodaySec(p) {
  const t = ymd(new Date());
  return (p.daySec[t] || 0) + (p.running ? Math.max(0, Math.floor((Date.now() - p.startedAt) / 1000)) : 0);
}
const fmtHMS = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? (m % 60) + 'm' : ''}` : m + 'm';

function pomoToggle() {
  const p = Store.data().study.pomo;
  if (p.running) {
    const el = Math.max(0, Math.floor((Date.now() - p.startedAt) / 1000));
    p.total += el;
    const t = ymd(new Date());
    p.daySec[t] = (p.daySec[t] || 0) + el;
    p.running = false; p.startedAt = 0;
    FX.toast('⏸ 已暂停，时长已累计');
  } else {
    p.running = true; p.startedAt = Date.now();
    FX.toast('▶ 开始计时');
  }
  Store.save();
}

function bindPomoMini() {
  const paint = () => {
    const clock = document.getElementById('pm-clock');
    if (!clock) { clearInterval(PomoClock.timer); PomoClock.timer = null; return; }
    const p = Store.data().study.pomo;
    clock.textContent = fmtHMS(pomoElapsed(p));
    clock.classList.toggle('running', p.running);
    document.getElementById('pm-sub').textContent = `今日 ${Math.floor(pomoTodaySec(p) / 60)} 分钟`;
    const btn = document.getElementById('pm-toggle');
    btn.textContent = p.running ? '暂停' : (p.total > 0 ? '继续' : '开始');
    btn.classList.toggle('running', p.running);
  };
  document.getElementById('pm-toggle').onclick = () => {
    const btn = document.getElementById('pm-toggle');
    pomoToggle(); paint();
    if (Store.data().study.pomo.running) FX.burstFrom(btn);
  };
  paint();
  clearInterval(PomoClock.timer);
  PomoClock.timer = setInterval(paint, 1000);
}

/* ══════════ Study 自定义学习模块（按学科配置不同打卡项）══════════ */
const DEFAULT_STUDY_PRESETS = {
  law: [
    { k: 'rd', name: '法条阅读', ico: '⚖️' },
    { k: 'pr', name: '案例实操', ico: '📋' },
    { k: 'rv', name: '复习巩固', ico: '🔁' },
    { k: 'nt', name: '笔记整理', ico: '📝' },
    { k: 'qs', name: '错题总结', ico: '❓' }
  ],
  language: [
    { k: 'w', name: '单词', ico: '🔤' },
    { k: 'd', name: '对话', ico: '💬' },
    { k: 's', name: '语句', ico: '✏️' },
    { k: 'r', name: '文章跟读', ico: '📄' },
    { k: 'q', name: '问题总结', ico: '❓' }
  ],
  general: [
    { k: 'rd', name: '阅读学习', ico: '📖' },
    { k: 'pr', name: '练习实操', ico: '✍️' },
    { k: 'rv', name: '复习巩固', ico: '🔁' },
    { k: 'nt', name: '笔记整理', ico: '📝' },
    { k: 'qs', name: '问题总结', ico: '❓' }
  ]
};

function getStudyMods() {
  const d = Store.data().study;
  const preset = d.subjectPreset || 'general';
  return DEFAULT_STUDY_PRESETS[preset] || DEFAULT_STUDY_PRESETS.general;
}

/* 覆盖 dayModsOf 让 study 使用自定义模块 */
const _origDayModsOf = dayModsOf;
/* ══════════ Movie 完整观影记录 ══════════ */
/* 用字符串拼接渲染影片卡片，避免模板字面量嵌套导致的解析歧义 */
function renderMovieCard(m, full) {
  const stars = '★'.repeat(m.rating || 0) + '☆'.repeat(5 - (m.rating || 0));
  const pct = m.progress ? Math.min(100, m.progress) : 0;
  let html = '<div class="t-item glass press" data-id="' + m.id + '">';
  html += '<span class="t-check" data-act="check" style="' + (m.watched ? 'background:linear-gradient(135deg,#F3A183,#D4AF37);color:#1a1408;border-color:transparent' : '') + '">✓</span>';
  html += '<div class="t-title"' + (full ? ' style="display:flex;flex-direction:column;gap:2px"' : '') + '>';
  html += '<span>' + esc(m.title) + '</span>';
  if (full) {
    html += '<span style="font-size:10px;color:var(--txt3)">' + (m.director ? esc(m.director) + ' · ' : '') + (m.country ? esc(m.country) : '') + (m.watchDate ? ' · ' + m.watchDate : '') + '</span>';
    if (pct > 0 && pct < 100) {
      html += '<div class="prog-bar" style="width:120px;height:4px;margin-top:3px;border-radius:2px;background:rgba(255,255,255,0.1)"><div class="prog-fill" style="width:' + pct + '%"></div></div>';
    }
  } else if (m.director) {
    html += ' · ' + esc(m.director);
  }
  html += '</div>';
  html += '<span style="font-size:12px;color:var(--gold);letter-spacing:1px">' + stars + '</span>';
  if (m.ticketImg) html += '<span class="t-badge">🎫</span>';
  if (m.reminder) html += '<span class="t-badge">⏰</span>';
  html += '<button class="t-del" data-act="del">✕</button>';
  html += '<span class="t-arrow">›</span>';
  html += '</div>';
  return html;
}

function movieListView() {
  const mod = modOf('movie'), d = Store.data().movie;
  const movies = d.movies || [];

  $m().innerHTML = pageHead(mod, 'CINEMA LOG') +
    '<div class="tabs">' +
      '<span class="tab active" data-tab="all">全部</span>' +
      '<span class="tab" data-tab="watched">已看</span>' +
      '<span class="tab" data-tab="wishlist">想看</span>' +
    '</div>' +
    '<div class="add-row"><input class="ginput" id="new-movie" placeholder="添加影片名称…" maxlength="60">' +
    '<button class="add-btn press" id="add-movie">添加</button></div>' +
    '<div id="movie-list">' + (movies.length ? movies.map(m => renderMovieCard(m, true)).join('') : '<div class="empty">— 添加第一部影片 —</div>') + '</div>';

  $m().querySelectorAll('.tab').forEach(el => {
    el.onclick = () => {
      $m().querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      filterMovies(el.dataset.tab);
    };
  });

  const filterMovies = tab => {
    const list = document.getElementById('movie-list');
    if (!list) return;
    let filtered = movies;
    if (tab === 'watched') filtered = movies.filter(m => m.watched);
    else if (tab === 'wishlist') filtered = movies.filter(m => !m.watched);
    list.innerHTML = filtered.length ? filtered.map(m => renderMovieCard(m, false)).join('') : '<div class="empty">— 暂无影片 —</div>';
    bindMovieItems();
  };

  const addMovie = () => {
    const inp = document.getElementById('new-movie');
    const v = inp.value.trim(); if (!v) return;
    const m = { id: Store.uid(), title: v, director: '', country: '', watchDate: '', progress: 0, rating: 0, watched: false, ticketImg: '', reminder: '', note: '', images: [] };
    (d.movies || (d.movies = [])).push(m);
    Store.save(); movieListView(); FX.toast('已添加');
  };
  document.getElementById('add-movie').onclick = addMovie;
  document.getElementById('new-movie').onkeydown = e => { if (e.key === 'Enter') addMovie(); };
  bindMovieItems();
}

function bindMovieItems() {
  $m().querySelectorAll('#movie-list .t-item').forEach(el => el.onclick = e => {
    const act = e.target.dataset.act;
    const m = (Store.data().movies || []).find(x => x.id === el.dataset.id);
    if (!m) return;
    if (act === 'check') { m.watched = !m.watched; Store.save(); movieListView(); }
    else if (act === 'del') { Store.data().movies = Store.data().movies.filter(x => x.id !== m.id); Store.save(); movieListView(); }
    else location.hash = '#/movie/m/' + m.id;
  });
}

function movieDetailView(movieId) {
  const mod = modOf('movie'), d = Store.data();
  const movies = d.movie.movies || [];
  const m = movies.find(x => x.id === movieId);
  if (!m) { location.hash = '#/movie'; return; }

  const starsHtml = (sel) => [1,2,3,4,5].map(i =>
    `<span class="star-btn ${m.rating >= i ? 'on' : ''}" data-s="${i}" style="font-size:20px;cursor:pointer;color:${(sel||m.rating)>=i?'var(--gold)':'var(--txt3)'}">★</span>`).join('');

  $m().innerHTML = pageHead(mod, '影 片 详 情') + `
    <span class="back-link" onclick="location.hash='#/movie'">‹ 返回片单</span>
    <div class="glass" style="padding:18px;margin-bottom:14px">
      <input class="ginput" id="mv-title" value="${esc(m.title)}" maxlength="80" style="font-size:18px;font-weight:700;text-align:center;width:100%;box-sizing:border-box">
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px"><div class="sec-label" style="margin-bottom:4px">导演 Director</div><input class="ginput" id="mv-dir" value="${esc(m.director||'')}" placeholder="如：诺兰"></div>
        <div style="flex:1;min-width:140px"><div class="sec-label" style="margin-bottom:4px">国家/地区 Country</div><input class="ginput" id="mv-country" value="${esc(m.country||'')}" placeholder="如：美国"></div>
        <div style="flex:1;min-width:130px"><div class="sec-label" style="margin-bottom:4px">观影日期 Date</div><input class="ginput" id="mv-date" type="date" value="${esc(m.watchDate||'')}"></div>
      </div>
      <div style="margin-top:12px"><div class="sec-label" style="margin-bottom:4px">观看进度 Progress · ${m.progress||0}%</div>
        <input type="range" id="mv-prog" min="0" max="100" value="${m.progress||0}" style="width:100%;accent-color:var(--gold)">
      </div>
      <div style="margin-top:12px"><div class="sec-label" style="margin-bottom:6px">评分 Rating · 点击打分</div>
        <div id="mv-stars" style="display:flex;gap:4px">${starsHtml(m.rating)}</div></div>
    </div>

    <div class="sec-label">🎫 电子票根 Ticket Stub</div>
    <div class="glass" style="padding:14px">
      ${m.ticketImg ? `<div style="margin-bottom:8px;position:relative;display:inline-block"><img src="${m.ticketImg}" alt="票根" style="max-height:160px;border-radius:8px;border:1px solid var(--glass-bd)"><button class="thumb-x" data-act="delticket" style="position:absolute;top:-6px;right:-6px">✕</button></div>` : ''}
      <label class="upload-btn press">📷 上传票根 / 截图<input type="file" id="mv-ticket" accept="image/*" hidden></label>
    </div>

    <div class="sec-label">⏰ 观影提醒 Reminder</div>
    <div class="glass" style="padding:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--txt2)">
        <input type="checkbox" id="mv-rem-on" ${m.reminder ? 'checked' : ''} style="accent-color:var(--gold)"> 启用提醒
      </label>
      <input type="datetime-local" id="mv-rem-time" value="${esc(m.reminder||'')}" placeholder="选择提醒时间" style="flex:1;min-width:160px">
      ${m.reminder ? '<span class="t-badge" style="background:rgba(212,175,55,0.15);color:var(--gold)">⏰ 已设置</span>' : ''}
    </div>

    <div class="sec-label">NOTE · 影评笔记</div>
    <textarea class="note-area" id="mv-note" placeholder="观后感、台词摘录、分析…">${esc(m.note||'')}</textarea>

    <div class="sec-label">IMAGES · 剧照 / 海报</div>
    <div class="thumb-grid">${(m.images||[]).map((src, i) => `
      <span class="thumb-wrap"><img class="thumb" src="${src}" alt="">
      <button class="thumb-x" data-i="${i}">✕</button></span>`).join('')}
      <label class="upload-btn press">＋<input type="file" id="mv-imgs" accept="image/*" multiple hidden></label>
    </div>`;

  /* Auto-save helpers */
  const saveField = (field, val) => { m[field] = val; Store.save(); };
  const q = (id) => document.getElementById(id);

  q('mv-title').oninput = e => saveField('title', e.target.value);
  q('mv-dir').oninput = e => saveField('director', e.target.value);
  q('mv-country').oninput = e => saveField('country', e.target.value);
  q('mv-date').onchange = e => saveField('watchDate', e.target.value);
  q('mv-prog').oninput = e => { saveField('progress', +e.target.value); e.target.previousElementSibling.textContent = `观看进度 Progress · ${e.target.value}%`; };

  /* Star rating */
  $m().querySelectorAll('#mv-stars .star-btn').forEach(el => el.onclick = () => {
    m.rating = +el.dataset.s;
    Store.save(); movieDetailView(movieId);
  });

  /* Ticket upload */
  q('mv-ticket').onchange = e => {
    if (!e.target.files[0]) return;
    Store.resizeImage(e.target.files[0], url => { saveField('ticketImg', url); movieDetailView(movieId); });
  };
  $m().querySelectorAll('[data-act="delticket"]').forEach(b => b.onclick = () => { saveField('ticketImg', ''); movieDetailView(movieId); });

  /* Reminder */
  q('mv-rem-on').onchange = e => {
    if (e.target.checked) { if (!q('mv-rem-time').value) { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(19,0,0); q('mv-rem-time').value = d.toISOString().slice(0,16); } saveField('reminder', q('mv-rem-time').value); }
    else { saveField('reminder', ''); }
    movieDetailView(movieId);
  };
  q('mv-rem-time').onchange = e => { if (q('mv-rem-on').checked) saveField('reminder', e.target.value); };

  /* Note auto-save */
  let noteTimer;
  q('mv-note').oninput = e => { m.note = e.target.value; clearTimeout(noteTimer); noteTimer = setTimeout(() => Store.save(), 500); };

  /* Images */
  q('mv-imgs').onchange = e => {
    [...e.target.files].forEach(f => Store.resizeImage(f, url => { (m.images||(m.images=[])).push(url); Store.save(); movieDetailView(movieId); }));
  };
  $m().querySelectorAll('#main .thumb-x:not([data-act])').forEach(b => b.onclick = () => { m.images.splice(+b.dataset.i, 1); Store.save(); movieDetailView(movieId); });

  /* Check watched toggle */
  const chk = document.querySelector('.back-link + .glass .t-check');
  if (chk) chk.style.cursor = 'pointer';
}

/* ══════════ AI Skill 升级版（对话模板 + Prompt 库）══════════ */
function aiSkillView() {
  const mod = modOf('ai'), d = Store.data().ai;
  const tasks = d.tasks || [];
  const prompts = d.prompts || [];
  const chats = d.chats || [];

  $m().innerHTML = pageHead(mod, 'AI WORKSPACE') + `
    <div class="tabs">
      <span class="tab active" data-tab="tasks">任务列表</span>
      <span class="tab" data-tab="prompts">Prompt 库</span>
      <span class="tab" data-tab="chats">对话记录</span>
      <span class="tab" data-tab="links">网址收藏</span>
    </div>
    <div id="ai-content"></div>`;

  const tabs = { tasks, prompts, chats, links: d.links || [] };
  const renderTab = tab => {
    const c = document.getElementById('ai-content');
    if (tab === 'tasks') {
      c.innerHTML = `<div class="add-row"><input class="ginput" id="new-task" placeholder="新 AI 任务…" maxlength="80"><button class="add-btn press" id="add-task">添加</button></div>` +
        (tasks.length ? tasks.map(t => `<div class="t-item glass press" data-id="${t.id}"><span class="t-check" data-act="check">✓</span><span class="t-title">${esc(t.title)}</span>${t.note ? '<span class="t-badge">📝</span>' : ''}<button class="t-del" data-act="del">✕</button></div>`).join('') : '<div class="empty">— 暂无任务 —</div>');
      const add = () => { const v = document.getElementById('new-task').value.trim(); if (!v) return; tasks.unshift({ id: Store.uid(), title: v, done: false, images: [], note: '', logs: [] }); Store.save(); renderTab('tasks'); };
      document.getElementById('add-task').onclick = add;
      document.getElementById('new-task').onkeydown = e => { if (e.key === 'Enter') add(); };
      bindAiItems('tasks');
    } else if (tab === 'prompts') {
      c.innerHTML = `<div class="add-row"><input class="ginput" id="new-prompt-title" placeholder="Prompt 名称…" maxlength="40" style="flex:0.8"><input class="ginput" id="new-prompt-body" placeholder="输入 Prompt 内容…" maxlength="500" style="flex:1.5"><button class="add-btn press" id="add-prompt">保存</button></div>` +
        (prompts.length ? prompts.map(p => `<div class="link-item glass" data-id="${p.id}"><span class="link-fav">🤖</span><span class="link-body"><span class="link-t">${esc(p.title)}</span><br><span class="link-u" style="color:var(--txt3);font-size:11px">${esc((p.body||'').slice(0,80))}</span></span><button class="t-del" data-act="del">✕</button></div>`).join('') : '<div class="empty">— Prompt 库为空 —</div>');
      const add = () => { const t = document.getElementById('new-prompt-title').value.trim(), b = document.getElementById('new-prompt-body').value.trim(); if (!t) return; prompts.unshift({ id: Store.uid(), title: t, body: b, created: Date.now() }); Store.save(); renderTab('prompts'); FX.toast('Prompt 已保存'); };
      document.getElementById('add-prompt').onclick = add;
      c.querySelectorAll('[data-act=del]').forEach(b => b.onclick = () => { d.prompts = prompts.filter(x => x.id !== b.closest('[data-id]').dataset.id); Store.save(); renderTab('prompts'); });
    } else if (tab === 'chats') {
      c.innerHTML = `<div class="add-row"><input class="ginput" id="new-chat" placeholder="新建对话记录标题…" maxlength="60"><button class="add-btn press" id="add-chat">新建</button></div>` +
        (chats.length ? chats.map(ch => `<div class="note-card glass press" data-id="${ch.id}"><h4>💬 ${esc(ch.title)}</h4><p style="font-size:11px;color:var(--txt3)">${esc((ch.model||''))} · ${new Date(ch.updated||ch.created).toLocaleDateString('zh-CN')}</p><button class="t-del city-del" data-act="del">✕</button></div>`).join('') : '<div class="empty">— 暂无对话记录 —</div>');
      const add = () => { const v = document.getElementById('new-chat').value.trim(); if (!v) return; chats.unshift({ id: Store.uid(), title: v, model: '', messages: [], created: Date.now(), updated: Date.now() }); Store.save(); renderTab('chats'); };
      document.getElementById('add-chat').onclick = add;
      document.getElementById('new-chat').onkeydown = e => { if (e.key === 'Enter') add(); };
      c.querySelectorAll('.note-card').forEach(el => el.onclick = e => { if (e.target.dataset.act === 'del') { d.chats = chats.filter(x => x.id !== el.dataset.id); Store.save(); renderTab('chats'); }});
    } else {
      c.innerHTML = `<div class="add-row"><input class="ginput" id="new-url" placeholder="粘贴网址 https://…"><button class="add-btn press" id="add-url">收藏</button></div>` +
        ((d.links||[]).length ? (d.links||[]).map(l => `<div class="link-item glass" data-id="${l.id}"><span class="link-fav">🔗</span><span class="link-body"><span class="link-t">${esc(l.title)}</span><br><span class="link-u">${esc(l.url)}</span></span><a class="link-go press" href="${esc(l.url)}" target="_blank" rel="noopener">访问 ↗</a><button class="t-del" data-act="dellink">✕</button></div>`).join('') : '<div class="empty">— 暂无收藏 —</div>');
      const add = () => { let v = document.getElementById('new-url').value.trim(); if (!v) return; if (!/^https?:\/\//i.test(v)) v = 'https://' + v; let t = v; try { t = new URL(v).hostname.replace(/^www\./,''); } catch(e){} (d.links||(d.links=[])).unshift({ id: Store.uid(), url:v, title:t }); Store.save(); renderTab('links'); };
      document.getElementById('add-url').onclick = add;
      c.querySelectorAll('[data-act=dellink]').forEach(b => { b.onclick = () => { d.links = (d.links||[]).filter(x => x.id !== b.closest('[data-id]').dataset.id); Store.save(); renderTab('links'); }; });
    }
  };

  $m().querySelectorAll('.tabs .tab').forEach(el => {
    el.onclick = () => {
      $m().querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
      el.classList.add('active'); renderTab(el.dataset.tab);
    };
  });
  renderTab('tasks');

  function bindAiItems(type) {
    $m().querySelectorAll('#ai-content .t-item').forEach(el => el.onclick = e => {
      const act = e.target.dataset.act;
      const t = tasks.find(x => x.id === el.dataset.id);
      if (!t) return;
      if (act === 'check') { t.done = !t.done; Store.save(); el.classList.toggle('done', t.done); if (t.done) FX.burstFrom(e.target); }
      else if (act === 'del') { d.tasks = tasks.filter(x => x.id !== t.id); Store.save(); renderTab('tasks'); }
      else location.hash = '#/ai/t/' + t.id;
    });
  }
}

/* ══════════ Book 升级版（作者/页数/进度/读后感）══════════ */
function bookView() {
  const mod = modOf('book'), d = Store.data().book;
  const books = d.books || [];

  $m().innerHTML = pageHead(mod, 'LIBRARY') + `
    <div class="tabs">
      <span class="tab active" data-tab="reading">在读</span>
      <span class="tab" data-tab="finished">已读完</span>
      <span class="tab" data-tab="wishlist">想读</span>
    </div>
    <div class="add-row"><input class="ginput" id="new-book" placeholder="添加书名…" maxlength="60">
    <button class="add-btn press" id="add-book">添加</button></div>
    <div id="book-list">${books.length ? books.map(b => {
      const pct = b.pageCurrent && b.pageTotal ? Math.round(b.pageCurrent / b.pageTotal * 100) : (b.progress || 0);
      return `<div class="t-item glass press" data-id="${b.id}">
        <span class="t-check" data-act="check" style="${b.finished ? 'background:linear-gradient(135deg,#F3A183,#D4AF37);color:#1a1408;border-color:transparent' : ''}">✓</span>
        <div class="t-title" style="display:flex;flex-direction:column;gap:2px">
          <span>《${esc(b.title)}》</span>
          <span style="font-size:10px;color:var(--txt3)">${b.author ? esc(b.author) : ''}${b.author && b.pageTotal ? ' · ' : ''}${b.pageTotal ? b.pageTotal + '页' : ''}</span>
          ${pct > 0 ? `<div class="prog-bar" style="width:100px;height:4px;margin-top:3px;border-radius:2px;background:rgba(255,255,255,0.1)"><div class="prog-fill" style="width:${Math.min(pct,100)}%"></div><span style="font-size:9px;color:var(--txt3);margin-left:4px">${pct}%</span></div>` : ''}
        </div>
        ${b.review ? '<span class="t-badge">📝</span>' : ''}
        <button class="t-del" data-act="del">✕</button>
        <span class="t-arrow">›</span>
      </div>`;
    }).join('') : '<div class="empty">— 添加第一本书 —</div>'}</div>`;

  const filterBooks = tab => {
    const list = document.getElementById('book-list');
    let f = books;
    if (tab === 'reading') f = books.filter(b => !b.finished && (b.progress || 0) > 0);
    else if (tab === 'finished') f = books.filter(b => b.finished);
    else if (tab === 'wishlist') f = books.filter(b => !b.finished && (!b.progress || b.progress === 0));
    list.innerHTML = f.length ? f.map(b => `<div class="t-item glass press" data-id="${b.id}"><span class="t-check" data-act="check" style="${b.finished ? 'background:linear-gradient(135deg,#F3A183,#D4AF37);color:#1a1408;border-color:transparent' : ''}">✓</span><div class="t-title">《${esc(b.title)}》${b.author ? ' · ' + esc(b.author) : ''}</div><button class="t-del" data-act="del">✕</button><span class="t-arrow">›</span></div>`).join('') : '<div class="empty">— 暂无 —</div>';
    bindBookItems();
  };

  $m().querySelectorAll('.tab').forEach(el => {
    el.onclick = () => {
      $m().querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      el.classList.add('active'); filterBooks(el.dataset.tab);
    };
  });

  const addBook = () => {
    const v = document.getElementById('new-book').value.trim(); if (!v) return;
    books.push({ id: Store.uid(), title: v, author: '', pageTotal: 0, pageCurrent: 0, progress: 0, finished: false, review: '', images: [], startDate: '', finishDate: '' });
    Store.save(); bookView(); FX.toast('已添加');
  };
  document.getElementById('add-book').onclick = addBook;
  document.getElementById('new-book').onkeydown = e => { if (e.key === 'Enter') addBook(); };
  bindBookItems();
}

function bindBookItems() {
  $m().querySelectorAll('#book-list .t-item').forEach(el => el.onclick = e => {
    const act = e.target.dataset.act;
    const b = (Store.data().book.books || []).find(x => x.id === el.dataset.id);
    if (!b) return;
    if (act === 'check') { b.finished = !b.finished; if (b.finished) b.finishDate = new Date().toISOString().slice(0,10); Store.save(); bookView(); }
    else if (act === 'del') { Store.data().book.books = Store.data().book.books.filter(x => x.id !== b.id); Store.save(); bookView(); }
    else bookDetailView(b.id);
  });
}

function bookDetailView(bookId) {
  const mod = modOf('book'), books = Store.data().book.books || [];
  const b = books.find(x => x.id === bookId);
  if (!b) { location.hash = '#/book'; return; }

  $m().innerHTML = pageHead(mod, '读 书 详 情') + `
    <span class="back-link" onclick="location.hash='#/book'">‹ 返回书架</span>
    <div class="glass" style="padding:18px;margin-bottom:14px">
      <input class="ginput" id="bk-title" value="${esc(b.title)}" maxlength="80" style="font-size:17px;font-weight:600;text-align:center;width:100%;box-sizing:border-box">
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px"><div class="sec-label" style="margin-bottom:4px">作者 Author</div><input class="ginput" id="bk-author" value="${esc(b.author||'')}" placeholder="如：刘慈欣"></div>
        <div style="flex:1;min-width:100px"><div class="sec-label" style="margin-bottom:4px">总页数</div><input class="ginput" id="bk-total" type="number" value="${b.pageTotal||''}" placeholder="320" min="0"></div>
        <div style="flex:1;min-width:100px"><div class="sec-label" style="margin-bottom:4px">读到第</div><input class="ginput" id="bk-current" type="number" value="${b.pageCurrent||''}" placeholder="0" min="0"></div>
      </div>
      <div style="margin-top:10px"><div class="sec-label" style="margin-bottom:4px">阅读进度 · ${b.pageCurrent&&b.pageTotal?Math.round(b.pageCurrent/b.pageTotal*100):(b.progress||0)}%</div>
        <input type="range" id="bk-prog" min="0" max="100" value="${b.pageCurrent&&b.pageTotal?Math.round(b.pageCurrent/b.pageTotal*100):(b.progress||0)}" style="width:100%;accent-color:var(--gold)"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px">
        <div style="flex:1"><div class="sec-label" style="margin-bottom:4px">开始日期</div><input class="ginput" id="bk-start" type="date" value="${esc(b.startDate||'')}"></div>
        <div style="flex:1"><div class="sec-label" style="margin-bottom:4px">完成日期</div><input class="ginput" id="bk-finish" type="date" value="${esc(b.finishDate||'')}"></div>
      </div>
    </div>
    <div class="sec-label">📝 读后感 Review</div>
    <textarea class="note-area" id="bk-review" style="min-height:120px" placeholder="读后感、摘录、思考…">${esc(b.review||'')}</textarea>
    <div class="sec-label">IMAGES · 封面 / 内页</div>
    <div class="thumb-grid">${(b.images||[]).map((src,i) => `<span class="thumb-wrap"><img class="thumb" src="${src}" alt=""><button class="thumb-x" data-i="${i}">✕</button></span>`).join('')}
      <label class="upload-btn press">＋<input type="file" id="bk-imgs" accept="image/*" multiple hidden></label>
    </div>`;

  const q = id => document.getElementById(id);
  const sv = (f,v) => { b[f]=v; Store.save(); };
  q('bk-title').oninput = e => sv('title', e.target.value);
  q('bk-author').oninput = e => sv('author', e.target.value);
  q('bk-total').oninput = e => { sv('pageTotal',+e.target.value||0); updateProg(); };
  q('bk-current').oninput = e => { sv('pageCurrent',+e.target.value||0); updateProg(); };
  const updateProg = () => { if (b.pageTotal) { b.progress = Math.round(b.pageCurrent/b.pageTotal*100); q('bk-prog').value=b.progress; } };
  q('bk-prog').oninput = e => { sv('progress',+e.target.value); if (b.pageTotal) { sv('pageCurrent', Math.round(b.progress*b.pageTotal/100)); q('bk-current').value=b.pageCurrent; } };
  q('bk-start').onchange = e => sv('startDate', e.target.value);
  q('bk-finish').onchange = e => sv('finishDate', e.target.value);
  let rt; q('bk-review').oninput = e => { b.review=e.target.value; clearTimeout(rt); rt=setTimeout(()=>Store.save(),500); };
  q('bk-imgs').onchange = e => { [...e.target.files].forEach(f=>Store.resizeImage(f,url=>{(b.images||(b.images=[])).push(url);Store.save();bookDetailView(bookId);})); };
  $m().querySelectorAll('#main .thumb-x').forEach(x=>x.onclick=()=>{b.images.splice(+x.dataset.i,1);Store.save();bookDetailView(bookId);});
}

/* ══════════ Private Info 升级版（分类标签 + 敏感度）══════════ */
function privateView() {
  const mod = modOf('private'), d = Store.data().private;
  const items = d.items || [];

  const CATS = ['账号密码', '证件信息', '金融资产', '地址信息', '其他'];
  const SENS = ['普通', '敏感', '机密'];

  $m().innerHTML = pageHead(mod, 'KEEP IT SECRET') + `
    <div class="tabs">
      <span class="tab active" data-tab="all">全部</span>
      ${CATS.map(c => `<span class="tab" data-tab="${c}">${c}</span>`).join('')}
    </div>
    <div class="add-row">
      <select class="ginput" id="pv-cat" style="width:auto;min-width:90px;padding:8px">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
      <select class="ginput" id="pv-sens" style="width:auto;min-width:70px;padding:8px">${SENS.map(s=>`<option>${s}</option>`).join('')}</select>
      <input class="ginput" id="pv-new" placeholder="新条目内容…" maxlength="100" style="flex:1">
      <button class="add-btn press" id="pv-add">添加</button>
    </div>
    <div id="pv-list">${items.length ? items.map(it => {
      const catCls = it.cat || '';
      const sensClr = it.sens === '机密' ? '#e08f8f' : it.sens === '敏感' ? '#D4AF37' : 'var(--txt3)';
      return `<div class="t-item glass press" data-id="${it.id}">
        <span class="t-check" data-act="check">✓</span>
        <span class="t-title">${esc(it.title)}</span>
        ${it.cat ? `<span class="cat-chip" style="font-size:9px;background:rgba(212,175,55,0.12);color:var(--gold)">${esc(it.cat)}</span>` : ''}
        <span style="font-size:9px;color:${sensClr};border:1px solid ${sensClr}33;border-radius:4px;padding:0 4px">${esc(it.sens||'普通')}</span>
        <button class="t-del" data-act="del">✕</button>
      </div>`;
    }).join('') : '<div class="empty">— 暂无条目 —</div>'}</div>`;

  const filter = tab => {
    const list = document.getElementById('pv-list');
    const f = tab === 'all' ? items : items.filter(x => (x.cat||'') === tab);
    list.innerHTML = f.length ? f.map(it => `<div class="t-item glass press" data-id="${it.id}"><span class="t-check" data-act="check">✓</span><span class="t-title">${esc(it.title)}</span>${it.cat ? `<span class="cat-chip" style="font-size:9px;background:rgba(212,175,55,0.12);color:var(--gold)">${esc(it.cat)}</span>` : ''}<button class="t-del" data-act="del">✕</button></div>`).join('') : '<div class="empty">— 暂无 —</div>';
    bindPvItems();
  };

  $m().querySelectorAll('.tabs .tab').forEach(el => {
    el.onclick = () => {
      $m().querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
      el.classList.add('active'); filter(el.dataset.tab);
    };
  });

  const add = () => {
    const v = document.getElementById('pv-new').value.trim(); if (!v) return;
    items.push({ id: Store.uid(), title: v, cat: document.getElementById('pv-cat').value, sens: document.getElementById('pv-sens').value, done: false });
    Store.save(); privateView(); FX.toast('已添加');
  };
  document.getElementById('pv-add').onclick = add;
  document.getElementById('pv-new').onkeydown = e => { if (e.key === 'Enter') add(); };
  bindPvItems();
}

function bindPvItems() {
  $m().querySelectorAll('#pv-list .t-item').forEach(el => el.onclick = e => {
    const act = e.target.dataset.act;
    const it = (Store.data().private.items || []).find(x => x.id === el.dataset.id);
    if (!it) return;
    if (act === 'check') { it.done = !it.done; Store.save(); el.classList.toggle('done', it.done); }
    else if (act === 'del') { Store.data().private.items = (Store.data().private.items||[]).filter(x => x.id !== it.id); Store.save(); privateView(); }
  });
}
