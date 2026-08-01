/* 无头复现测试：注册 → 进入模块 → 点击添加 */
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

(async () => {
  let html = fs.readFileSync(path.resolve(__dirname, '../app/index.html'), 'utf8');
  html = html.replace(/<link[^>]*>/g, '').replace(/<script src=[^>]*><\/script>/g, '');

  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://vintage.test/' });
  const { window } = dom;
  const doc = window.document;

  // stub
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect(){}, beginPath(){}, arc(){}, fill(){}, scale(){}, drawImage(){},
    moveTo(){}, lineTo(){}, stroke(){},
    set fillStyle(v){}, set strokeStyle(v){}, set lineCap(v){}, set lineJoin(v){}, set lineWidth(v){}
  });
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
  window.HTMLElement.prototype.animate = function(){ return { onfinish: null }; };
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.addEventListener('error', e => console.log('[page error]', e.message));

  for (const f of ['store.js', 'fx.js', 'views.js', 'views2.js', 'app.js']) {
    const s = doc.createElement('script');
    s.textContent = fs.readFileSync(path.resolve(__dirname, '../app/js/' + f), 'utf8');
    doc.body.appendChild(s);
  }
  // 触发 DOMContentLoaded 已过，手动跑启动逻辑
  const boot = doc.createElement('script');
  boot.textContent = "FX.initStars();FX.initParallax();FX.initLightbox();initLogin();document.querySelectorAll('#bottom-nav .nav-item').forEach(el=>el.onclick=()=>location.hash='#/'+el.dataset.nav);window.addEventListener('hashchange',route);if(Store.session())enterApp();";
  doc.body.appendChild(boot);

  const log = (...a) => console.log(...a);
  const tick = ms => new Promise(r => setTimeout(r, ms));
  try {
    doc.getElementById('l-switch').onclick();
    doc.getElementById('l-id').value = 'test@test.com';
    doc.getElementById('l-pass').value = '1234';
    doc.getElementById('l-pass2').value = '1234';
    doc.getElementById('l-go').onclick();
    await tick(400);   // 登录/注册已改为异步，等待 Promise 落地
    log('注册进入 app?', !doc.getElementById('app').classList.contains('hidden'));

    window.location.hash = '#/movie';
    await tick(300);
    log('movie 页有输入框?', !!doc.getElementById('new-task'));
    doc.getElementById('new-task').value = '测试任务ABC';
    doc.getElementById('add-task').onclick();
    await tick(200);
    log('movie 添加成功?', doc.body.innerHTML.includes('测试任务ABC'));

    window.location.hash = '#/job';
    await tick(300);
    const q = doc.querySelector('.quad[data-q="todo"]');
    q.querySelector('.q-add input').value = 'JOB条目XYZ';
    q.querySelector('.q-add button').onclick();
    await tick(200);
    log('job 添加成功?', doc.body.innerHTML.includes('JOB条目XYZ'));

    window.location.hash = '#/notes';
    await tick(300);
    doc.getElementById('new-note').value = '笔记DEF';
    doc.getElementById('add-note').onclick();
    await tick(300);
    log('notes 添加后跳转 hash:', window.location.hash);

    window.location.hash = '#/eur';
    await tick(300);
    doc.getElementById('new-city').value = 'london';
    doc.getElementById('add-city').onclick();
    await tick(200);
    log('eur 城市添加成功?', doc.body.innerHTML.includes('LONDON'));

    const accs = JSON.parse(window.localStorage.getItem('vintage_accounts') || '[]');
    const data = JSON.parse(window.localStorage.getItem('vintage_data_' + accs[0].id) || 'null');
    log('持久化: movie任务=', data.movie.tasks.length, 'job todo=', data.job.todo.length, 'notes=', data.notes.length, 'cities=', data.eur.cities.length);
  } catch (e) {
    console.log('[TEST ERROR]', e.stack);
  }
  process.exit(0);
})();
