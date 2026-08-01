/* ═══════ VINTAGE Views 2：Job / EUR / Notes / Home / Pulse / Profile ═══════ */
'use strict';

/* ══════════ Job Content · 四象限 ══════════ */
const QUADS = [
  { k: 'todo',    name: '待完成工作',  color: '#8fb4e8' },
  { k: 'done',    name: '完成了什么',  color: '#8fd49a' },
  { k: 'block',   name: '问题与阻碍',  color: '#e08f8f' },
  { k: 'improve', name: '下周改进',    color: '#D4AF37' }
];
function jobView() {
  const mod = modOf('job'), d = Store.data().job;
  $m().innerHTML = pageHead(mod, 'WEEKLY REVIEW') + `
    <div class="quad-grid">${QUADS.map(q => `
      <div class="quad glass" data-q="${q.k}">
        <h4><span class="dot" style="background:${q.color}"></span>${q.name}
          <span style="margin-left:auto;font-size:10px;color:var(--txt3)">${d[q.k].length}</span></h4>
        <div class="q-list">${d[q.k].map(it => `
          <div class="q-item ${it.done ? 'done' : ''}" data-id="${it.id}">
            <span class="t-check" data-act="check">✓</span>
            <span>${esc(it.text)}</span>
            <button class="t-del" data-act="del">✕</button>
          </div>`).join('') || '<div class="empty" style="padding:12px">—</div>'}</div>
        <div class="q-add"><input placeholder="添加…" maxlength="80"><button class="press">＋</button></div>
      </div>`).join('')}
    </div>`;

  $m().querySelectorAll('.quad').forEach(qEl => {
    const key = qEl.dataset.q;
    const inp = qEl.querySelector('.q-add input');
    const add = () => {
      const v = inp.value.trim(); if (!v) return;
      d[key].push({ id: Store.uid(), text: v, done: false });
      Store.save(); jobView();
    };
    qEl.querySelector('.q-add button').onclick = add;
    inp.onkeydown = e => { if (e.key === 'Enter') add(); };
    qEl.querySelectorAll('.q-item').forEach(el => el.onclick = e => {
      const it = d[key].find(x => x.id === el.dataset.id);
      if (e.target.dataset.act === 'del') {
        d[key] = d[key].filter(x => x.id !== it.id); Store.save(); jobView();
      } else if (e.target.dataset.act === 'check') {
        it.done = !it.done; Store.save();
        el.classList.toggle('done', it.done);
        if (it.done) FX.burstFrom(e.target);
      }
    });
  });
}

