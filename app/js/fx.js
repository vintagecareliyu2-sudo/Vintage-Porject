/* ═══════ VINTAGE FX：粒子 / count-up / 星空 / 视差 ═══════ */
'use strict';

const FX = (() => {

  /* 金色粒子喷溅：8–12 枚，0.5s */
  function burst(x, y) {
    const n = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'fx-p';
      const s = 3 + Math.random() * 4;
      p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;` +
        `background:${Math.random() > .4 ? '#D4AF37' : '#F3E3B8'};` +
        (Math.random() > .5 ? 'border-radius:50%;' : '');
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2, dist = 26 + Math.random() * 34;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist - 50 / s}px,${Math.sin(ang) * dist}px) scale(.2)`, opacity: 0 }
      ], { duration: 480 + Math.random() * 120, easing: 'cubic-bezier(0.22,1,0.36,1)' })
        .onfinish = () => p.remove();
    }
  }
  function burstFrom(el) {
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }

  /* 金色扫光 */
  function sweep(el) {
    el.classList.remove('sweeping'); void el.offsetWidth;
    el.classList.add('sweeping');
    setTimeout(() => el.classList.remove('sweeping'), 900);
  }

  /* 数字滚动递增 */
  function countUp(el, target, suffix = '', dur = 900) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* Orbit Ring SVG */
  function ring(pct, size = 42) {
    const r = 17, c = 2 * Math.PI * r;
    return `<span class="orbit-ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 42 42">
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F3A183"/><stop offset="100%" stop-color="#D4AF37"/>
        </linearGradient></defs>
        <circle class="bgc" cx="21" cy="21" r="${r}"/>
        <circle class="fgc" cx="21" cy="21" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
      </svg><span class="pct">${Math.round(pct)}%</span></span>`;
  }

  /* 星空 canvas */
  function initStars() {
    const cv = document.getElementById('stars');
    const ctx = cv.getContext('2d');
    let stars = [];
    function resize() {
      cv.width = innerWidth; cv.height = innerHeight;
      stars = Array.from({ length: Math.min(160, innerWidth / 8) }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        r: Math.random() * 1.3 + 0.3,
        a: Math.random() * Math.PI * 2,
        sp: 0.008 + Math.random() * 0.02,
        gold: Math.random() > 0.86
      }));
    }
    resize(); addEventListener('resize', resize);
    (function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const s of stars) {
        s.a += s.sp;
        const o = 0.25 + Math.abs(Math.sin(s.a)) * 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fillStyle = s.gold ? `rgba(212,175,55,${o * 0.8})` : `rgba(255,255,255,${o * 0.65})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }

  /* 星云视差漂移 */
  function initParallax() {
    const n1 = document.querySelector('.n1'), n2 = document.querySelector('.n2');
    let tx = 0, ty = 0;
    function apply(x, y) {
      n1.style.transform = `translate(${x * 18}px,${y * 12}px)`;
      n2.style.transform = `translate(${-x * 14}px,${-y * 10}px)`;
    }
    addEventListener('mousemove', e => {
      tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
      apply(tx, ty);
    }, { passive: true });
    /* 手机陀螺仪：图标高光/星云轻微流动 */
    if (window.DeviceOrientationEvent) {
      addEventListener('deviceorientation', e => {
        if (e.gamma == null) return;
        apply(Math.max(-0.5, Math.min(0.5, e.gamma / 60)), Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90)));
      }, { passive: true });
    }
  }

  /* 图片放大 */
  function initLightbox() {
    const lb = document.getElementById('lightbox');
    lb.addEventListener('click', () => lb.classList.add('hidden'));
    document.body.addEventListener('click', e => {
      const img = e.target.closest('.thumb');
      if (!img) return;
      document.getElementById('lightbox-img').src = img.src;
      lb.classList.remove('hidden');
    });
  }

  return { burst, burstFrom, sweep, countUp, toast, ring, initStars, initParallax, initLightbox };
})();
