/* ═══════ VINTAGE App：路由 + 登录 + 初始化 ═══════ */
'use strict';

/* ── 侧边栏渲染 ── */
function renderSidebar(activeId) {
  const nav = document.getElementById('side-menu');
  nav.innerHTML = MODULES.map((m, i) => {
    const hasSub = ['study', 'ai', 'kr', 'us', 'eur', 'notes'].includes(m.id);
    return `${i ? '<hr class="mdivider">' : ''}
    <div class="menu-item ${m.id === activeId ? 'active' : ''}" data-go="${m.id}">
      ${modIcon(m)}<span class="menu-label">${esc(modLabel(m))}</span>
      <button class="mod-edit press" data-edit="${m.id}" title="编辑名称与图标" aria-label="编辑">✎</button>
      ${hasSub ? '<span class="sub-dot" title="含子模块">◦</span>' : ''}
    </div>`;
  }).join('');
  nav.querySelectorAll('.menu-item').forEach(el => {
    el.onclick = e => { if (e.target.closest('.mod-edit')) return; location.hash = '#/' + el.dataset.go; };
  });
  nav.querySelectorAll('.mod-edit').forEach(b => b.onclick = e => {
    e.stopPropagation(); openSidebarEditor(b.dataset.edit, activeId);
  });
  const acc = Store.current();
  document.getElementById('side-user').textContent = acc ? '🪐 ' + acc.email : '';
  document.getElementById('side-profile').onclick = () => location.hash = '#/profile';
}

/* 侧边栏编辑：图标 emoji + 名称（存储于 data().custom[id]） */
const SIDE_EMOJIS = ['🎓', '🗝️', '💼', '🤖', '🗺️', '🇰🇷', '🇺🇸', '🎬', '📖', '📜',
  '⭐', '🌙', '🚀', '🌍', '☄️', '🔥', '💡', '📌', '🧭', '🛰️',
  '📝', '📊', '🎯', '💎', '🌟', '🪐', '🛸', '🔭', '⚡', '🎨'];

function openSidebarEditor(modId, activeId) {
  const m = modOf(modId);
  const cur = modCustom(modId);
  const panel = document.getElementById('side-editor');
  panel.innerHTML = `
    <div class="ed-head">编辑 · ${esc(m.label)}</div>
    <div class="ed-tip">选择图标（Emoji）</div>
    <div class="ed-emo">${SIDE_EMOJIS.map(e =>
      `<span class="ed-emop ${cur.icon === e ? 'on' : ''}" data-e="${e}">${e}</span>`).join('')}</div>
    <div class="ed-tip">模块名称</div>
    <input class="ginput ed-input" id="ed-label" value="${esc(cur.label || m.label)}" maxlength="20" placeholder="模块名称">
    <div class="ed-btns">
      <button class="add-btn press" id="ed-save" style="flex:1">保存</button>
      <button class="d-btn press" id="ed-reset">恢复默认</button>
    </div>`;
  panel.classList.remove('hidden');

  let chosen = cur.icon || '';
  panel.querySelectorAll('.ed-emop').forEach(el => el.onclick = () => {
    panel.querySelectorAll('.ed-emop').forEach(x => x.classList.remove('on'));
    el.classList.add('on'); chosen = el.dataset.e;
  });
  document.getElementById('ed-save').onclick = () => {
    const label = (document.getElementById('ed-label').value || '').trim() || m.label;
    Store.data().custom[modId] = { icon: chosen, label };
    Store.save();
    panel.classList.add('hidden');
    FX.toast('侧边栏已更新');
    route();
  };
  document.getElementById('ed-reset').onclick = () => {
    delete Store.data().custom[modId];
    Store.save();
    panel.classList.add('hidden');
    FX.toast('已恢复默认');
    route();
  };
}