/* ══════════ EUR trvl ══════════ */
function eurView(tab) {
  const mod = modOf('eur'), d = Store.data().eur;
  tab = tab || 'plan';
  let body = '';
  if (tab === 'plan') {
    body = `<div class="add-row"><input class="ginput" id="new-city" placeholder="添加城市，如 LONDON…" maxlength="30">
      <button class="add-btn press" id="add-city">添加</button></div>
      <div class="city-grid">${d.cities.map(c => {
        const all = c.days.flatMap(x => x.items);
        const pct = all.length ? Math.round(all.filter(i => i.done).length / all.length * 100) : 0;
        return `<div class="city-card glass press" data-id="${c.id}">
          <button class="t-del city-del" data-act="del">✕</button>
          <div class="city-name">${esc(c.name)}</div>
          <div class="city-sub">${c.days.length} 天行程 · ${all.length} 项</div>
          <div style="margin-top:10px">${FX.ring(pct, 38)}</div>
        </div>`;
      }).join('') || '<div class="empty">— 添加第一个目的地城市 —</div>'}</div>`;
  } else if (tab === 'map') {
    body = `<div class="map-box glass" id="map-holder">
        <div class="map-fallback" id="map-fb">
          <div style="font-size:30px">🗺️</div>
          <div style="font-size:12px;color:var(--txt2);line-height:1.8">
            内嵌地图需要一个免费的高德 Web Key（30 秒申请）<br>
            填入后地图直接嵌在此处，可缩放 / 拖动 / 查看点位
          </div>
          <div class="add-row" style="width:min(360px,90%)">
            <input class="ginput" id="amap-key" placeholder="粘贴高德 JS API Key" value="${esc(d.amapKey)}">
            <button class="add-btn press" id="save-key">加载</button>
          </div>
          <a class="link-go press" href="https://ditu.amap.com/" target="_blank" rel="noopener">先在高德地图网页版打开 ↗</a>
        </div>
        <div id="amap-container" class="hidden"></div>
      </div>
      <div class="sec-label" style="margin-top:14px">快捷导航（跳转高德）</div>
      <div style="display:flex;gap:9px;flex-wrap:wrap">${d.cities.map(c =>
        `<a class="link-go press" target="_blank" rel="noopener"
          href="https://ditu.amap.com/search?query=${encodeURIComponent(c.name)}">${esc(c.name)} ↗</a>`).join('') || '<span class="empty" style="padding:6px">先在「计划」里添加城市</span>'}</div>`;
  } else {
    const done = d.luggage.filter(x => x.done).length;
    const pct = d.luggage.length ? Math.round(done / d.luggage.length * 100) : 0;
    body = `<div class="prog-wrap">
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
        <div class="prog-txt"><span>整备进度</span><span>${done}/${d.luggage.length} · ${pct}%</span></div>
      </div>
      <div class="add-row"><input class="ginput" id="new-lug" placeholder="添加行李条目…" maxlength="60">
      <button class="add-btn press" id="add-lug">添加</button></div>` +
      d.luggage.map(it => `
        <div class="t-item glass ${it.done ? 'done' : ''}" data-id="${it.id}">
          <span class="t-check" data-act="check">✓</span>
          <span class="t-title">${esc(it.text)}</span>
          <button class="t-del" data-act="del">✕</button>
        </div>`).join('');
  }
  $m().innerHTML = pageHead(mod, 'EUROPE JOURNEY') + `
    <div class="tabs">
      <span class="tab ${tab === 'plan' ? 'active' : ''}" data-tab="plan">计划</span>
      <span class="tab ${tab === 'map' ? 'active' : ''}" data-tab="map">地图</span>
      <span class="tab ${tab === 'lug' ? 'active' : ''}" data-tab="lug">行李清单</span>
    </div>` + body;

  $m().querySelectorAll('.tab').forEach(el => el.onclick = () => eurView(el.dataset.tab));

  if (tab === 'plan') {
    const add = () => {
      const inp = document.getElementById('new-city');
      const v = inp.value.trim().toUpperCase(); if (!v) return;
      d.cities.push({ id: Store.uid(), name: v, days: [] });
      Store.save(); eurView('plan');
    };
    document.getElementById('add-city').onclick = add;
    document.getElementById('new-city').onkeydown = e => { if (e.key === 'Enter') add(); };
    $m().querySelectorAll('.city-card').forEach(el => el.onclick = e => {
      if (e.target.dataset.act === 'del') {
        d.cities = d.cities.filter(x => x.id !== el.dataset.id); Store.save(); eurView('plan'); return;
      }
      location.hash = '#/eur/c/' + el.dataset.id;
    });
  } else if (tab === 'map') {
    document.getElementById('save-key').onclick = () => {
      d.amapKey = document.getElementById('amap-key').value.trim();
      Store.save(); loadAmap(d);
    };
    if (d.amapKey) loadAmap(d);
  } else {
    const add = () => {
      const inp = document.getElementById('new-lug');
      const v = inp.value.trim(); if (!v) return;
      d.luggage.push({ id: Store.uid(), text: v, done: false });
      Store.save(); eurView('lug');
    };
    document.getElementById('add-lug').onclick = add;
    document.getElementById('new-lug').onkeydown = e => { if (e.key === 'Enter') add(); };
    $m().querySelectorAll('.t-item').forEach(el => el.onclick = e => {
      const it = d.luggage.find(x => x.id === el.dataset.id);
      if (e.target.dataset.act === 'del') {
        d.luggage = d.luggage.filter(x => x.id !== it.id); Store.save(); eurView('lug');
      } else if (e.target.dataset.act === 'check') {
        it.done = !it.done; Store.save();
        if (it.done) FX.burstFrom(e.target);
        eurView('lug');
      }
    });
  }
}

