/* ============================================================
   APERTURE — site orchestration
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* -------- content data -------- */
  const F_STOPS = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16'];
  const SECTION_IDS = ['hero', 'studio', 'services', 'work', 'results', 'voices', 'contact'];

  const SERVICES = [
    { n: '01', f: 'f/1.4', t: 'Social Media', d: 'Scroll-stopping content and community management that turns feeds into footfall. We shoot, edit and post like we own the venue.' },
    { n: '02', f: 'f/2', t: 'Content Creation', d: 'Food, drink and space — captured to make people hungry. In-house production built for the platforms your guests actually use.' },
    { n: '03', f: 'f/2.8', t: 'Paid Media', d: 'Social and search ads run by specialist media buyers. Every pound tracked to covers, bookings and revenue — not vanity reach.' },
    { n: '04', f: 'f/4', t: 'Influencer', d: 'The right creators, briefed properly, measured honestly. Partnerships that put your brand in front of the perfect table.' },
    { n: '05', f: 'f/5.6', t: 'Email & CRM', d: 'Lifecycle campaigns that bring guests back. Segmented, automated and written to sound like you — not a template.' },
    { n: '06', f: 'f/8', t: 'SEO', d: 'Get found when hunger strikes. Local and organic search built for "best brunch near me" moments that convert.' },
    { n: '07', f: 'f/11', t: 'Websites', d: 'Conversion-led sites for hospitality brands — built to drive direct bookings and cut the commission you hand to third parties.' },
    { n: '08', f: 'f/16', t: 'Strategy', d: 'The vision behind every frame. Positioning, brand and a commercial plan measured on growth, not applause.' }
  ];

  const SHOTS = [
    { cat: 'Restaurant', name: 'The Copper Table', f: 'f/1.8', cls: 'shot--wide', g: 'linear-gradient(150deg,#c8641f,#3a1410 70%)', spot: 'radial-gradient(70% 80% at 30% 25%, rgba(255,190,110,.9), transparent 60%)' },
    { cat: 'Cocktail Bar', name: 'Midnight & Vine', f: 'f/1.4', cls: 'shot--tall', g: 'linear-gradient(160deg,#5a1b2e,#170a12 70%)', spot: 'radial-gradient(60% 60% at 60% 35%, rgba(232,120,150,.7), transparent 60%)' },
    { cat: 'Boutique Hotel', name: 'The Aster Rooms', f: 'f/2.8', cls: 'shot--sq', g: 'linear-gradient(160deg,#2a4a4a,#0c1618 70%)', spot: 'radial-gradient(70% 70% at 40% 30%, rgba(120,200,190,.6), transparent 60%)' },
    { cat: 'Coffee Brand', name: 'Ember Roasters', f: 'f/2', cls: 'shot--sq', g: 'linear-gradient(160deg,#7a4a22,#20120a 70%)', spot: 'radial-gradient(70% 70% at 55% 35%, rgba(230,170,90,.7), transparent 60%)' },
    { cat: 'Fine Dining', name: 'Larkspur', f: 'f/1.6', cls: 'shot--sq', g: 'linear-gradient(160deg,#3a3f22,#12140a 70%)', spot: 'radial-gradient(70% 70% at 45% 30%, rgba(200,210,120,.6), transparent 60%)' },
    { cat: 'Wine Bar', name: 'Cellar No.9', f: 'f/2.2', cls: 'shot--sq', g: 'linear-gradient(160deg,#4a1420,#160a0e 70%)', spot: 'radial-gradient(70% 70% at 50% 35%, rgba(220,110,120,.6), transparent 60%)' },
    { cat: 'Bakery', name: 'Flour & Ash', f: 'f/3.5', cls: 'shot--wide', g: 'linear-gradient(150deg,#b5852f,#2a1c0c 70%)', spot: 'radial-gradient(70% 80% at 35% 30%, rgba(245,205,120,.85), transparent 60%)' },
    { cat: 'Rooftop', name: 'Altitude Social', f: 'f/2.8', cls: 'shot--sq', g: 'linear-gradient(160deg,#2a3a5a,#0a0f1a 70%)', spot: 'radial-gradient(70% 70% at 55% 30%, rgba(150,180,240,.6), transparent 60%)' }
  ];

  const STATS = [
    { num: 2, suffix: '×', label: 'Revenue grown for a client in months' },
    { num: 340, suffix: '%', label: 'Average uplift in social engagement' },
    { num: 43, suffix: '+', label: 'Five-star reviews from brands' },
    { num: 68, suffix: '%', label: 'More direct bookings, less commission' }
  ];

  const VOICES = [
    { q: 'Their incredible work with our social literally helped us double our revenue in the space of a few months.', who: 'Founder', brand: 'Independent Restaurant Group' },
    { q: 'They started where our last agency finished. No hand-holding — they just knew our market cold.', who: 'Marketing Director', brand: 'Boutique Hotel Collection' },
    { q: 'Bookings are up, the feed finally looks like us, and every campaign comes back with numbers attached.', who: 'Owner', brand: 'City-Centre Cocktail Bar' },
    { q: 'Commercial-first is not just a tagline for these guys. Everything ladders back to covers and revenue.', who: 'Operations Lead', brand: 'Multi-Site Food Brand' }
  ];

  /* -------- small lens SVG for service cards -------- */
  function lensSVG() {
    return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="50" r="44"/>
      <path d="M50 8 L74 24 L78 54 L54 84 L24 74 L20 42 Z"/>
      <circle cx="50" cy="50" r="16"/>
    </svg>`;
  }

  /* ============================================================
     BUILD DYNAMIC CONTENT
     ============================================================ */
  function buildServices() {
    const grid = $('#servicesGrid');
    grid.innerHTML = SERVICES.map(s => `
      <article class="svc reveal">
        <span class="svc__f">${s.f}</span>
        <span class="svc__no">${s.n}</span>
        <div class="svc__lens">${lensSVG()}</div>
        <h3>${s.t}</h3>
        <p>${s.d}</p>
      </article>`).join('');
  }

  function buildGallery() {
    const g = $('#workGallery');
    g.innerHTML = SHOTS.map((s, i) => `
      <figure class="shot ${s.cls}" data-shot="${i}" tabindex="0" role="button" aria-label="Zoom ${s.name}">
        <div class="shot__img" style="background:${s.spot},${s.g};"></div>
        <span class="shot__f">${s.f}</span>
        <figcaption class="shot__meta">
          <span class="shot__cat">${s.cat}</span>
          <span class="shot__name">${s.name}</span>
        </figcaption>
      </figure>`).join('');
  }

  function buildStats() {
    const g = $('#resultsGrid');
    g.innerHTML = STATS.map(s => `
      <div class="stat reveal">
        <div class="stat__num" data-target="${s.num}" data-suffix="${s.suffix}">0${s.suffix}</div>
        <div class="stat__label">${s.label}</div>
      </div>`).join('');
  }

  function buildVoices() {
    const track = $('#voicesTrack');
    const dots = $('#voiceDots');
    track.innerHTML = VOICES.map((v, i) => `
      <blockquote class="voice ${i === 0 ? 'active' : ''}" data-voice="${i}">
        <p class="voice__quote">${v.q}</p>
        <p class="voice__who"><b>${v.who}</b> · ${v.brand}</p>
      </blockquote>`).join('');
    dots.innerHTML = VOICES.map((_, i) => `<i data-dot="${i}" class="${i === 0 ? 'active' : ''}"></i>`).join('');
  }

  function buildTicker() {
    const t = $('#tickerTrack');
    const items = ['Fill tables', 'Sell rooms', 'Grow revenue', 'Build the brand', 'Own the feed', 'Drive direct bookings'];
    const row = items.map(x => `<span>${x} <b>◦</b></span>`).join('');
    t.innerHTML = row + row;
  }

  /* ============================================================
     APERTURE INTRO
     ============================================================ */
  function runIntro() {
    const shutter = $('#shutter');
    const inners = window.Aperture.build('irisBlades');
    const label = $('#shutterLabel');
    const fstop = $('#shutterFstop');
    let done = false;

    const finish = () => {
      if (done) return; done = true;
      clearInterval(cycle);
      window.Aperture.setOpen(inners, 1);
      shutter.style.transition = 'opacity .5s ease';
      shutter.style.opacity = '0';
      setTimeout(() => shutter.classList.add('done'), 500);
      afterIntro();
    };

    if (reduce || !inners.length) {
      shutter.classList.add('done');
      afterIntro();
      return;
    }

    window.Aperture.setOpen(inners, 0); // closed
    let fi = 0;
    const cycle = setInterval(() => {
      fi = (fi + 1) % F_STOPS.length;
      fstop.textContent = 'f / ' + F_STOPS[fi];
    }, 130);

    // Hard safety net: whatever happens with rAF, reveal the site.
    const guard = setTimeout(finish, 3200);

    // brief hold, then iris opens
    setTimeout(() => {
      label.textContent = 'IN FOCUS';
      window.Aperture.animate(inners, 0, 1, 1500, () => {
        clearTimeout(guard);
        finish();
      });
    }, 620);
  }

  function afterIntro() {
    if (document.body.classList.contains('ready')) return;
    document.body.classList.add('ready');
    revealObserve();
    $('#dial') && $('#dial').classList.add('show');
    // trigger hero reveals immediately
    $$('#hero .reveal').forEach(el => el.classList.add('in'));
  }

  /* ============================================================
     APERTURE RING DIAL NAV
     ============================================================ */
  function buildDial() {
    const ticks = $('#dialTicks');
    const cx = 100, cy = 100, r = 86;
    const n = SECTION_IDS.length;
    let html = '';
    for (let i = 0; i < n; i++) {
      const ang = (-90 + (i / n) * 300) * Math.PI / 180; // 300deg arc
      const x = cx + r * Math.cos(ang);
      const y = cy + r * Math.sin(ang);
      const x2 = cx + (r - 8) * Math.cos(ang);
      const y2 = cy + (r - 8) * Math.sin(ang);
      const tx = cx + (r - 18) * Math.cos(ang);
      const ty = cy + (r - 18) * Math.sin(ang);
      html += `<line data-tick="${i}" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      html += `<text data-tick="${i}" x="${tx.toFixed(1)}" y="${(ty + 3).toFixed(1)}" text-anchor="middle">${F_STOPS[i]}</text>`;
    }
    ticks.innerHTML = html;
    $$('#dialTicks [data-tick]').forEach(el => {
      el.addEventListener('click', () => {
        const id = SECTION_IDS[+el.getAttribute('data-tick')];
        const t = document.getElementById(id);
        if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  function setDialActive(i) {
    $$('#dialTicks [data-tick]').forEach(el => {
      el.classList.toggle('active', +el.getAttribute('data-tick') === i);
    });
    const hub = $('#dialHub');
    if (hub) hub.textContent = 'f/' + F_STOPS[i];
    const ring = $('#dialRing');
    if (ring) ring.style.transform = `rotate(${i * 6}deg)`;
    const hf = $('#hudFstop'); if (hf) hf.textContent = 'f/' + F_STOPS[i];
  }

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  let revealIO;
  function revealObserve() {
    if (reduce) { $$('.reveal').forEach(e => e.classList.add('in')); return; }
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
      });
    }, { threshold: 0.14 });
    $$('.reveal').forEach(el => { if (!el.classList.contains('in')) revealIO.observe(el); });
  }

  /* ============================================================
     SECTION TRACKING (dial + counters)
     ============================================================ */
  function sectionTracking() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const i = SECTION_IDS.indexOf(e.target.id);
          if (i >= 0) setDialActive(i);
          if (e.target.id === 'results') runCounters();
        }
      });
    }, { threshold: 0.4 });
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ============================================================
     COUNTERS
     ============================================================ */
  let countersDone = false;
  function runCounters() {
    if (countersDone) return; countersDone = true;
    $$('.stat__num').forEach(el => {
      const target = parseFloat(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      const dur = 1600; const start = performance.now();
      const dec = target % 1 !== 0 ? 1 : 0;
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const e = window.Aperture.easeInOut(p);
        const val = target * e;
        el.textContent = (dec ? val.toFixed(1) : Math.round(val)) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = (dec ? target.toFixed(1) : target) + suffix;
      }
      if (reduce) { el.textContent = target + suffix; return; }
      requestAnimationFrame(step);
    });
  }

  /* ============================================================
     GALLERY ZOOM-THROUGH
     ============================================================ */
  function buildZoomer() {
    const z = document.createElement('div');
    z.className = 'zoomer'; z.id = 'zoomer';
    z.innerHTML = `
      <button class="zoomer__close" aria-label="Close">✕</button>
      <div class="zoomer__stage">
        <div class="zoomer__img" id="zoomImg"></div>
        <div class="zoomer__cap">
          <span class="shot__cat" id="zoomCat"></span>
          <div class="shot__name" id="zoomName"></div>
        </div>
      </div>`;
    document.body.appendChild(z);
    const close = () => z.classList.remove('show');
    z.addEventListener('click', (e) => { if (e.target === z || e.target.closest('.zoomer__close')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return z;
  }

  function wireGallery() {
    const z = buildZoomer();
    function open(i) {
      const s = SHOTS[i];
      $('#zoomImg').style.background = `${s.spot},${s.g}`;
      $('#zoomCat').textContent = s.cat;
      $('#zoomName').textContent = s.name;
      z.classList.add('show');
    }
    $$('.shot').forEach(shot => {
      const i = +shot.getAttribute('data-shot');
      shot.addEventListener('click', () => open(i));
      shot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
  }

  /* ============================================================
     VOICES CAROUSEL
     ============================================================ */
  function wireVoices() {
    let idx = 0; const n = VOICES.length; let timer;
    const show = (i) => {
      idx = (i + n) % n;
      $$('.voice').forEach(v => v.classList.toggle('active', +v.getAttribute('data-voice') === idx));
      $$('#voiceDots i').forEach(d => d.classList.toggle('active', +d.getAttribute('data-dot') === idx));
    };
    const auto = () => { if (reduce) return; clearInterval(timer); timer = setInterval(() => show(idx + 1), 6000); };
    $('#voiceNext').addEventListener('click', () => { show(idx + 1); auto(); });
    $('#voicePrev').addEventListener('click', () => { show(idx - 1); auto(); });
    $$('#voiceDots i').forEach(d => d.addEventListener('click', () => { show(+d.getAttribute('data-dot')); auto(); }));
    auto();
  }

  /* ============================================================
     NAV / BURGER / SCROLL STATE
     ============================================================ */
  function wireNav() {
    const nav = $('#nav');
    const burger = $('#burger');
    const links = $('#navLinks');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    }));
    $$('a[data-noop]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  }

  /* ============================================================
     PARALLAX (hero)
     ============================================================ */
  function wireParallax() {
    if (reduce) return;
    const els = $$('[data-parallax]');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        els.forEach(el => {
          const s = parseFloat(el.getAttribute('data-parallax'));
          el.style.transform = `translate3d(0, ${y * s}px, 0)`;
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // hero mouse tilt
    const hero = $('#hero'); const bg = $('.hero__bg');
    if (hero && bg) {
      hero.addEventListener('mousemove', (e) => {
        const rx = (e.clientX / window.innerWidth - 0.5) * 18;
        const ry = (e.clientY / window.innerHeight - 0.5) * 18;
        bg.style.transform = `translate3d(${-rx}px, ${-ry + window.scrollY * 0.18}px, 0)`;
      });
    }
  }

  /* ============================================================
     FOCUS RETICLE CURSOR
     ============================================================ */
  function wireReticle() {
    if (window.matchMedia('(hover:none)').matches || window.innerWidth < 820) return;
    const r = $('#reticle');
    if (!r) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      r.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    const hot = 'a,button,.shot,input,textarea,.voices__dots i,[data-tick]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hot)) r.classList.add('hot');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hot)) r.classList.remove('hot');
    });
  }

  /* ============================================================
     CONTACT FORM
     ============================================================ */
  function wireForm() {
    const form = $('#contactForm');
    const note = $('#formNote');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#cf-name').value.trim();
      const email = $('#cf-email').value.trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        note.textContent = '✕ Add your name and a valid email so we can reply.';
        note.style.color = '#e88'; return;
      }
      note.style.color = 'var(--gold)';
      note.textContent = `Thanks ${name.split(' ')[0]} — brief received. We'll be in touch to bring it into focus.`;
      form.reset();
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    $('#year').textContent = new Date().getFullYear();
    buildTicker();
    buildServices();
    buildGallery();
    buildStats();
    buildVoices();
    buildDial();
    wireNav();
    wireGallery();
    wireVoices();
    wireForm();
    wireParallax();
    wireReticle();
    sectionTracking();
    setDialActive(0);
    runIntro();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
