(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = { concrete: css('--color-concrete'), paper: css('--color-paper'), ink: css('--color-ink'), signal: css('--color-signal'), paid: css('--color-paid') };

  document.documentElement.classList.add('js');

  /* ---------- bottom action bar (thumb zone) ---------- */
  const dock = $('#dock');
  let nearEnd = false;
  new IntersectionObserver(([e]) => { nearEnd = e.isIntersecting; onScroll(); }, { threshold: .1 }).observe($('#next'));

  let ticking = false;
  const frame = () => {
    ticking = false;
    story(scrollY);
    dock.classList.toggle('show', scrollY > innerHeight * .7 && !nearEnd);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

  /* ---------- hero scene: flat, one loop ---------- */
  const cv = $('#heroCanvas'), ctx = cv.getContext('2d');
  const hero = $('#hero');
  let W = 0, H = 0, dpr = 1, blocks = [];
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11);

  function build() {
    blocks = [];
    [[.24, '#d6d8d4'], [.38, '#d0d2ce']].forEach(([hh, col], li) => {
      let x = -30;
      while (x < W + 60) {
        const w = 46 + rnd() * 80, h = H * (hh * .45 + rnd() * hh * .55);
        blocks.push({ x, w, h, col, li });
        x += w + (li ? 6 : 14);
      }
    });
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  addEventListener('resize', () => { resize(); measure(); onScroll(); });
  resize();

  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  };
  const coins = [];
  let lastBurst = -1;

  function drawHero(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    const mob = W < 700;
    const horizon = H * (mob ? .8 : .76);

    // skyline: two flat layers, windows cut out of the facade
    blocks.forEach(b => {
      const y = horizon - b.h;
      ctx.fillStyle = b.col; ctx.fillRect(b.x, y, b.w, b.h + 2);
      if (b.li) {
        ctx.fillStyle = C.concrete;
        for (let wx = 10; wx < b.w - 12; wx += 18) for (let wy = 12; wy < b.h - 8; wy += 26) ctx.fillRect(b.x + wx, y + wy, 8, 12);
      }
    });
    ctx.fillStyle = '#dcdedb'; ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = C.ink; ctx.fillRect(0, horizon, W, 2);

    // road
    const p0 = { x: -W * .05, y: H * .97 }, p1 = { x: W * .3, y: H * (mob ? .88 : .82) }, p2 = { x: W * .58, y: H }, p3 = { x: W * (mob ? .78 : .84), y: horizon + H * .04 };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = C.ink; ctx.lineWidth = mob ? 22 : 30; ctx.stroke();
    ctx.setLineDash([16, 18]); ctx.lineDashOffset = reduce ? 0 : -t * 22;
    ctx.strokeStyle = C.signal; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);

    // timeline: drive 6.4s, scan .7, pay 1.8, rest 1.1
    const D = 6.4, S = .7, B = 1.8, R = 1.1, L = D + S + B + R;
    const k = reduce ? D + S + B * .5 : t % L;
    const e = ease(clamp(k / D));
    const paidNow = k > D + S;

    // house with the QR box
    const hs = mob ? .75 : 1, hx = p3.x + 16 * hs, hy = p3.y - 8;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(hs, hs);
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-36, -44); ctx.lineTo(0, -72); ctx.lineTo(36, -44); ctx.lineTo(36, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = paidNow ? C.paid : C.paper; ctx.fillRect(-11, -30, 22, 22); ctx.strokeRect(-11, -30, 22, 22);
    ctx.fillStyle = paidNow ? C.paper : C.ink;
    ctx.fillRect(-8, -27, 6, 6); ctx.fillRect(2, -27, 6, 6); ctx.fillRect(-8, -17, 6, 6); ctx.fillRect(3, -16, 4, 4);
    ctx.restore();

    // car
    const stop = .88;                              // the car halts in front of the house
    const cp = bez(p0, p1, p2, p3, e * stop), cq = bez(p0, p1, p2, p3, Math.min(1, e * stop + .01));
    const ang = Math.atan2(cq.y - cp.y, cq.x - cp.x);
    const cs = mob ? 1.1 : 1.75;
    ctx.save(); ctx.translate(cp.x, cp.y - 16 * cs); ctx.rotate(ang); ctx.scale(cs, cs);
    ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.rect(-8, -25, 15, 9); ctx.fill(); ctx.stroke();           // parcel on the roof
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-5, -17); ctx.lineTo(8, -17); ctx.lineTo(13, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.signal; ctx.beginPath(); ctx.roundRect(-24, -8, 48, 16, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.strokeStyle = C.paper;
    [-14, 14].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 9, 5.5, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.restore();

    // price tag on the car: locked, then paid
    const ly = cp.y - 78 * (cs / 1.4) - 8;
    const lab = paidNow ? 'Paid' : '0.2 SOL locked';
    ctx.font = '700 14px Archivo, sans-serif';
    const tw = ctx.measureText(lab).width + 26;
    const lx = clamp(cp.x, tw / 2 + 10, W - tw / 2 - 10);
    ctx.fillStyle = paidNow ? C.paid : C.paper; ctx.strokeStyle = paidNow ? C.paid : C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(lx - tw / 2, ly - 15, tw, 30, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = paidNow ? C.paper : C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);

    // payout: three coins hop from the tag to the house
    if (!reduce && k >= D + S && lastBurst !== Math.floor(t / L) && !coins.length) {
      lastBurst = Math.floor(t / L);
      for (let i = 0; i < 3; i++) coins.push({ t0: t + i * .18, x0: lx, y0: ly, x1: hx, y1: hy - 40 * hs });
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i], u = (t - c.t0) / 1.1;
      if (u >= 1) { coins.splice(i, 1); continue; }
      if (u < 0) continue;
      const x = lerp(c.x0, c.x1, u), y = lerp(c.y0, c.y1, u) - Math.sin(u * Math.PI) * 60;
      ctx.globalAlpha = u > .85 ? (1 - u) / .15 : 1;
      ctx.fillStyle = C.signal; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  function loop(now) {
    if (heroVisible && !document.hidden) drawHero(now);
    if (!reduce) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  if (document.fonts) document.fonts.ready.then(() => drawHero(performance.now()));

  /* ---------- scroll story ---------- */
  const storyEl = $('#story');
  const route = $('#route'), car = $('#car'), routeLit = $('#routeLit');
  const routeLen = route.getTotalLength();
  routeLit.style.strokeDasharray = routeLen;
  const coinEls = $$('#coins .coin');
  const stepEls = $$('#steps li'), statusTags = $$('#storyStatus .tag');
  const linkA = $('#linkA'), linkB = $('#linkB'), hex = $('#hex'), shackle = $('#shackle');
  const beam = $('#beamShape'), sig = $('#sig'), amt = $('#amt');
  const SIG = 'sig 3246eKTqKGB8GAwdfZsYPGWRZggT87…GPW3#CKSZ6nF';
  const B = { buyer: [110, 150], esc: [500, 110], owner: [890, 150] };
  let lastStep = -1;

  const pt = p => route.getPointAtLength(p * routeLen);
  function placeCoin(el, from, to, t, arc = -50) {
    const x = lerp(from[0], to[0], t), y = lerp(from[1], to[1], t) + Math.sin(t * Math.PI) * arc;
    el.setAttribute('cx', x); el.setAttribute('cy', y);
    el.style.opacity = t > 0 && t < 1 ? 1 : 0;
  }

  let storyTop = 0, storyTotal = 1;
  function measure() { storyTop = storyEl.getBoundingClientRect().top + scrollY; storyTotal = storyEl.offsetHeight - innerHeight; }
  function story(y = scrollY) {
    const p = clamp((y - storyTop) / storyTotal);
    const A = clamp(p / .16);                      // coins buyer -> escrow
    const drive = ease(clamp((p - .16) / .54));    // car
    const scan = clamp((p - .7) / .14);            // scan
    const conf = clamp((p - .82) / .1);            // signature
    const pay = clamp((p - .92) / .08);            // payout

    const cp = pt(drive), cq = pt(Math.min(1, drive + .004));
    const ang = Math.atan2(cq.y - cp.y, cq.x - cp.x) * 180 / Math.PI;
    car.setAttribute('transform', `translate(${cp.x} ${cp.y - 14}) rotate(${ang})`);
    routeLit.style.strokeDashoffset = routeLen * (1 - drive);
    routeLit.style.opacity = p > .16 ? 1 : 0;

    coinEls.forEach((c, i) => {
      if (pay > 0) placeCoin(c, B.esc, B.owner, clamp(pay * 1.4 - i * .2), -70);
      else if (A < 1) placeCoin(c, B.buyer, B.esc, clamp(A * 1.5 - i * .25), -70);
      else c.style.opacity = 0;
    });

    linkA.classList.toggle('lit', p > .02);
    linkB.classList.toggle('lit', pay > 0);
    const paid = pay > .5;
    hex.classList.toggle('paid', paid);
    shackle.setAttribute('d', p > .1 ? 'M-8 -6 v-7 a8 8 0 0 1 16 0 v7' : 'M-8 -6 v-7 a8 8 0 0 1 16 0 v-0');
    amt.textContent = paid ? 'Released' : '0.2 SOL';
    amt.classList.toggle('paid', paid);

    beam.setAttribute('opacity', scan > 0 && conf < 1 ? Math.sin(scan * Math.PI) * .7 + .1 : 0);
    beam.setAttribute('transform', `translate(${cp.x + 22} ${cp.y - 16}) rotate(${Math.atan2(470 - cp.y, 880 - cp.x) * 180 / Math.PI}) scale(.55)`);
    beam.style.display = scan > 0 ? '' : 'none';

    sig.textContent = SIG.slice(0, Math.floor(conf * SIG.length));

    const step = p < .16 ? 0 : p < .7 ? 1 : p < .82 ? 2 : p < .92 ? 3 : 4;
    if (step !== lastStep) {
      stepEls.forEach((li, i) => { li.classList.toggle('now', i === step); li.classList.toggle('past', i < step); });
      lastStep = step;
    }
    const status = step === 0 ? 'locked' : step < 4 ? 'moving' : 'done';
    statusTags.forEach(c => c.classList.toggle('on', c.dataset.s === status));
  }

  /* ---------- bars fill once when they scroll into view ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('seen'); io.unobserve(e.target);
  }), { threshold: .4 });
  $$('.mrow').forEach(el => io.observe(el));

  /* ---------- mobile menu ---------- */
  const menuBtn = $('#menuBtn'), navLinks = $('#navLinks');
  const setMenu = open => { navLinks.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('load', () => { measure(); onScroll(); });
  measure(); frame();
})();