function loadAmap(d) {
  if (!d.amapKey) return;
  const show = () => {
    document.getElementById('map-fb').classList.add('hidden');
    const box = document.getElementById('amap-container');
    box.classList.remove('hidden');
    try {
      new AMap.Map('amap-container', { zoom: 4, center: [8.5, 47.5], mapStyle: 'amap://styles/dark' });
    } catch (e) { FX.toast('地图初始化失败，请检查 Key'); }
  };
  if (window.AMap) return show();
  const s = document.createElement('script');
  s.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(d.amapKey)}`;
  s.onload = show;
  s.onerror = () => FX.toast('Key 无效或网络异常');
  document.head.appendChild(s);
}

/* ── 城市详情：每日行程节点 ── */
const CATS = ['交通', '住宿', '景点', '餐饮', '其他'];
function cityView(cityId) {
  const mod = modOf('eur'), d = Store.data().eur;
  const c = d.cities.find(x => x.id === cityId);
  if (!c) { location.hash = '#/eur'; return; }
  $m().innerHTML = pageHead(mod, esc(c.name) + ' · 行程') + `
    <span class="back-link" onclick="location.hash='#/eur'">‹ 返回城市列表</span>
    <div class="add-row"><input class="ginput" id="new-day" placeholder="添加行程日，如 DAY 2 · 卢浮宫一日" maxlength="40">
    <button class="add-btn press" id="add-day">添加</button></div>
    ${c.days.map(day => `
      <div class="day-block glass" data-day="${day.id}">
        <h4>${esc(day.title)} <button class="t-del" data-act="delday" style="float:right">✕</button></h4>
        ${day.items.map(it => `
          <div class="q-item ${it.done ? 'done' : ''}" data-id="${it.id}">
            <span class="t-check" data-act="check">✓</span>
            <span>${esc(it.text)}</span>
            <span class="cat-chip cat-${it.cat}">${it.cat}</span>
            <button class="t-del" data-act="del">✕</button>
          </div>`).join('')}
        <div class="q-add">
          <input placeholder="添加事项…" maxlength="60">
          <select class="ginput" style="width:78px;margin:0;padding:8px 6px;font-size:11px">
            ${CATS.map(x => `<option>${x}</option>`).join('')}
          </select>
          <button class="press">＋</button>
        </div>
      </div>`).join('') || '<div class="empty">— 添加第一天行程 —</div>'}`;

  const addDay = () => {
    const inp = document.getElementById('new-day');
    const v = inp.value.trim(); if (!v) return;
    c.days.push({ id: Store.uid(), title: v, items: [] });
    Store.save(); cityView(cityId);
  };
  document.getElementById('add-day').onclick = addDay;
  document.getElementById('new-day').onkeydown = e => { if (e.key === 'Enter') addDay(); };

  $m().querySelectorAll('.day-block').forEach(block => {
    const day = c.days.find(x => x.id === block.dataset.day);
    block.querySelector('[data-act="delday"]').onclick = () => {
      c.days = c.days.filter(x => x.id !== day.id); Store.save(); cityView(cityId);
    };
    const inp = block.querySelector('.q-add input');
    const sel = block.querySelector('.q-add select');
    const add = () => {
      const v = inp.value.trim(); if (!v) return;
      day.items.push({ id: Store.uid(), text: v, cat: sel.value, done: false });
      Store.save(); cityView(cityId);
    };
    block.querySelector('.q-add button').onclick = add;
    inp.onkeydown = e => { if (e.key === 'Enter') add(); };
    block.querySelectorAll('.q-item').forEach(el => el.onclick = e => {
      const it = day.items.find(x => x.id === el.dataset.id);
      if (e.target.dataset.act === 'del') {
        day.items = day.items.filter(x => x.id !== it.id); Store.save(); cityView(cityId);
      } else if (e.target.dataset.act === 'check') {
        it.done = !it.done; Store.save();
        el.classList.toggle('done', it.done);
        if (it.done) FX.burstFrom(e.target);
      }
    });
  });
}

/* ══════════ 時政及金融筆記匯總 ══════════ */
function notesView() {
  const mod = modOf('notes'), notes = Store.data().notes;
  $m().innerHTML = pageHead(mod, 'NOTES DIGEST') + `
    <div class="add-row"><input class="ginput" id="new-note" placeholder="新笔记标题…" maxlength="60">
    <button class="add-btn press" id="add-note">新增笔记</button></div>
    <div class="note-list">${notes.slice().sort((a, b) => b.updated - a.updated).map(n => `
      <div class="note-card glass press" data-id="${n.id}">
        <button class="t-del city-del" data-act="del">✕</button>
        <h4>📝 ${esc(n.title)}</h4>
        <p>${esc((n.text || '').slice(0, 80))}</p>
        <div class="n-date">${new Date(n.updated).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          ${n.images.length ? ' · 🖼×' + n.images.length : ''}${n.doodle ? ' · ✍涂鸦' : ''}</div>
      </div>`).join('') || '<div class="empty">— 新增第一条笔记 —</div>'}</div>`;

  const add = () => {
    const inp = document.getElementById('new-note');
    const v = inp.value.trim(); if (!v) return;
    const n = { id: Store.uid(), title: v, text: '', images: [], doodle: '', updated: Date.now() };
    Store.data().notes.unshift(n); Store.save();
    location.hash = '#/notes/n/' + n.id;
  };
  document.getElementById('add-note').onclick = add;
  document.getElementById('new-note').onkeydown = e => { if (e.key === 'Enter') add(); };
  $m().querySelectorAll('.note-card').forEach(el => el.onclick = e => {
    if (e.target.dataset.act === 'del') {
      const d = Store.data();
      d.notes = d.notes.filter(x => x.id !== el.dataset.id); Store.save(); notesView(); return;
    }
    location.hash = '#/notes/n/' + el.dataset.id;
  });
}

function noteDetailView(noteId) {
  const mod = modOf('notes');
  const n = Store.data().notes.find(x => x.id === noteId);
  if (!n) { location.hash = '#/notes'; return; }
  $m().innerHTML = pageHead(mod, '备忘录') + `
    <span class="back-link" onclick="location.hash='#/notes'">‹ 返回笔记清单</span>
    <input class="ginput" id="n-title" value="${esc(n.title)}" maxlength="60" style="font-size:16px;font-weight:600">
    <textarea class="note-area" id="n-text" style="min-height:150px" placeholder="正文内容…">${esc(n.text)}</textarea>
    <div class="sec-label">IMAGES · 插图</div>
    <div class="thumb-grid">${n.images.map((src, i) => `
      <span class="thumb-wrap"><img class="thumb" src="${src}" alt=""><button class="thumb-x" data-i="${i}">✕</button></span>`).join('')}
      <label class="upload-btn press">＋<input type="file" id="n-img" accept="image/*" multiple hidden></label>
    </div>
    <div class="sec-label">DOODLE · 涂鸦</div>
    <div class="doodle-tools">
      ${['#D4AF37', '#E8E8F0', '#7FA8E8', '#E08F8F'].map((c, i) =>
        `<span class="d-color ${i === 0 ? 'active' : ''}" data-c="${c}" style="background:${c}"></span>`).join('')}
      <button class="d-btn press" id="d-clear">清空</button>
      <span style="font-size:10px;color:var(--txt3)">笔迹自动保存</span>
    </div>
    <canvas id="doodle-canvas"></canvas>`;

  let saveTimer;
  const touch = () => { n.updated = Date.now(); clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.save(), 500); };
  document.getElementById('n-title').oninput = e => { n.title = e.target.value; touch(); };
  document.getElementById('n-text').oninput = e => { n.text = e.target.value; touch(); };
  document.getElementById('n-img').onchange = e => {
    [...e.target.files].forEach(f => Store.resizeImage(f, url => {
      n.images.push(url); n.updated = Date.now(); Store.save(); noteDetailView(noteId);
    }));
  };
  $m().querySelectorAll('.thumb-x').forEach(b => b.onclick = () => {
    n.images.splice(+b.dataset.i, 1); Store.save(); noteDetailView(noteId);
  });

  /* 涂鸦画布 */
  const cv = document.getElementById('doodle-canvas');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const rect = cv.getBoundingClientRect();
  cv.width = rect.width * dpr; cv.height = 260 * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4;
  let color = '#D4AF37', drawing = false;
  if (n.doodle) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, rect.width, 260); im.src = n.doodle; }
  const pos = e => {
    const r = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return [p.clientX - r.left, p.clientY - r.top];
  };
  const down = e => { drawing = true; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(...pos(e)); e.preventDefault(); };
  const move = e => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); e.preventDefault(); };
  const up = () => { if (!drawing) return; drawing = false; n.doodle = cv.toDataURL('image/png'); touch(); };
  cv.onmousedown = down; cv.onmousemove = move; addEventListener('mouseup', up);
  cv.ontouchstart = down; cv.ontouchmove = move; cv.ontouchend = up;
  $m().querySelectorAll('.d-color').forEach(el => el.onclick = () => {
    $m().querySelectorAll('.d-color').forEach(x => x.classList.remove('active'));
    el.classList.add('active'); color = el.dataset.c;
  });
  document.getElementById('d-clear').onclick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height); n.doodle = ''; touch();
  };
}

/* ══════════ 用户显示工具 ══════════ */
function accDisplayName(acc) {
  if (!acc) return '旅行者';
  return acc.name || acc.email.split('@')[0];
}
function accAvatarHtml(acc, size) {
  size = size || 60;
  const fs = Math.round(size * 0.42);
  if (acc && acc.avatar && acc.avatar.startsWith('data:'))
    return `<img src="${acc.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,175,55,0.4)" alt="">`;
  const emo = (acc && acc.avatar) || '🪐';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--gold-grad);display:flex;align-items:center;justify-content:center;font-size:${fs}px;color:#1a1408">${esc(emo)}</div>`;
}

