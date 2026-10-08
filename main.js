(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  /* ---------- hero entrance (single orchestrated moment) ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

  /* ---------- bottom action bar (thumb zone) ---------- */
  const dock = $('#dock'), hideDock = new Set();
  new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? hideDock.add(e.target.id) : hideDock.delete(e.target.id); onScroll(); }), { threshold: .25 })
    .observe($('#film'));
  new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? hideDock.add(e.target.id) : hideDock.delete(e.target.id); onScroll(); }), { threshold: .1 })
    .observe($('#next'));

  /* ---------- nav + progress ---------- */
  const nav = $('#nav'), bar = $('#progressBar');
  let ticking = false, docMax = 1;
  const measure = () => { docMax = document.documentElement.scrollHeight - innerHeight; measureStory(); };
  const frame = () => {
    ticking = false;
    const y = scrollY;
    bar.style.width = (docMax > 0 ? (y / docMax) * 100 : 0) + '%';
    nav.classList.toggle('stuck', y > 40);
    story(y);
    dock.classList.toggle('show', y > innerHeight * .7 && !hideDock.size);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  /* ---------- hero canvas ---------- */
  const cv = $('#heroCanvas'), ctx = cv.getContext('2d');
  const hero = $('#hero');
  const chips = $$('#heroStatus .chip');
  let W = 0, H = 0, dpr = 1, mouseX = .5, buildings = [], stars = [];
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);

  function build() {
    buildings = [];
    [[.28, .5, '#0a1530'], [.45, .8, '#0c1a3a'], [.7, 1.3, '#102248']].forEach(([hh, sp, col], li) => {
      let x = -40;
      while (x < W + 80) {
        const w = (28 + rnd() * 70) * (1 + li * .2), h = H * (hh * .35 + rnd() * hh * .5);
        const wins = [];
        for (let i = 0; i < w / 14; i++) for (let j = 0; j < h / 20; j++) if (rnd() > .86) wins.push([i * 14 + 6, j * 20 + 8, rnd() * 6]);
        buildings.push({ x, w, h, col, sp, wins, li });
        x += w + rnd() * 12;
      }
    });
    stars = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd() * .55, r: rnd() * 1.4 + .3, p: rnd() * 6 }));
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  addEventListener('resize', resize);
  resize();

  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  };
  const coins = [];
  let pulse = -1, lastPhase = '';

  function setChip(k) { chips.forEach(c => c.classList.toggle('on', c.dataset.s === k)); }

  function drawHero(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    const mob = W < 700;
    const horizon = H * (mob ? .8 : .74);

    // stars
    stars.forEach(s => {
      ctx.globalAlpha = .35 + .35 * Math.sin(t * 1.3 + s.p);
      ctx.fillStyle = '#9fc4ff';
      ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
    });
    ctx.globalAlpha = 1;

    // skyline, parallax
    buildings.forEach(b => {
      const ox = (mouseX - .5) * -28 * b.sp;
      const x = b.x + ox, y = horizon - b.h * (1 - b.li * .08) + b.li * 8;
      ctx.fillStyle = b.col;
      ctx.fillRect(x, y, b.w, horizon - y + 40);
      if (b.li > 0) b.wins.forEach(w => {
        const on = .35 + .65 * Math.max(0, Math.sin(t * .8 + w[2]));
        ctx.fillStyle = `rgba(255,226,150,${.08 + on * .35})`;
        ctx.fillRect(x + w[0], y + w[1], 5, 8);
      });
    });

    // ground
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, '#08102a'); g.addColorStop(1, '#04060b');
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);

    // road
    const p0 = { x: -W * .05, y: H * .97 }, p1 = { x: W * .3, y: H * (mob ? .86 : .8) }, p2 = { x: W * .58, y: H * 1 }, p3 = { x: W * (mob ? .8 : .86), y: horizon + H * .035 };
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = '#111c3d'; ctx.lineWidth = 22; ctx.stroke();

    // timeline: drive 6.4s, scan .7, burst 1.8, rest 1.1
    const D = 6.4, S = .7, B = 1.8, R = 1.1, L = D + S + B + R;
    const k = reduce ? D + S + B * .5 : t % L;
    const prog = clamp(k / D);
    const e = ease(prog);
    const phase = k < D ? 'moving' : k < D + S + B ? 'done' : 'locked';
    if (phase !== lastPhase) { setChip(k < .05 || k >= D + S + B ? 'locked' : phase); lastPhase = phase; }
    if (k < .5 || k > D + S + B) setChip('locked');
    else if (k < D) setChip('moving');
    else setChip('done');

    // lit road up to car
    ctx.save();
    ctx.shadowColor = '#46e3ff'; ctx.shadowBlur = mob ? 0 : 16;
    ctx.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps * e; i++) { const p = bez(p0, p1, p2, p3, i / steps); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    const lg = ctx.createLinearGradient(p0.x, 0, p3.x, 0);
    lg.addColorStop(0, 'rgba(70,227,255,0)'); lg.addColorStop(.6, '#46e3ff'); lg.addColorStop(1, '#7c5cff');
    ctx.strokeStyle = lg; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();

    // house + QR box at the end
    const hx = p3.x + 12, hy = p3.y - 6, hs = mob ? .75 : 1;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(hs, hs);
    ctx.fillStyle = '#0f1c40'; ctx.strokeStyle = '#46e3ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-34, -42); ctx.lineTo(0, -68); ctx.lineTo(34, -42); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = k > D + S ? '#14f195' : '#e8eefc'; ctx.fillRect(-9, -26, 18, 18);
    ctx.fillStyle = '#04060b'; ctx.fillRect(-6, -23, 5, 5); ctx.fillRect(1, -23, 5, 5); ctx.fillRect(-6, -16, 5, 5); ctx.fillRect(2, -15, 3, 3);
    ctx.restore();

    // car
    const cp = bez(p0, p1, p2, p3, e), cq = bez(p0, p1, p2, p3, Math.min(1, e + .01));
    const ang = Math.atan2(cq.y - cp.y, cq.x - cp.x);
    const cs = mob ? .85 : 1.25;
    ctx.save(); ctx.translate(cp.x, cp.y - 12 * cs); ctx.rotate(ang); ctx.scale(cs, cs);
    // headlight cone
    const hl = ctx.createLinearGradient(22, 0, 120, 0);
    hl.addColorStop(0, 'rgba(255,255,230,.45)'); hl.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.moveTo(22, -2); ctx.lineTo(120, -26); ctx.lineTo(120, 24); ctx.closePath(); ctx.fill();
    ctx.shadowColor = '#46e3ff'; ctx.shadowBlur = mob ? 0 : 18;
    ctx.fillStyle = '#e8eefc'; ctx.beginPath(); ctx.roundRect(-24, -8, 48, 16, 6); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9fb4e8'; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-5, -17); ctx.lineTo(8, -17); ctx.lineTo(13, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#04060b'; ctx.strokeStyle = '#46e3ff'; ctx.lineWidth = 2;
    [-14, 14].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 9, 5.5, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.restore();

    // floating label: money locked → delivered
    const lx = cp.x, ly = cp.y - 62 * (cs / 1.25) - 10;
    const lab = phase === 'done' && k > D + S ? 'Delivered' : '0.2 SOL locked';
    ctx.font = '600 13px "Instrument Sans", sans-serif';
    const tw = ctx.measureText(lab).width + 24;
    ctx.fillStyle = 'rgba(10,18,40,.85)'; ctx.strokeStyle = lab === 'Delivered' ? '#14f195' : 'rgba(124,92,255,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(lx - tw / 2, ly - 14, tw, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lab === 'Delivered' ? '#14f195' : '#d6ccff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly);

    // scan flash
    if (k > D && k < D + S) {
      const a = (k - D) / S;
      ctx.fillStyle = `rgba(20,241,149,${.35 * Math.sin(a * Math.PI)})`;
      ctx.beginPath(); ctx.moveTo(cp.x + 20, cp.y - 22); ctx.lineTo(hx, hy - 26 * hs - 14); ctx.lineTo(hx, hy - 8); ctx.closePath(); ctx.fill();
    }
    // payout burst
    if (k >= D + S && !coins.length && lastBurst !== Math.floor(t / L)) {
      lastBurst = Math.floor(t / L); pulse = t;
      for (let i = 0; i < 26; i++) coins.push({ x: lx, y: ly, vx: (Math.random() * 2 - .2) * 3.2 + 1, vy: -Math.random() * 6 - 1, life: 1 });
    }
    if (pulse > 0 && t - pulse < 1.6) {
      const a = (t - pulse) / 1.6;
      ctx.strokeStyle = `rgba(20,241,149,${1 - a})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy - 20, 20 + a * 150, 0, 7); ctx.stroke();
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.vy += .18; c.x += c.vx; c.y += c.vy; c.life -= .012;
      if (c.life <= 0) { coins.splice(i, 1); continue; }
      ctx.globalAlpha = c.life; ctx.fillStyle = '#14f195'; ctx.shadowColor = '#14f195'; ctx.shadowBlur = mob ? 0 : 12;
      ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  let lastBurst = -1;
  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  function loop(now) {
    if (heroVisible && !document.hidden) drawHero(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width;
    hero.querySelector('.hero-spot').style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.querySelector('.hero-spot').style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* ---------- scroll story ---------- */
  const storyEl = $('#story'), scene = $('#scene');
  const route = $('#route'), car = $('#car'), routeLit = $('#routeLit');
  const routeLen = route.getTotalLength();
  routeLit.style.strokeDasharray = routeLen;
  const coinEls = $$('#coins .coin');
  const stepEls = $$('#steps li'), statusChips = $$('#storyStatus .chip');
  const linkA = $('#linkA'), linkB = $('#linkB'), glow = $('.escrow-glow'), hex = $('#hex'), shackle = $('#shackle');
  const beam = $('#beamShape'), sig = $('#sig'), amt = $('#amt');
  const SIG = 'sig 3246eKTqKGB8GAwdfZsYPGWRZggT87…GPW3#CKSZ6nF';
  const B = { buyer: [110, 150], esc: [500, 110], owner: [890, 150] };
  let lastStep = -1;

  const pt = (p) => route.getPointAtLength(p * routeLen);
  function placeCoin(el, from, to, t, arc = -50) {
    const x = lerp(from[0], to[0], t), y = lerp(from[1], to[1], t) + Math.sin(t * Math.PI) * arc;
    el.setAttribute('cx', x); el.setAttribute('cy', y);
    el.style.opacity = t > 0 && t < 1 ? 1 : 0;
  }

  let storyTop = 0, storyTotal = 1;
  function measureStory() { storyTop = storyEl.getBoundingClientRect().top + scrollY; storyTotal = storyEl.offsetHeight - innerHeight; }
  function story(y = scrollY) {
    const p = clamp((y - storyTop) / storyTotal);
    // phases
    const A = clamp(p / .16);                      // coins buyer -> escrow
    const drive = ease(clamp((p - .16) / .54));    // car
    const scan = clamp((p - .7) / .14);            // scan
    const conf = clamp((p - .82) / .1);            // signature
    const pay = clamp((p - .92) / .08);            // payout

    // car
    const cp = pt(drive), cq = pt(Math.min(1, drive + .004));
    const ang = Math.atan2(cq.y - cp.y, cq.x - cp.x) * 180 / Math.PI;
    car.setAttribute('transform', `translate(${cp.x} ${cp.y - 14}) rotate(${ang})`);
    routeLit.style.strokeDashoffset = routeLen * (1 - drive);
    routeLit.style.opacity = p > .16 ? 1 : 0;

    // coins
    coinEls.forEach((c, i) => {
      if (pay > 0) placeCoin(c, B.esc, B.owner, clamp(pay * 1.4 - i * .2), -70);
      else if (A < 1) placeCoin(c, B.buyer, B.esc, clamp(A * 1.5 - i * .25), -70);
      else c.style.opacity = 0;
    });

    // links, glow, states
    linkA.classList.toggle('lit', p > .02);
    linkB.classList.toggle('lit', pay > 0);
    const paid = pay > .5;
    glow.setAttribute('opacity', p > .16 && !paid ? .9 : paid ? .4 : 0);
    hex.classList.toggle('paid', paid);
    shackle.setAttribute('d', p > .1 ? 'M-8 -6 v-7 a8 8 0 0 1 16 0 v7' : 'M-8 -6 v-7 a8 8 0 0 1 16 0 v-0');
    amt.textContent = paid ? 'Released' : '0.2 SOL';
    amt.style.fill = paid ? 'var(--mint)' : '';

    // scan beam at the box
    beam.setAttribute('opacity', scan > 0 && conf < 1 ? Math.sin(scan * Math.PI) * .9 + .1 : 0);
    beam.setAttribute('transform', `translate(${cp.x + 22} ${cp.y - 16}) rotate(${Math.atan2(470 - cp.y, 880 - cp.x) * 180 / Math.PI}) scale(.55)`);
    beam.style.display = scan > 0 ? '' : 'none';

    // signature
    sig.textContent = SIG.slice(0, Math.floor(conf * SIG.length));

    // step + status
    const step = p < .16 ? 0 : p < .7 ? 1 : p < .82 ? 2 : p < .92 ? 3 : 4;
    if (step !== lastStep) {
      stepEls.forEach((li, i) => { li.classList.toggle('now', i === step); li.classList.toggle('past', i < step); });
      lastStep = step;
    }
    const status = step === 0 ? 'locked' : step < 4 ? 'moving' : 'done';
    const sTrue = p < .02 ? 'locked' : status;
    statusChips.forEach(c => c.classList.toggle('on', c.dataset.s === (step === 0 ? 'locked' : sTrue)));
  }

  /* ---------- reveal once: problem icons, bars, rings ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; io.unobserve(el);
    if (el.matches('.pr-list li')) el.classList.add('seen');
    if (el.matches('.mrow')) el.querySelector('i').style.width = el.dataset.w + '%';
    if (el.matches('.ring')) {
      const v = +el.dataset.v;
      el.querySelector('.rv').style.strokeDashoffset = 100 - v;
      const b = el.querySelector('b'), t0 = performance.now();
      const tick = n => { const k = clamp((n - t0) / 1800); b.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))) + '%'; if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  }), { threshold: .35 });
  $$('.pr-list li, .mrow, .ring').forEach(el => io.observe(el));

  /* ---------- proof layers + team tilt ---------- */
  const layers = $('#layers');
  if (layers && matchMedia('(hover:hover)').matches) {
    layers.addEventListener('pointermove', e => {
      const r = layers.getBoundingClientRect();
      layers.style.setProperty('--rx', (18 + ((e.clientY - r.top) / r.height - .5) * -10) + 'deg');
      layers.style.setProperty('--rz', (-4 + ((e.clientX - r.left) / r.width - .5) * 6) + 'deg');
    });
  }
  if (matchMedia('(hover:hover)').matches && !reduce) {
    $$('.card').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--ty', (((e.clientX - r.left) / r.width - .5) * 12) + 'deg');
        c.style.setProperty('--tx', (((e.clientY - r.top) / r.height - .5) * -12) + 'deg');
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--tx', '0deg'); c.style.setProperty('--ty', '0deg'); });
    });
  }

  /* ---------- mobile menu + tap on proof layers ---------- */
  const menuBtn = $('#menuBtn'), navLinks = $('#navLinks');
  const setMenu = open => { navLinks.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  if (layers) {
    const toggle = () => layers.classList.toggle('lift');
    layers.addEventListener('click', toggle);
    layers.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }

  /* ---------- video ---------- */
  const player = $('#player'), vid = $('#demo'), playBtn = $('#playBtn');
  player.classList.add('idle');
  vid.controls = false;
  const vstate = $('#vstate');
  const start = () => {
    player.classList.remove('idle'); player.classList.add('loading'); vstate.textContent = 'Loading video';
    vid.controls = true; vid.preload = 'auto';
    vid.play().catch(() => {});
  };
  vid.addEventListener('playing', () => { player.classList.remove('loading'); vstate.textContent = ''; });
  vid.addEventListener('waiting', () => { player.classList.add('loading'); });
  vid.addEventListener('error', () => {
    player.classList.remove('loading');
    vstate.innerHTML = 'The video could not load. <a href="https://www.youtube.com/watch?v=P73MK2Du2Nw" target="_blank" rel="noopener">Watch it on YouTube</a>.';
  });
  playBtn.addEventListener('click', start);
  vid.addEventListener('ended', () => { player.classList.add('idle'); vid.controls = false; vid.currentTime = 0; });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); onScroll(); });
  measure(); frame();
})();
