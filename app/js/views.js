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

/* ══════════ 待办类模块（private/ai/movie/book）══════════ */
const TODO_SUBS = { private: 'KEEP IT SECRET', ai: 'LEVEL UP', movie: 'WATCH LIST', book: 'READING LIST' };

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
const dayModsOf = modId => modId === 'study' ? STUDY_MODS : LANG_MODS;
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

  /* Study 专属：累计秒表番茄钟卡片 */
  const pomoCard = modId === 'study' ? `
    <div class="glass pomo-mini" id="pomo-card">
      <div class="pm-left">
        <div class="pm-label">🍅 POMODORO · 累计学习时钟</div>
        <div class="pm-clock" id="pm-clock">00:00:00</div>
        <div class="pm-sub" id="pm-sub">今日 0 分钟</div>
      </div>
      <button class="pm-btn press" id="pm-toggle">开始</button>
    </div>` : '';

  $m().innerHTML = pageHead(mod, 'DAILY CHECK-IN') + pomoCard + `
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
  if (modId === 'study') bindPomoMini();
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