/* ══════════ Home 总览 ══════════ */
function homeView() {
  const d = Store.data();
  const todoMods = ['private', 'ai', 'movie', 'book'];
  const openTasks = todoMods.reduce((s, k) => s + d[k].tasks.filter(t => !t.done).length, 0);
  const focusToday = Math.floor(pomoTodaySec(d.study.pomo) / 60);
  /* 本周打卡（kr / us / study） */
  const now = new Date(); const dow = (now.getDay() + 6) % 7;
  let weekChecks = 0;
  for (let i = 0; i <= dow; i++) {
    const dt = new Date(now); dt.setDate(now.getDate() - dow + i);
    const ds = ymd(dt);
    if (dayScore(d.kr.days[ds])) weekChecks++;
    if (dayScore(d.us.days[ds])) weekChecks++;
    if (dayScore(d.study.days[ds], STUDY_MODS)) weekChecks++;
  }
  const weekPct = Math.round(weekChecks / ((dow + 1) * 3) * 100) || 0;

  const acc = Store.current();
  const hour = now.getHours();
  const greet = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const today = ymd(now);

  $m().innerHTML = `
    <div style="text-align:center;margin-bottom:4px">
      <div class="brand-script">Vintage</div>
      <div class="starport">TO DO LIST · ${now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
    </div>
    <div class="arc-line"></div>
    <div style="font-size:13px;color:var(--txt2);margin-bottom:6px">${greet}，${esc(accDisplayName(acc))} 🪐</div>
    <div class="stats-row">
      <div class="stat-card glass z-top"><span class="stat-label">Today Tasks</span>
        <span class="stat-value"><span id="st-1">0</span><small> 项待办</small></span>${FX.ring(Math.min(100, openTasks * 8))}</div>
      <div class="stat-card glass z-mid"><span class="stat-label">Focus Time</span>
        <span class="stat-value"><span id="st-2">0</span><small> min 今日</small></span>${FX.ring(Math.min(100, focusToday / 1.2))}</div>
      <div class="stat-card glass z-mid"><span class="stat-label">Week Check-in</span>
        <span class="stat-value"><span id="st-3">0</span><small> %</small></span>${FX.ring(weekPct)}</div>
    </div>
    <div class="sec-label">MODULES · 全部模块</div>
    <div class="mod-grid">${MODULES.map(m => {
      let cnt = '';
      if (['private', 'ai', 'movie', 'book'].includes(m.id)) cnt = d[m.id].tasks.filter(t => !t.done).length + ' 待办';
      else if (m.id === 'study') cnt = (dayScore(d.study.days[today], STUDY_MODS) || 0) + '/5 今日';
      else if (m.id === 'job') cnt = d.job.todo.filter(x => !x.done).length + ' 待完成';
      else if (m.id === 'eur') cnt = d.eur.cities.length + ' 城市';
      else if (m.id === 'kr' || m.id === 'us') cnt = (dayScore(d[m.id].days[today]) || 0) + '/5 今日';
      else if (m.id === 'notes') cnt = d.notes.length + ' 篇';
      const c = modCustom(m.id);
      const ico = c.icon ? esc(c.icon) : (m.flag ? `<span class="flag flag-${m.flag}"></span>` : m.icon);
      return `<div class="mod-card glass press" data-go="${m.id}">
        <span class="mc-ico">${ico}</span>
        <span class="mc-name">${esc(modLabel(m))}</span><span class="mc-cnt">${cnt}</span></div>`;
    }).join('')}</div>`;

  FX.countUp(document.getElementById('st-1'), openTasks);
  FX.countUp(document.getElementById('st-2'), focusToday);
  FX.countUp(document.getElementById('st-3'), weekPct);
  $m().querySelectorAll('.mod-card').forEach(el => el.onclick = () => location.hash = '#/' + el.dataset.go);
}

