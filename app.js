(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* Urutan foto: 0 = hero, 1..6 = album, 7 = penutup */
  const PHOTOS = [
    { n: 8, pos: '50% 30%', cap: 'Wisuda Sarjana 2026', alt: 'Berliana memegang map ijazah UIN Madura sambil tersenyum di tangga' },
    { n: 7, pos: '50% 48%', cap: 'Sarjana Pendidikan', alt: 'Berliana berpose ceria di dekat lift dengan selempang nama' },
    { n: 4, pos: '50% 34%', cap: 'pose anggun, dikit', alt: 'Berliana berdiri anggun dengan kebaya merah muda dan selempang wisuda' },
    { n: 3, pos: '50% 40%', cap: 'ngaca dulu, biar makin cakep', alt: 'Berliana tersenyum di depan cermin dengan dinding roster oranye' },
    { n: 1, pos: '50% 32%', cap: 'satu aja udah cakep, ini dua', alt: 'Berliana dan pantulannya di kaca sambil memegang buket bunga' },
    { n: 6, pos: '50% 45%', cap: 'naik tangga menuju sukses', alt: 'Berliana berdiri di tangga sambil memegang pegangan' },
    { n: 2, pos: '50% 48%', cap: 'cek kaca: aman, cantik', alt: 'Pantulan Berliana di cermin wastafel' },
    { n: 5, pos: '50% 38%', cap: 'alhamdulillah, akhirnya!', alt: 'Berliana dengan tangan di dada, tersenyum haru' },
  ];
  const small = (p) => `foto/${p.n}-s.jpg`;
  const full = (p) => `foto/${p.n}.jpg`;

  /* =========================================================
     SUARA — dibuat langsung dengan Web Audio (tanpa file, tanpa loading)
     ========================================================= */
  const Sound = (() => {
    let ctx = null;
    let on = true;
    const ensure = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    };
    const tone = (freq, dur, type, vol, when, slideTo) => {
      if (!on) return;
      const c = ensure();
      if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    };
    let lastTick = 0;
    return {
      unlock: ensure,
      pop() { tone(420, 0.14, 'sine', 0.2, 0, 1100); },
      boing() { tone(180, 0.32, 'triangle', 0.18, 0, 520); },
      chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.55, 'sine', 0.1, i * 0.085)); },
      whoosh() { tone(900, 0.28, 'triangle', 0.07, 0, 260); },
      tick() {
        const now = performance.now();
        if (now - lastTick < 90) return;
        lastTick = now;
        tone(rnd(1400, 2200), 0.07, 'sine', 0.035);
      },
      toggle() { on = !on; return on; },
    };
  })();

  /* =========================================================
     FX — satu kanvas untuk konfeti, toga, hati, kilau.
     Loop berhenti sendiri kalau tidak ada partikel (hemat baterai).
     ========================================================= */
  const FX = (() => {
    const cv = $('#fx');
    const cx = cv.getContext('2d');
    const COLORS = ['#a3305d', '#e9b7c3', '#6e1630', '#f7c9a0', '#e2793f', '#d9a441', '#d48ea2'];
    const MAX = REDUCE ? 80 : 420;
    let W = 0, H = 0;
    let parts = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const scale = (n) => Math.max(1, Math.round(REDUCE ? n * 0.25 : n));

    const add = (p) => {
      if (parts.length >= MAX) return;
      p.life = 0;
      p.rot = p.rot ?? rnd(0, Math.PI * 2);
      p.vr = p.vr ?? rnd(-0.12, 0.12);
      p.flip = rnd(0, Math.PI * 2);
      p.flipV = rnd(0.08, 0.2);
      parts.push(p);
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const heartPath = (s) => {
      cx.beginPath();
      cx.moveTo(0, s * 0.3);
      cx.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.95, 0, -s * 0.45);
      cx.bezierCurveTo(s * 0.45, -s * 0.95, s * 0.9, -s * 0.25, 0, s * 0.3);
      cx.closePath();
    };
    const sparklePath = (s) => {
      cx.beginPath();
      cx.moveTo(0, -s);
      cx.quadraticCurveTo(0, 0, s, 0);
      cx.quadraticCurveTo(0, 0, 0, s);
      cx.quadraticCurveTo(0, 0, -s, 0);
      cx.quadraticCurveTo(0, 0, 0, -s);
      cx.closePath();
    };
    const drawCap = (s) => {
      // badan topi
      cx.fillStyle = '#a3305d';
      cx.beginPath();
      cx.moveTo(-s * 0.3, s * 0.02);
      cx.lineTo(-s * 0.3, s * 0.3);
      cx.quadraticCurveTo(0, s * 0.48, s * 0.3, s * 0.3);
      cx.lineTo(s * 0.3, s * 0.02);
      cx.closePath();
      cx.fill();
      // papan atas
      cx.fillStyle = '#6e1630';
      cx.beginPath();
      cx.moveTo(-s * 0.62, 0);
      cx.lineTo(0, -s * 0.27);
      cx.lineTo(s * 0.62, 0);
      cx.lineTo(0, s * 0.27);
      cx.closePath();
      cx.fill();
      // rumbai
      cx.strokeStyle = '#d9a441';
      cx.lineWidth = Math.max(1.5, s * 0.05);
      cx.lineCap = 'round';
      cx.beginPath();
      cx.moveTo(0, 0);
      cx.lineTo(s * 0.46, s * 0.08);
      cx.lineTo(s * 0.46, s * 0.42);
      cx.stroke();
      cx.fillStyle = '#d9a441';
      cx.fillRect(s * 0.4, s * 0.4, s * 0.12, s * 0.16);
    };

    const tick = (now) => {
      const dt = Math.min(now - last, 34) / 16.667;
      last = now;
      cx.clearRect(0, 0, W, H);

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.vx *= Math.pow(p.drag, dt);
        p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        if (p.sway) p.vx += Math.sin((p.life + p.flip * 10) * 0.08) * p.sway * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.flip += p.flipV * dt;

        const out = p.y > H + 80 || p.y < -H * 1.5 || p.x < -120 || p.x > W + 120;
        if (p.life > p.ttl || out) {
          parts[i] = parts[parts.length - 1];
          parts.pop();
          continue;
        }

        const fadeStart = p.ttl * 0.75;
        const alpha = p.life > fadeStart ? 1 - (p.life - fadeStart) / (p.ttl - fadeStart) : 1;
        cx.globalAlpha = Math.max(0, alpha);
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.rot);
        const s = p.size;
        switch (p.shape) {
          case 'rect':
            cx.scale(1, Math.cos(p.flip));
            cx.fillStyle = p.color;
            cx.fillRect(-s / 2, -s / 4, s, s / 2);
            break;
          case 'dot':
            cx.fillStyle = p.color;
            cx.beginPath();
            cx.arc(0, 0, s / 2, 0, Math.PI * 2);
            cx.fill();
            break;
          case 'heart':
            cx.fillStyle = p.color;
            heartPath(s);
            cx.fill();
            break;
          case 'spark':
            cx.fillStyle = p.color;
            sparklePath(s * (0.75 + 0.25 * Math.sin(p.flip * 2)));
            cx.fill();
            break;
          case 'cap':
            drawCap(s);
            break;
        }
        cx.restore();
      }
      cx.globalAlpha = 1;

      if (parts.length) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        cx.clearRect(0, 0, W, H);
      }
    };

    const confettiPiece = (x, y, vx, vy) => add({
      x, y, vx, vy,
      g: 0.22, drag: 0.985, sway: 0.04,
      size: rnd(7, 13), color: pick(COLORS),
      shape: Math.random() < 0.72 ? 'rect' : 'dot',
      ttl: rnd(150, 230),
    });

    return {
      burst(x, y, n = 80, power = 1) {
        for (let i = 0; i < scale(n); i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(4, 13) * power;
          confettiPiece(x, y, Math.cos(a) * sp, Math.sin(a) * sp - rnd(3, 6));
        }
      },
      rain(n = 120) {
        for (let i = 0; i < scale(n); i++) {
          confettiPiece(rnd(0, W), rnd(-H * 0.6, -10), rnd(-1.5, 1.5), rnd(1, 4));
        }
      },
      cannons(n = 70) {
        for (let i = 0; i < scale(n); i++) {
          const left = i % 2 === 0;
          confettiPiece(left ? -10 : W + 10, H * rnd(0.55, 0.85),
            (left ? 1 : -1) * rnd(6, 15), -rnd(10, 19));
        }
      },
      caps(x, y, n = 4) {
        for (let i = 0; i < scale(n); i++) {
          add({
            x: x + rnd(-14, 14), y,
            vx: rnd(-6.5, 6.5), vy: -rnd(13, 21),
            g: 0.42, drag: 0.992,
            size: rnd(30, 46), shape: 'cap',
            vr: rnd(-0.18, 0.18), rot: rnd(-0.4, 0.4),
            ttl: 170,
          });
        }
      },
      hearts(x, y, n = 8) {
        for (let i = 0; i < scale(n); i++) {
          add({
            x: x + rnd(-10, 10), y: y + rnd(-6, 6),
            vx: rnd(-2.6, 2.6), vy: -rnd(2.5, 6),
            g: 0.05, drag: 0.975, sway: 0.03,
            size: rnd(10, 20), color: pick(['#a3305d', '#d48ea2', '#e9b7c3', '#6e1630']),
            shape: 'heart', vr: rnd(-0.04, 0.04), rot: rnd(-0.3, 0.3),
            ttl: rnd(70, 110),
          });
        }
      },
      sparks(x, y, n = 6) {
        for (let i = 0; i < scale(n); i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(1.5, 4.5);
          add({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            g: 0.02, drag: 0.93,
            size: rnd(5, 10), color: pick(['#d9a441', '#f7c9a0', '#e9b7c3']),
            shape: 'spark', vr: 0, rot: 0,
            ttl: rnd(35, 60),
          });
        }
      },
    };
  })();

  const centerOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const pointFrom = (e, el) => (e && e.detail !== 0 && typeof e.clientX === 'number' && (e.clientX || e.clientY))
    ? { x: e.clientX, y: e.clientY }
    : centerOf(el);

  /* =========================================================
     TOAST
     ========================================================= */
  const toastEl = $('#toast');
  let toastT = 0;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  /* =========================================================
     COVER → buka amplop
     ========================================================= */
  const html = document.documentElement;
  const cover = $('#cover');
  const envelope = $('#envelope');
  const main = $('#main');
  const hero = $('#hero');
  const soundBtn = $('#soundBtn');
  let opened = false;

  const openLetter = () => {
    if (opened) return;
    opened = true;
    Sound.unlock();
    Sound.pop();
    const coverToga = $('.cover-toga .toga', cover);
    if (coverToga) coverToga.classList.add('happy');
    cover.classList.add('opening');

    setTimeout(() => {
      Sound.chime();
      const r = envelope.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height * 0.15, 110, 1.1);
      FX.caps(r.left + r.width / 2, r.top + r.height * 0.3, 5);
    }, 850);

    setTimeout(() => {
      window.scrollTo(0, 0);
      html.classList.remove('locked');
      main.inert = false;
      main.removeAttribute('inert');
      cover.classList.add('leaving');
      soundBtn.hidden = false;
      startMain();
    }, 1700);

    setTimeout(() => { cover.hidden = true; }, 2400);
  };
  envelope.addEventListener('click', openLetter);

  soundBtn.addEventListener('click', () => {
    const on = Sound.toggle();
    soundBtn.classList.toggle('muted', !on);
    soundBtn.setAttribute('aria-label', on ? 'Matikan suara' : 'Nyalakan suara');
    if (on) Sound.pop();
  });

  /* =========================================================
     ISI UTAMA
     ========================================================= */
  const buildGrid = () => {
    const grid = $('#grid');
    const tilt = [-3, 2.5, -1.5, 3, -2.5, 1.8];
    const frag = document.createDocumentFragment();
    PHOTOS.slice(1, 7).forEach((p, k) => {
      const idx = k + 1;
      const wrap = document.createElement('div');
      wrap.className = 'pol';
      wrap.style.setProperty('--d', `${(k % 2) * 110}ms`);
      wrap.innerHTML =
        `<button class="polaroid${k % 3 === 0 ? ' tape' : ''}" type="button" style="--r:${tilt[k]}deg" aria-label="Buka foto: ${p.cap}">` +
          `<img src="${small(p)}" srcset="${small(p)} 560w, ${full(p)} 1200w" sizes="(min-width: 720px) 280px, 44vw" ` +
          `width="560" height="700" loading="lazy" decoding="async" alt="${p.alt}" style="--pos:${p.pos}">` +
          `<span class="cap hand">${p.cap}</span>` +
        `</button>`;
      wrap.firstElementChild.addEventListener('click', (e) => openLightbox(idx, e.currentTarget));
      frag.appendChild(wrap);
    });
    grid.appendChild(frag);
  };
  buildGrid();

  let ioStarted = false;
  const startObserver = () => {
    if (ioStarted) return;
    ioStarted = true;
    const targets = $$('.reveal, .pol, .line, #finale');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }
    let lineDelay = 0;
    let lineTimer = 0;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        if (el.classList.contains('line')) {
          // baris surat muncul satu per satu, berurutan
          el.style.transitionDelay = `${lineDelay}ms`;
          lineDelay += 260;
          clearTimeout(lineTimer);
          lineTimer = setTimeout(() => { lineDelay = 0; }, 400);
          el.classList.add('in');
          if (el.id === 'sign') {
            setTimeout(() => {
              const c = centerOf(el);
              FX.hearts(c.x + 30, c.y, 10);
              Sound.pop();
            }, parseInt(el.style.transitionDelay, 10) + 450);
          }
        } else if (el.id === 'finale') {
          FX.rain(90);
        } else {
          el.classList.add('in');
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  };

  function startMain() {
    hero.classList.add('go');
    setTimeout(() => {
      hero.classList.add('shake');
      Sound.boing();
      const st = $('.stamp', hero);
      const c = centerOf(st);
      FX.sparks(c.x, c.y, 10);
    }, 1500);
    hero.addEventListener('animationend', (e) => {
      if (e.animationName === 'shake') hero.classList.remove('shake');
    });
    setTimeout(() => FX.cannons(80), 400);
    startObserver();
  }

  /* --- Foto hero & penutup: ketuk = hujan hati --- */
  $$('.tap-love').forEach((el) => {
    el.addEventListener('click', (e) => {
      const p = pointFrom(e, el);
      FX.hearts(p.x, p.y, 12);
      Sound.pop();
      if (el.animate && !REDUCE) {
        const r = parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0;
        el.animate(
          [
            { transform: `rotate(${r}deg) scale(1)` },
            { transform: `rotate(${-r}deg) scale(1.04)` },
            { transform: `rotate(${r}deg) scale(1)` },
          ],
          { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        );
      }
    });
  });

  /* --- Lempar toga --- */
  const capBtn = $('#capBtn');
  const tossCount = $('#tossCount');
  const capFace = $('.toga', capBtn);
  const MILESTONES = {
    5: 'wih, mulai seru nih!',
    10: 'sepuluh! semangat amat',
    25: 'tangannya nggak pegel?',
    50: 'oke, kamu juara lempar toga se-Madura',
    100: 'seratus! si Toga minta istirahat dulu',
  };
  let tosses = 0;
  let faceT = 0;
  capBtn.addEventListener('click', () => {
    tosses += 1;
    capFace.classList.add('happy');
    clearTimeout(faceT);
    faceT = setTimeout(() => capFace.classList.remove('happy'), 650);
    const c = centerOf(capBtn);
    FX.caps(c.x, c.y - 20, tosses % 5 === 0 ? 7 : 3);
    FX.burst(c.x, c.y - 30, 26, 0.7);
    Sound.whoosh();
    setTimeout(() => Sound.pop(), 90);

    const m = MILESTONES[tosses];
    if (m) {
      FX.cannons(70);
      Sound.chime();
    }
    tossCount.textContent = m
      ? `${tosses} toga, ${m}`
      : tosses === 1 ? 'wiii~ 1 toga terbang! lagi dong' : `${tosses} toga udah terbang`;
    tossCount.classList.remove('bump');
    void tossCount.offsetWidth;
    tossCount.classList.add('bump');

    if (capBtn.animate && !REDUCE) {
      capBtn.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(.86, .8)' },
          { transform: 'scale(1.08, 1.12) translateY(-8px)' },
          { transform: 'scale(1)' },
        ],
        { duration: 420, easing: 'ease-out' }
      );
    }
  });

  /* =========================================================
     PECAHIN BALON
     ========================================================= */
  (() => {
    const FACTS = [
      ['Revisi', 'udah nggak keitung', '#a3305d'],
      ['Begadang', 'jadi rutinitas', '#e2793f'],
      ['Kopi', 'sahabat paling setia', '#d9a441'],
      ['Deg-degan sidang', 'level dewa', '#d48ea2'],
      ['Kata nyerah', 'nggak ada di kamus', '#6e1630'],
      ['Hasilnya', 'S.Pd, dong!', '#c25b84'],
    ];
    const wrap = $('#balloons');
    const done = $('#blDone');
    const svg = '<svg viewBox="0 0 80 150" aria-hidden="true">' +
      '<path d="M40 92q-9 14 0 28t0 28" fill="none" stroke="#b9a0a7" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M35 84h10l-5 9z" fill="currentColor"/>' +
      '<ellipse cx="40" cy="44" rx="34" ry="41" fill="currentColor"/>' +
      '<ellipse cx="27" cy="27" rx="7" ry="12" fill="#fff" opacity=".35" transform="rotate(-25 27 27)"/>' +
      '<text x="40" y="54" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="30" fill="#fff" opacity=".9">?</text>' +
      '</svg>';
    let popped = 0;
    FACTS.forEach(([title, text, color], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bl';
      b.setAttribute('aria-label', `Pecahkan balon ke-${i + 1}`);
      b.style.setProperty('--c', color);
      b.style.setProperty('--d', `${(-i * 0.55).toFixed(2)}s`);
      b.style.setProperty('--rot', `${i % 2 ? 3 : -3}deg`);
      b.innerHTML = `<span class="bl-body">${svg}</span><span class="bl-fact"><b>${title}</b>${text}</span>`;
      b.addEventListener('click', () => {
        if (b.classList.contains('popped')) return;
        const c = centerOf($('.bl-body', b));
        b.classList.add('popped');
        b.setAttribute('aria-label', `${title}: ${text}`);
        Sound.pop();
        FX.burst(c.x, c.y - 10, 28, 0.6);
        FX.sparks(c.x, c.y - 10, 6);
        popped += 1;
        if (popped === FACTS.length) {
          setTimeout(() => {
            done.textContent = 'Semua balon pecah! Sama kayak drama skripsi: udah kelar semua.';
            done.classList.add('show');
            FX.cannons(90);
            Sound.chime();
          }, 450);
        } else {
          done.textContent = `${popped} dari ${FACTS.length} balon pecah`;
        }
      });
      wrap.appendChild(b);
    });
  })();

  /* =========================================================
     LIGHTBOX
     ========================================================= */
  const lb = $('#lb');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  const lbCount = $('#lbCount');
  const lbClose = $('.lb-close', lb);
  lbImg.draggable = false;
  let cur = 0;
  let opener = null;
  let lbTimer = 0;

  const showPhoto = (i) => {
    cur = (i + PHOTOS.length) % PHOTOS.length;
    const p = PHOTOS[cur];
    const want = cur;
    lbImg.src = small(p);
    lbImg.alt = p.alt;
    lbCap.textContent = p.cap;
    lbCount.textContent = `${cur + 1} / ${PHOTOS.length}`;
    const hi = new Image();
    hi.onload = () => { if (cur === want && !lb.hidden) lbImg.src = full(p); };
    hi.src = full(p);
    // siapkan foto sebelah supaya geser terasa instan
    [cur + 1, cur - 1].forEach((j) => {
      const q = PHOTOS[(j + PHOTOS.length) % PHOTOS.length];
      const pre = new Image();
      pre.src = small(q);
    });
  };

  function openLightbox(i, from) {
    clearTimeout(lbTimer);
    opener = from || null;
    showPhoto(i);
    lb.hidden = false;
    html.classList.add('noscroll');
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('show')));
    Sound.pop();
    lbClose.focus({ preventScroll: true });
  }
  const closeLightbox = () => {
    if (lb.hidden) return;
    lb.classList.remove('show');
    html.classList.remove('noscroll');
    clearTimeout(lbTimer);
    lbTimer = setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 260);
    if (opener) opener.focus({ preventScroll: true });
  };
  const step = (d) => { showPhoto(cur + d); Sound.tick(); };

  lbClose.addEventListener('click', closeLightbox);
  $('.lb-nav.prev', lb).addEventListener('click', () => step(-1));
  $('.lb-nav.next', lb).addEventListener('click', () => step(1));

  let sx = 0, sy = 0, swiping = false, swiped = false;
  lb.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    sx = e.clientX; sy = e.clientY; swiping = true; swiped = false;
  });
  lb.addEventListener('pointerup', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      swiped = true;
      closeLightbox();
    }
  });
  lb.addEventListener('pointercancel', () => { swiping = false; });
  lb.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {
      // jaga fokus tetap di dalam lightbox
      const f = $$('button', lb);
      const first = f[0], lastB = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastB.focus(); }
      else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); first.focus(); }
    }
  });

  /* =========================================================
     KARTU GOSOK
     ========================================================= */
  (() => {
    const box = $('#scratch');
    const cv = $('#scratchCv');
    const c = cv.getContext('2d', { willReadFrequently: true });
    const revealBtn = $('#revealBtn');
    let w = 0, h = 0, dpr = 1;
    let done = false, down = false, last = null, moves = 0, painted = false;

    const paint = () => {
      w = box.clientWidth;
      h = box.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = 'source-over';
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#e9b7c3');
      g.addColorStop(0.55, '#f7c9a0');
      g.addColorStop(1, '#e0ad5a');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      // titik-titik kilau
      for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(255,255,255,${rnd(0.25, 0.6).toFixed(2)})`;
        c.beginPath();
        c.arc(rnd(0, w), rnd(0, h), rnd(0.8, 2.4), 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#6e1630';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '700 30px Caveat, "Segoe Print", cursive';
      c.fillText('gosok di sini', w / 2, h / 2 - 8);
      c.font = '800 12px Nunito, system-ui, sans-serif';
      c.fillStyle = 'rgba(110,22,48,.7)';
      c.fillText('PAKAI JARI ATAU MOUSE', w / 2, h / 2 + 22);
      painted = true;
    };

    const reveal = () => {
      if (done) return;
      done = true;
      box.classList.add('done');
      const r = box.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 70, 0.9);
      FX.hearts(r.left + r.width / 2, r.top + 20, 8);
      Sound.chime();
    };

    const progress = () => {
      const sw = cv.width, sh = cv.height;
      if (!sw || !sh) return 0;
      const data = c.getImageData(0, 0, sw, sh).data;
      const stepPx = 12;
      let clear = 0, total = 0;
      for (let y = 0; y < sh; y += stepPx) {
        for (let x = 0; x < sw; x += stepPx) {
          total++;
          if (data[(y * sw + x) * 4 + 3] < 100) clear++;
        }
      }
      return total ? clear / total : 0;
    };

    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const scratchTo = (p) => {
      c.globalCompositeOperation = 'destination-out';
      c.lineWidth = 40;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      if (last) c.moveTo(last.x, last.y);
      else c.moveTo(p.x - 0.1, p.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
    };

    cv.addEventListener('pointerdown', (e) => {
      if (done) return;
      if (!painted) paint();
      down = true;
      last = null;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
      Sound.unlock();
      scratchTo(pos(e));
      e.preventDefault();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!down || done) return;
      const p = pos(e);
      scratchTo(p);
      Sound.tick();
      if (Math.random() < 0.18) FX.sparks(e.clientX, e.clientY, 2);
      if (++moves % 10 === 0 && progress() > 0.5) reveal();
    });
    const end = () => {
      if (!down) return;
      down = false;
      last = null;
      if (!done && progress() > 0.5) reveal();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('lostpointercapture', end);
    revealBtn.addEventListener('click', reveal);

    // Gambar ulang hanya bila lebar berubah (bukan saat address bar HP naik-turun)
    let lastW = 0;
    const maybeRepaint = () => {
      if (done) return;
      const nw = box.clientWidth;
      if (nw && nw !== lastW) { lastW = nw; paint(); }
    };
    maybeRepaint();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!done && !moves) { lastW = 0; maybeRepaint(); } });
    }
    let rT = 0;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(maybeRepaint, 150); }, { passive: true });
  })();

  /* =========================================================
     PENUTUP
     ========================================================= */
  $('#partyBtn').addEventListener('click', () => {
    FX.cannons(110);
    FX.rain(60);
    const c = centerOf($('#partyBtn'));
    FX.caps(c.x, c.y, 4);
    Sound.chime();
  });

  $('#shareBtn').addEventListener('click', async () => {
    const data = {
      title: document.title,
      text: 'Happy graduation, Berliana! Ada surat kecil di sini, buka deh.',
      url: location.href.split('#')[0],
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // dibatalkan pengguna
        // browser bawaan aplikasi (mis. Instagram) kadang menolak: lanjut salin link
      }
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(data.url);
        toast('Link sudah disalin');
        return;
      }
    } catch (e) { /* lanjut ke cara lama */ }
    // cara lama untuk WebView yang tidak mendukung Clipboard API
    const ta = document.createElement('textarea');
    ta.value = data.url;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, data.url.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
    ta.remove();
    toast(copied ? 'Link sudah disalin' : 'Link: wisuda.bisnispamekasan.biz.id');
  });
})();