function setBottomNav(key) {
  document.querySelectorAll('#bottom-nav .nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.nav === key));
}

/* ── 路由 ── */
function route() {
  if (!Store.current()) return;
  const seg = (location.hash.slice(2) || 'home').split('/');
  const [mod, sub, id] = seg;
  const todoMods = ['study', 'private', 'ai', 'movie', 'book'];
  let navKey = 'home';

  try {
    if (mod === 'home') homeView();
    else if (mod === 'modules') { modulesView(); navKey = 'modules'; }
    else if (mod === 'pulse') { pulseView(); navKey = 'pulse'; }
    else if (mod === 'profile') { profileView(); navKey = 'profile'; }
    else if (todoMods.includes(mod)) {
      navKey = 'modules';
      if (sub === 't' && id) taskDetailView(mod, id);
      else todoListView(mod);
    }
    else if (mod === 'job') { jobView(); navKey = 'modules'; }
    else if (mod === 'eur') {
      navKey = 'modules';
      if (sub === 'c' && id) cityView(id); else eurView();
    }
    else if (mod === 'kr' || mod === 'us') { langView(mod); navKey = 'pulse'; }
    else if (mod === 'notes') {
      navKey = 'modules';
      if (sub === 'n' && id) noteDetailView(id); else notesView();
    }
    else homeView();
  } catch (err) {
    console.error(err);
    homeView();
  }
  renderSidebar(mod);
  setBottomNav(navKey);
  document.getElementById('main').scrollTop = 0;
}

/* ── 登录界面逻辑 ── */
function initLogin() {
  let mode = 'login';       /* login | register | reset */
  let idType = 'email';
  const $id = document.getElementById('l-id');
  const $p1 = document.getElementById('l-pass');
  const $p2 = document.getElementById('l-pass2');
  const $msg = document.getElementById('l-msg');
  const $go = document.getElementById('l-go');
  const $sw = document.getElementById('l-switch');
  const $rs = document.getElementById('l-reset');

  function paint() {
    $p2.classList.toggle('hidden', mode === 'login');
    $go.textContent = mode === 'login' ? '登 录' : mode === 'register' ? '注 册' : '重置密码';
    $sw.textContent = mode === 'login' ? '注册新账号' : '返回登录';
    $rs.style.visibility = mode === 'login' ? 'visible' : 'hidden';
    $p2.placeholder = mode === 'reset' ? '新密码（再次输入）' : '确认密码';
    $p1.placeholder = mode === 'reset' ? '新密码' : '密码';
    $id.placeholder = idType === 'email' ? '邮箱地址' : '手机号';
    $msg.textContent = ''; $msg.classList.remove('ok');
  }

  document.querySelectorAll('.ltab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.ltab').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); idType = b.dataset.t; paint();
  });
  $sw.onclick = () => { mode = mode === 'login' ? 'register' : 'login'; paint(); };
  $rs.onclick = () => { mode = 'reset'; paint(); };

  function validId(v) {
    return idType === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^\d{7,15}$/.test(v);
  }

  $go.onclick = async () => {
    const idv = $id.value.trim(), p1 = $p1.value, p2 = $p2.value;
    $msg.classList.remove('ok');
    if (!validId(idv)) { $msg.textContent = idType === 'email' ? '请输入有效邮箱' : '请输入有效手机号'; return; }
    if (p1.length < 4) { $msg.textContent = '密码至少 4 位'; return; }

    $go.disabled = true; $go.textContent = '处理中…';
    try {
      if (mode === 'login') {
        const r = await Store.login(idv, p1);
        if (!r.ok) { $msg.textContent = r.msg; return; }
        enterApp();
      } else if (mode === 'register') {
        if (p1 !== p2) { $msg.textContent = '两次密码不一致'; return; }
        const r = await Store.register(idv, p1);
        if (!r.ok) { $msg.textContent = r.msg; return; }
        await Store.login(idv, p1);
        FX.toast('注册成功，欢迎进入星港 🪐');
        enterApp();
      } else {
        if (p1 !== p2) { $msg.textContent = '两次密码不一致'; return; }
        const r = Store.resetPass(idv, p1);
        $msg.textContent = r.ok ? '密码已重置，请登录' : r.msg;
        if (r.ok) { $msg.classList.add('ok'); mode = 'login'; setTimeout(paint, 900); }
      }
    } finally {
      $go.disabled = false; paint();
    }
  };
  [$id, $p1, $p2].forEach(el => el.onkeydown = e => { if (e.key === 'Enter') $go.onclick(); });
  paint();
}

function enterApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  if (!location.hash || location.hash === '#') location.hash = '#/home';
  route();
}

/* ── 启动 ── */
window.addEventListener('DOMContentLoaded', () => {
  FX.initStars();
  FX.initParallax();
  FX.initLightbox();
  initLogin();

  document.querySelectorAll('#bottom-nav .nav-item').forEach(el =>
    el.onclick = () => location.hash = '#/' + el.dataset.nav);

  window.addEventListener('hashchange', route);

  /* PWA：注册 Service Worker（失败静默，不影响使用） */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }

  /* 云同步：探测后端 + 已有会话则后台拉取最新数据 */
  if (typeof Sync !== 'undefined') {
    Sync.detect().then(async () => {
      if (Sync.enabled() && Store.session()) {
        try {
          const latest = await Sync.resume();
          if (latest) { Store.applyRemote(latest); if (typeof route === 'function') route(); }
        } catch (e) {}
      }
    });
  }
  if (Store.session()) enterApp();
});