/* ══════════ ORBIT（手机模块页）/ PULSE（打卡速览）══════════ */
function modulesView() {
  $m().innerHTML = `<div class="page-head"><span class="page-title">ORBIT</span><span class="page-sub">All Modules</span></div>
    <div class="arc-line"></div>
    <div class="mod-grid">${MODULES.map(m => {
      const c = modCustom(m.id);
      const ico = c.icon ? esc(c.icon) : (m.flag ? `<span class="flag flag-${m.flag}"></span>` : m.icon);
      return `<div class="mod-card glass press" data-go="${m.id}">
        <span class="mc-ico">${ico}</span>
        <span class="mc-name">${esc(modLabel(m))}</span></div>`;
    }).join('')}</div>`;
  $m().querySelectorAll('.mod-card').forEach(el => el.onclick = () => location.hash = '#/' + el.dataset.go);
}

function pulseView() {
  const d = Store.data(); const today = ymd(new Date());
  const block = (id, name, mods) => {
    const sc = dayScore(d[id].days[today], mods);
    return `<div class="t-item glass press" data-go="${id}">
      ${id === 'study' ? '<span class="menu-icon">🎓</span>' : `<span class="flag flag-${id}"></span>`}
      <span class="t-title">${name} · 今日打卡</span>
      <span class="t-badge" style="${sc >= 5 ? 'color:var(--gold);border-color:rgba(212,175,55,0.4)' : ''}">${sc}/5</span>
      <span class="t-arrow">›</span></div>`;
  };
  const p = d.study.pomo;
  $m().innerHTML = `<div class="page-head"><span class="page-title">PULSE</span><span class="page-sub">Daily Rhythm</span></div>
    <div class="arc-line"></div>
    <div class="sec-label">DAILY CHECK-IN</div>
    ${block('study', 'Study Project', STUDY_MODS)}${block('kr', 'Korea Language')}${block('us', 'USA Language')}
    <div class="sec-label">POMODORO · 累计 ${fmtHMS(pomoElapsed(p))}</div>
    <div class="t-item glass press" data-go="study">
      <span class="menu-icon">🍅</span><span class="t-title">${p.running ? '计时进行中…' : '进入 Study Project 继续计时'}</span><span class="t-arrow">›</span></div>`;
  $m().querySelectorAll('[data-go]').forEach(el => el.onclick = () => location.hash = '#/' + el.dataset.go);
}

/* ══════════ Profile / RING ══════════ */
function profileView() {
  const acc = Store.current();
  if (!acc) return;
  const idIsPhone = /^\d{7,15}$/.test(acc.email);
  $m().innerHTML = `<div class="page-head"><span class="page-title">RING</span><span class="page-sub">Account & Sync</span></div>
    <div class="arc-line"></div>

    <div class="glass" style="padding:22px;text-align:center;margin-bottom:14px">
      <div style="display:inline-block;position:relative;cursor:pointer" id="pf-ava" title="点击更换头像">
        ${accAvatarHtml(acc, 64)}
        <span style="position:absolute;right:-4px;bottom:-2px;font-size:13px;background:rgba(20,26,40,0.9);border:1px solid rgba(212,175,55,0.4);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center">✎</span>
      </div>
      <div id="ava-panel" class="hidden" style="margin:12px 0 4px">
        <div style="font-size:11px;color:var(--txt3);margin-bottom:8px">选一个 emoji，或上传图片</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px">
          ${['🪐', '🌙', '⭐', '🚀', '🛸', '🌍', '☄️', '👩‍🚀', '👨‍🚀', '🦊', '🐱', '🌸'].map(e =>
            `<span class="ava-emo press" data-e="${e}" style="font-size:20px;cursor:pointer;padding:4px 6px;border-radius:10px;border:1px solid var(--glass-bd)">${e}</span>`).join('')}
        </div>
        <label class="d-btn press" style="padding:8px 16px;font-size:11px">上传图片<input type="file" id="ava-file" accept="image/*" hidden></label>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;justify-content:center">
        <input class="ginput" id="pf-name" value="${esc(acc.name || '')}" placeholder="设置昵称…" maxlength="20"
          style="width:180px;margin:0;text-align:center;font-size:14px;font-weight:600">
        <button class="add-btn press" id="pf-save-name" style="padding:9px 16px">保存</button>
      </div>
      <div style="font-size:10.5px;color:var(--txt3);margin-top:10px">STARPORT MEMBER · ${new Date(acc.created).toLocaleDateString('zh-CN')} 加入</div>

      <div style="margin-top:14px">
        <span class="l-link" id="pf-detail-toggle" style="font-size:11px">查看账号详情 ▾</span>
        <div id="pf-detail" class="hidden" style="margin-top:10px;padding:12px;border:1px dashed rgba(255,255,255,0.14);border-radius:12px;font-size:12px;color:var(--txt2);text-align:left">
          <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--txt3)">${idIsPhone ? '手机号' : '邮箱'}</span><span>${esc(acc.email)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--txt3)">账号 ID</span><span style="font-size:10px">${esc(acc.id)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--txt3)">注册时间</span><span>${new Date(acc.created).toLocaleString('zh-CN')}</span></div>
        </div>
      </div>
    </div>

    <div class="sec-label">DATA SYNC · 跨设备同步</div>
    <div class="glass" style="padding:18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        ${(() => {
          const st = (typeof Sync !== 'undefined') ? Sync.status() : 'local';
          const dot = st === 'cloud' ? '#8fd49a' : st === 'offline' ? '#e08f8f' : '#9aa3b2';
          const txt = st === 'cloud' ? '云端同步：已连接' : st === 'offline' ? '云端同步：离线（将自动重试）' : '本机模式：未连接云端';
          return `<span id="sync-dot" style="width:9px;height:9px;border-radius:50%;background:${dot}"></span><span id="sync-txt" style="font-size:12px;color:var(--txt2)">${txt}</span>`;
        })()}
      </div>
      <div style="font-size:11.5px;color:var(--txt3);line-height:1.7;margin-bottom:12px">
        ${(typeof Sync !== 'undefined' && Sync.enabled())
          ? '已连接云端：用同一账号在手机/电脑登录，数据自动同步。修改后点「立即同步」即时上传。'
          : '当前为纯本机模式（未连接云端后端）。把项目部署到云端后端即开启真账号云同步。'}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${(typeof Sync !== 'undefined' && Sync.enabled()) ? '<button class="add-btn press" id="pf-sync">⟳ 立即同步</button>' : ''}
        <button class="d-btn press" id="pf-export">⬇ 导出备份</button>
        <label class="d-btn press" style="padding:11px 18px">⬆ 导入备份<input type="file" id="pf-import" accept=".json" hidden></label>
      </div>
    </div>

    <div class="sec-label">SESSION</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="d-btn press" id="pf-switch" style="color:var(--gold);border-color:rgba(212,175,55,0.35)">⇄ 切换账号</button>
      <button class="d-btn press" id="pf-logout" style="color:#e08f8f;border-color:rgba(224,143,143,0.3)">退出登录</button>
    </div>
    <div id="switch-panel" class="hidden" style="margin-top:12px"></div>`;

  /* 头像编辑 */
  document.getElementById('pf-ava').onclick = () => document.getElementById('ava-panel').classList.toggle('hidden');
  $m().querySelectorAll('.ava-emo').forEach(el => el.onclick = e => {
    e.stopPropagation();
    Store.updateProfile({ avatar: el.dataset.e });
    FX.burstFrom(el); FX.toast('头像已更新');
    profileView(); renderSidebar('profile');
  });
  document.getElementById('ava-file').onchange = e => {
    if (!e.target.files[0]) return;
    Store.resizeImage(e.target.files[0], url => {
      Store.updateProfile({ avatar: url });
      FX.toast('头像已更新'); profileView(); renderSidebar('profile');
    }, 128);
  };
  /* 昵称 */
  const saveName = () => {
    Store.updateProfile({ name: document.getElementById('pf-name').value.trim() });
    FX.toast('昵称已保存'); renderSidebar('profile');
  };
  document.getElementById('pf-save-name').onclick = saveName;
  document.getElementById('pf-name').onkeydown = e => { if (e.key === 'Enter') saveName(); };
  /* 账号详情折叠 */
  document.getElementById('pf-detail-toggle').onclick = () => {
    const p = document.getElementById('pf-detail');
    p.classList.toggle('hidden');
    document.getElementById('pf-detail-toggle').textContent = p.classList.contains('hidden') ? '查看账号详情 ▾' : '收起账号详情 ▴';
  };

  document.getElementById('pf-export').onclick = () => { Store.exportData(); FX.toast('已导出备份文件'); };
  document.getElementById('pf-import').onchange = e => {
    if (!e.target.files[0]) return;
    Store.importData(e.target.files[0], ok => {
      FX.toast(ok ? '导入成功，数据已同步' : '文件格式不正确');
      if (ok) location.hash = '#/home';
    });
  };
  /* 手动云同步：拉取云端最新并刷新 */
  const syncBtn = document.getElementById('pf-sync');
  if (syncBtn) syncBtn.onclick = async () => {
    syncBtn.disabled = true; syncBtn.textContent = '同步中…';
    try {
      const d = await Sync.pull();
      if (d) { Store.applyRemote(d); FX.toast('☁ 已同步到本设备'); route(); }
      else FX.toast('同步失败');
    } catch (e) { FX.toast('同步失败：' + (e.message || '网络异常')); }
    finally { syncBtn.disabled = false; syncBtn.textContent = '⟳ 立即同步'; }
  };
  /* 若云探测尚未完成，探测结束后刷新本页以显示正确状态 */
  if (typeof Sync !== 'undefined' && !Sync.enabled() && Sync.status() === 'local') {
    Sync.detect().then(() => { if ((location.hash || '').includes('profile')) profileView(); });
  }

  /* 切换账号 */
  document.getElementById('pf-switch').onclick = () => {
    const panel = document.getElementById('switch-panel');
    if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
    const others = Store.listAccounts().filter(a => a.id !== acc.id);
    panel.innerHTML = `<div class="glass" style="padding:14px">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:10px">本机账号（切换需输入对应密码）</div>
      ${others.length ? others.map(a => `
        <div class="t-item glass press sw-acc" data-email="${esc(a.email)}" style="margin-bottom:8px">
          ${a.avatar && a.avatar.startsWith('data:') ? `<img src="${a.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : `<span style="font-size:18px">${esc(a.avatar || '🪐')}</span>`}
          <span class="t-title">${esc(a.name || a.email.split('@')[0])}<br><small style="color:var(--txt3);font-size:10px">${esc(a.email)}</small></span>
          <span class="t-arrow">›</span>
        </div>`).join('') : '<div class="empty" style="padding:10px">本机没有其他账号，可退出后注册新账号</div>'}
      <button class="d-btn press" id="sw-new" style="margin-top:6px;font-size:11px">＋ 登录 / 注册其他账号</button>
    </div>`;
    panel.classList.remove('hidden');
    panel.querySelectorAll('.sw-acc').forEach(el => el.onclick = () => switchToLogin(el.dataset.email));
    document.getElementById('sw-new').onclick = () => switchToLogin('');
  };
  document.getElementById('pf-logout').onclick = () => switchToLogin(Store.current().email);
}

/* 退出到登录页（可预填账号） */
function switchToLogin(prefillEmail) {
  Store.logout();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  location.hash = '';
  if (typeof renderLoginAccounts === 'function') renderLoginAccounts();
  const idInput = document.getElementById('l-id');
  if (idInput) { idInput.value = prefillEmail || ''; document.getElementById('l-pass').value = ''; if (prefillEmail) document.getElementById('l-pass').focus(); }
}
