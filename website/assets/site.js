/* BAYK site behaviour.
   Everything you are likely to change lives in CONFIG. Leave a price as null and the
   site shows a [£] placeholder in its place. */
const CONFIG = {
  // [CONFIRM] Weekly order cut-off in UK time. weekday: 0 = Sunday, 1 = Monday ... 5 = Friday, 6 = Saturday.
  cutoff: { weekday: 5, hour: 18, minute: 0 },
  deliveryWeekday: 1, // Monday
  prices: {
    weeklyPerMeal: null, // BAYK Weekly, per meal
    privateFromPerHead: null, // Private dining, lowest per-head price
    kitchenPerMonth: null, // BAYK Kitchen membership
  },
  // Paste a form endpoint (for example Formspree) to make enquiries send. null = show a copyable email instead.
  formEndpoint: null,
  // Paste your newsletter provider's form endpoint. null = show a fallback message.
  newsletterEndpoint: null,
  contactEmail: "cameron@thody.me",
};

(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
  const money = (v) => (v == null ? "[£]" : gbp.format(v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------------------------------------------------------- Dates in UK time */
  const TZ = "Europe/London";
  function tzOffset(date) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(date).map((p) => [p.type, p.value])
    );
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return asUTC - Math.floor(date.getTime() / 1000) * 1000;
  }
  function ukWallToInstant(y, m, d, h, min) {
    const guess = Date.UTC(y, m, d, h, min);
    return new Date(guess - tzOffset(new Date(guess)));
  }
  function serviceDates(now = new Date()) {
    const wall = new Date(now.getTime() + tzOffset(now));
    for (let i = 0; i < 8; i++) {
      const day = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + i));
      if (day.getUTCDay() !== CONFIG.cutoff.weekday) continue;
      const cutoff = ukWallToInstant(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), CONFIG.cutoff.hour, CONFIG.cutoff.minute);
      if (cutoff <= now) continue;
      let delivery = day;
      for (let j = 1; j <= 7; j++) {
        delivery = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + j));
        if (delivery.getUTCDay() === CONFIG.deliveryWeekday) break;
      }
      return { cutoff, cutoffDay: day, delivery };
    }
    return null;
  }
  const fmt = (opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts });
  const longDate = (d) => fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);
  const ticketDate = (d) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d).replace(",", "");
  const pad = (n) => String(n).padStart(2, "0");
  const cutoffTime = `${pad(CONFIG.cutoff.hour)}:${pad(CONFIG.cutoff.minute)}`;

  let service = serviceDates();
  function renderService() {
    if (!service) return;
    $$("[data-delivery-short]").forEach((el) => (el.textContent = ticketDate(service.delivery)));
    $$("[data-cutoff-short]").forEach((el) => (el.textContent = `${ticketDate(service.cutoffDay)}, ${cutoffTime}`));
  }
  function tick() {
    const now = new Date();
    if (!service || now >= service.cutoff) { service = serviceDates(now); renderService(); }
    if (!service) return;
    let s = Math.max(0, Math.floor((service.cutoff - now) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const text = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    $$("[data-countdown]").forEach((el) => (el.textContent = text));
  }
  renderService();
  tick();
  setInterval(tick, 1000);

  /* ---------------------------------------------------------------- Prices */
  $$("[data-price]").forEach((el) => {
    const v = CONFIG.prices[el.dataset.price];
    el.textContent = money(v);
    el.classList.toggle("placeholder", v == null);
  });

  /* ---------------------------------------------------------------- Split headings into characters */
  function split(el) {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
            const word = document.createElement("span");
            word.className = "word";
            word.setAttribute("aria-hidden", "true");
            Array.from(part).forEach((ch) => {
              const c = document.createElement("span");
              c.className = "char";
              c.textContent = ch;
              c.style.setProperty("--i", i++);
              word.append(c);
            });
            frag.append(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add("split");
  }
  $$("[data-split]").forEach(split);

  /* Reveal on scroll. Hero items wait for the intro. */
  const heroItems = $$(".hero [data-split], .hero .hero-side, .hero .label");
  const animated = $$("[data-split], .reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    animated.forEach((el) => el.classList.add("is-armed"));
    heroItems.forEach((el) => { if (!el.matches("[data-split]")) el.classList.add("reveal", "is-armed"); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    animated.forEach((el) => { if (!el.closest(".hero")) io.observe(el); });
  }
  const revealHero = () => heroItems.forEach((el, n) => setTimeout(() => el.classList.add("is-in"), n * 140));

  /* ---------------------------------------------------------------- Manifesto: words light up with scroll */
  const scrubEl = $("[data-scrub]");
  let scrubWords = [];
  if (scrubEl) {
    const walk = (node, hot) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = hot ? "w is-hot" : "w";
            w.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child, hot || child.hasAttribute("data-hot"));
        }
      });
    };
    walk(scrubEl, false);
    scrubWords = $$(".w", scrubEl);
    if (reduceMotion) scrubWords.forEach((w) => w.classList.add("is-lit"));
  }
  let litCount = -1;

  /* ---------------------------------------------------------------- Smooth scrolling */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    try { lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true }); } catch (_) { lenis = null; }
  }
  function scrollToTarget(target) {
    if (lenis) { lenis.scrollTo(target, { duration: 1.6 }); return; }
    if (typeof target === "number") window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------------- Menu */
  const menu = $("#menu");
  const menuBtn = $(".menu-btn");
  const menuPreview = $(".menu-preview");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) setTimeout(() => { const a = $("a", menu); if (a) a.focus({ preventScroll: true }); }, 350);
  }
  if (menu) {
    menu.inert = true;
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); } });
    $$("a[data-img]", menu).forEach((a) => {
      const show = () => { if (menuPreview && menuPreview.getAttribute("src") !== a.dataset.img) menuPreview.src = a.dataset.img; };
      a.addEventListener("pointerenter", show);
      a.addEventListener("focus", show);
    });
  }

  /* In-page links scroll smoothly and close the menu */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target == null) return;
      e.preventDefault();
      const wasOpen = menu && menu.classList.contains("is-open");
      if (wasOpen) setMenu(false);
      setTimeout(() => scrollToTarget(target), wasOpen ? 250 : 0);
      if (id !== "#top") history.replaceState(null, "", id);
    });
  });

  /* ---------------------------------------------------------------- Pointer, cursor and hover effects */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight * 0.4, last: -1e9, down: false };
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.last = performance.now(); }, { passive: true });
  window.addEventListener("pointerdown", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.last = performance.now(); pointer.down = true; }, { passive: true });
  window.addEventListener("pointerup", () => { pointer.down = false; }, { passive: true });

  const hint = $("[data-hint]");
  if (hint && !finePointer) hint.textContent = "Touch to stir the embers";

  const cursor = $(".cursor");
  const cursorDot = $(".cursor-dot");
  const cursorRing = $(".cursor-ring");
  const cursorLabel = $(".cursor-label");
  const ringPos = { x: pointer.x, y: pointer.y };
  const useCursor = finePointer && !reduceMotion && cursor;
  if (useCursor) {
    root.classList.add("has-cursor");
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], [data-cursor-hover], a, button, label");
      const label = t && t.dataset.cursor;
      cursor.classList.toggle("is-label", !!label);
      cursor.classList.toggle("is-hover", !!t && !label);
      cursorLabel.textContent = label || "";
    });
    document.addEventListener("pointerleave", () => { cursor.style.opacity = "0"; });
    document.addEventListener("pointerenter", () => { cursor.style.opacity = "1"; });
  }

  /* Buttons that lean towards the pointer */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1), color .4s cubic-bezier(.16,1,.3,1), border-color .4s cubic-bezier(.16,1,.3,1)";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* Image that follows the pointer over Journal rows */
  const floatImg = $(".float-img");
  const floatPos = { x: 0, y: 0 };
  if (floatImg && finePointer && !reduceMotion) {
    $$("[data-float]").forEach((a) => {
      a.addEventListener("pointerenter", () => {
        if (floatImg.getAttribute("src") !== a.dataset.float) floatImg.src = a.dataset.float;
        floatImg.classList.add("is-on");
      });
      a.addEventListener("pointerleave", () => floatImg.classList.remove("is-on"));
    });
  }

  /* Hero headline letters stretch towards the pointer */
  const lensChars = finePointer && !reduceMotion ? $$("[data-lens] .char") : [];
  let lensCache = [];
  function measureLens() {
    lensCache = lensChars.map((c) => {
      const r = c.getBoundingClientRect();
      return { el: c, x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY, f: 0, em: !!c.closest("em") };
    });
  }

  /* ---------------------------------------------------------------- Gallery, marquee, chapters */
  const gallery = $("[data-gallery]");
  const galleryTrack = $("[data-gallery-track]");
  const galleryBg = $("[data-gallery-bg]");
  const dishFrames = $$(".dish-frame");
  let galleryDist = 0;
  function measureGallery() {
    if (!gallery || !galleryTrack) return;
    galleryDist = Math.max(0, galleryTrack.scrollWidth - window.innerWidth);
    gallery.style.height = `${window.innerHeight + galleryDist}px`;
  }

  const marquee = $("[data-marquee]");
  let marqueeX = 0;
  let marqueeDir = 1;
  if (marquee) marquee.innerHTML += marquee.innerHTML;

  const isSmall = () => window.innerWidth < 900;
  const chapters = $$("[data-shape]").map((el) => ({
    el,
    shape: +el.dataset.shape,
    x: +(el.dataset.x || 0), y: +(el.dataset.y || 0),
    mx: el.dataset.mx, my: el.dataset.my,
    dim: el.dataset.dim ? +el.dataset.dim : 1,
    no: el.dataset.no, name: el.dataset.name,
    anchor: 0,
  }));
  let maxScroll = 1;
  function measureChapters() {
    const vh = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    chapters.forEach((c, i) => {
      const r = c.el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      c.anchor = i === 0 ? 0 : c.el.classList.contains("contact") ? top : top + r.height / 2 - vh / 2;
      c.anchor = clamp(c.anchor, 0, maxScroll);
    });
  }
  function chapterState(y) {
    let i = 0;
    while (i < chapters.length - 1 && y >= chapters[i + 1].anchor) i++;
    const a = chapters[i];
    const b = chapters[Math.min(i + 1, chapters.length - 1)];
    const span = b.anchor - a.anchor;
    const t = a === b || span <= 0 ? 0 : smooth(0.2, 0.8, (y - a.anchor) / span);
    return { a, b, t };
  }
  const placeOf = (c) => {
    if (!isSmall()) return { x: c.x, y: c.y, dim: c.dim };
    return { x: c.mx != null ? +c.mx : 0, y: c.my != null ? +c.my : c.y, dim: c.dim < 1 ? c.dim * 0.55 : c.dim };
  };

  const hudNo = $("[data-chapter-no]");
  const hudName = $("[data-chapter-name]");
  const hudBar = $("[data-progress-bar]");
  const hudPct = $("[data-progress]");
  let hudChapter = null;

  /* ---------------------------------------------------------------- Plan builder and order ticket */
  const builder = $("#builder");
  const ticket = $(".ticket");
  function readPlan() {
    const data = new FormData(builder);
    return { meals: +data.get("meals"), diet: data.get("diet"), portion: data.get("portion") };
  }
  function renderTicket(flash) {
    if (!builder) return;
    const plan = readPlan();
    const per = CONFIG.prices.weeklyPerMeal;
    $("[data-t-meals]").textContent = `${plan.meals} meals`;
    $("[data-t-diet]").textContent = plan.diet;
    $("[data-t-portion]").textContent = plan.portion;
    const perEl = $("[data-t-per]");
    const totalEl = $("[data-t-total]");
    perEl.textContent = money(per);
    totalEl.textContent = per == null ? "[£]" : gbp.format(per * plan.meals);
    perEl.classList.toggle("placeholder", per == null);
    totalEl.classList.toggle("placeholder", per == null);
    if (flash && ticket && !reduceMotion) {
      ticket.classList.add("is-flash");
      setTimeout(() => ticket.classList.remove("is-flash"), 60);
    }
  }
  function prefill(values) {
    const form = $("#contact-form");
    if (!form) return;
    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements[name];
      if (field && value != null) field.value = value;
    });
  }
  if (builder) {
    builder.addEventListener("change", () => renderTicket(true));
    renderTicket(false);
    $("[data-send-ticket]").addEventListener("click", () => {
      const plan = readPlan();
      const when = service ? longDate(service.delivery) : "the next Monday delivery";
      prefill({
        interest: "BAYK Weekly",
        message: `I'd like to start BAYK Weekly: ${plan.meals} meals a week, ${plan.diet.toLowerCase()}, ${plan.portion.toLowerCase()} portions, starting ${when}.`,
      });
      scrollToTarget($("#contact"));
      setTimeout(() => { const n = $("#c-name"); if (n) n.focus({ preventScroll: true }); }, 1700);
    });
  }
  $$("[data-prefill]").forEach((el) => el.addEventListener("click", () => prefill({ interest: el.dataset.prefill })));

  /* ---------------------------------------------------------------- What's in season (UK, general guidance) */
  const SEASON = [
    ["Blood oranges", "Forced rhubarb", "Leeks", "Celeriac", "Kale", "Jerusalem artichokes"],
    ["Forced rhubarb", "Blood oranges", "Purple sprouting broccoli", "Leeks", "Celeriac", "Cauliflower"],
    ["Purple sprouting broccoli", "Wild garlic", "Forced rhubarb", "Spring greens", "Leeks"],
    ["Asparagus", "Wild garlic", "Jersey Royals", "Radishes", "Spring greens", "Spring lamb"],
    ["Asparagus", "Jersey Royals", "Broad beans", "Rhubarb", "Elderflower", "Spring lamb"],
    ["Strawberries", "Broad beans", "Peas", "Asparagus", "Courgettes", "Gooseberries"],
    ["Tomatoes", "Courgettes", "Cherries", "Raspberries", "Peas", "Runner beans"],
    ["Tomatoes", "Sweetcorn", "Plums", "Blackberries", "Runner beans", "Grouse"],
    ["Plums", "Blackberries", "Apples", "Wild mushrooms", "Sweetcorn", "Partridge"],
    ["Squash", "Apples", "Pears", "Wild mushrooms", "Celeriac", "Pheasant"],
    ["Parsnips", "Celeriac", "Brussels sprouts", "Chestnuts", "Cavolo nero", "Venison"],
    ["Brussels sprouts", "Parsnips", "Chestnuts", "Red cabbage", "Clementines", "Venison"],
  ];
  const seasonChips = $("[data-season-chips]");
  if (seasonChips) {
    const month = new Date(Date.now() + tzOffset(new Date())).getUTCMonth();
    $$("[data-season-month]").forEach((el) => (el.textContent = fmt({ month: "long" }).format(new Date(Date.UTC(2026, month, 1)))));
    seasonChips.replaceChildren(...SEASON[month].map((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      return li;
    }));
  }

  /* ---------------------------------------------------------------- Forms */
  function summarise(form) {
    const lines = [];
    $$("input, select, textarea", form).forEach((f) => {
      if (!f.name || !f.value) return;
      const label = form.querySelector(`label[for="${f.id}"]`);
      lines.push(`${label ? label.textContent.replace(/\s*\(optional\)/i, "") : f.name}: ${f.value}`);
    });
    return lines.join("\n");
  }
  function el(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  }
  function status(form, nodes) {
    let box = $(".form-status", form);
    if (!box) {
      box = el("div", { class: "form-status", role: "status" });
      form.appendChild(box);
    }
    box.replaceChildren(...nodes);
  }
  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const isNewsletter = form.dataset.form === "newsletter";
      const endpoint = isNewsletter ? CONFIG.newsletterEndpoint : CONFIG.formEndpoint;
      const text = summarise(form);
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
          if (!res.ok) throw new Error(String(res.status));
          status(form, [el("p", {}, isNewsletter ? "You're on the list. Look out for the next recipe." : "Thanks. Your request has been sent and you'll get a reply soon.")]);
          form.reset();
          return;
        } catch (_) { /* fall through to the email fallback */ }
      }
      if (isNewsletter) {
        status(form, [el("p", {}, `Sign-up isn't connected yet. Email ${CONFIG.contactEmail} with "Newsletter" and you'll be added.`)]);
        return;
      }
      const pre = el("pre", {}, text);
      const btn = el("button", { type: "button", class: "copy-btn" }, "Copy request");
      btn.addEventListener("click", () => copyText(text, btn, pre));
      status(form, [
        el("p", {}, `This form isn't connected to an inbox yet, so nothing has been sent. Copy your request and email it to ${CONFIG.contactEmail}.`),
        pre,
        btn,
      ]);
    });
  });

  function copyText(text, btn, fallbackNode) {
    const done = () => { const old = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = old), 1600); };
    const select = () => {
      if (!fallbackNode) return;
      const range = document.createRange();
      range.selectNodeContents(fallbackNode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = "Press Ctrl+C to copy";
    };
    try { navigator.clipboard.writeText(text).then(done, select); } catch (_) { select(); }
  }
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.dataset.copy, btn, document.getElementById(btn.dataset.copyTarget)));
  });

  /* ---------------------------------------------------------------- The ember field (WebGL) */
  const SMOKE_FRAG = `
    varying vec2 vUv;
    uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uWarm; uniform float uScroll;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
    void main(){
      float asp = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(asp, 1.0);
      float t = uTime * 0.04;
      vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, -t * 3.0 - uScroll)), fbm(p * 1.4 + vec2(5.2, 1.3) - t * 2.0));
      float s = fbm(p * 2.0 + q * 1.6 + vec2(t, -t * 4.0 - uScroll * 1.5));
      vec2 m = (uMouse - 0.5) * vec2(asp, 1.0);
      float glowB = 1.0 - smoothstep(0.0, 1.25, length((p - vec2(0.0, -0.85)) * vec2(0.7, 1.0)));
      float glowM = 1.0 - smoothstep(0.0, 0.55, length(p - m));
      vec3 col = vec3(0.043, 0.035, 0.031);
      col += vec3(0.62, 0.17, 0.05) * s * s * (0.16 + glowB * 0.85) * uWarm;
      col += vec3(0.9, 0.35, 0.1) * glowM * 0.07 * (0.4 + s);
      float vig = smoothstep(1.3, 0.2, length(p * vec2(0.85, 1.1)));
      col *= 0.55 + 0.45 * vig;
      gl_FragColor = vec4(col, 1.0);
    }`;

  const PARTICLE_VERT = `
    attribute vec3 aT0; attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3; attribute vec3 aT4; attribute vec3 aT5;
    attribute float aSeed; attribute vec3 aRand;
    uniform float uA[6]; uniform float uB[6]; uniform float uMix; uniform float uTime; uniform float uIntro;
    uniform vec3 uMouse; uniform float uForce; uniform vec3 uOffset; uniform float uSize; uniform float uPR;
    uniform float uVel; uniform float uAlpha; uniform float uCalm;
    varying float vHeat; varying float vAlpha;
    void main(){
      float m = clamp((uMix - aSeed * 0.35) / 0.65, 0.0, 1.0);
      m = m * m * (3.0 - 2.0 * m);
      float w0 = mix(uA[0], uB[0], m); float w1 = mix(uA[1], uB[1], m); float w2 = mix(uA[2], uB[2], m);
      float w3 = mix(uA[3], uB[3], m); float w4 = mix(uA[4], uB[4], m); float w5 = mix(uA[5], uB[5], m);
      vec3 p = aT0 * w0 + aT1 * w1 + aT2 * w2 + aT3 * w3 + aT4 * w4 + aT5 * w5;
      float t = uTime;
      float turb = sin(m * 3.14159);

      // Rising embers when scattered
      float sy = mod(aT1.y + t * (0.12 + 0.22 * aSeed) + 4.5, 9.0) - 4.5;
      p.y += w1 * (sy - aT1.y);
      // Flicker when the embers form a flame
      p.x += w4 * sin(t * 3.0 + aSeed * 40.0) * 0.05 * (p.y + 2.0) * 0.5;
      p.y += w4 * fract(t * 0.45 + aSeed * 7.0) * 0.22;

      vec3 n = vec3(
        sin(p.y * 1.3 + t * 0.6 + aRand.x * 6.2831),
        cos(p.x * 1.1 + t * 0.5 + aRand.y * 6.2831),
        sin((p.x + p.y) * 0.9 + t * 0.7 + aRand.z * 6.2831));
      p += n * ((0.02 + turb * 1.1 + uVel * 0.25) * uCalm);

      p = mix(aRand * vec3(7.0, 4.5, 4.0), p, uIntro);
      p += uOffset;

      vec2 dm = p.xy - uMouse.xy;
      float dist = length(dm);
      float f = (1.0 - smoothstep(0.0, 1.5, dist)) * uForce;
      p.xy += normalize(dm + 1e-5) * f * 0.85;
      p.z += f * 0.8;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float flick = 0.5 + 0.5 * sin(t * (2.0 + aSeed * 3.0) + aSeed * 50.0);
      gl_PointSize = uSize * uPR * (0.8 + aRand.y * 0.25 + flick * 0.3) * (7.0 / -mv.z);
      vHeat = clamp(0.16 + aSeed * 0.45 + flick * 0.22 + f * 0.9 + turb * 0.25, 0.0, 1.0);
      vAlpha = uAlpha * (0.35 + 0.65 * flick) * mix(1.0, 1.0 - smoothstep(3.4, 4.5, abs(sy)), w1);
    }`;

  const PARTICLE_FRAG = `
    varying float vHeat; varying float vAlpha;
    vec3 ramp(float h){
      vec3 c1 = vec3(0.45, 0.05, 0.02); vec3 c2 = vec3(1.0, 0.32, 0.08);
      vec3 c3 = vec3(1.0, 0.62, 0.22); vec3 c4 = vec3(1.0, 0.9, 0.68);
      if (h < 0.33) return mix(c1, c2, h / 0.33);
      if (h < 0.66) return mix(c2, c3, (h - 0.33) / 0.33);
      return mix(c3, c4, (h - 0.66) / 0.34);
    }
    void main(){
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float a = 1.0 - smoothstep(0.0, 0.5, d);
      a = a * a;
      gl_FragColor = vec4(ramp(vHeat), a * vAlpha);
    }`;

  const TAU = Math.PI * 2;
  const rnd = () => Math.random();

  function textShape(text, n, width, stretch) {
    const W = 1600;
    const H = 520;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    let size = 420;
    const setFont = () => {
      ctx.font = `900 ${size}px Anybody, "Arial Black", Impact, sans-serif`;
      if ("fontStretch" in ctx) ctx.fontStretch = stretch;
    };
    setFont();
    while (ctx.measureText(text).width > W * 0.94 && size > 40) { size -= 8; setFont(); }
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, H / 2);
    const d = ctx.getImageData(0, 0, W, H).data;
    const pts = [];
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (let y = 0; y < H; y += 3) {
      for (let x = 0; x < W; x += 3) {
        if (d[(y * W + x) * 4 + 3] > 128) {
          pts.push(x, y);
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (pts.length < 20) return scatterShape(n);
    const out = new Float32Array(n * 3);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const s = width / Math.max(1, maxX - minX);
    const count = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rnd() * count) * 2;
      out[i * 3] = (pts[j] - cx + rnd() * 3 - 1.5) * s;
      out[i * 3 + 1] = -(pts[j + 1] - cy + rnd() * 3 - 1.5) * s;
      out[i * 3 + 2] = (rnd() - 0.5) * 0.35;
    }
    return out;
  }
  function scatterShape(n) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      out[i * 3] = (rnd() - 0.5) * 14;
      out[i * 3 + 1] = (rnd() - 0.5) * 9;
      out[i * 3 + 2] = -5 + rnd() * 7;
    }
    return out;
  }
  function tilt(out, i, x, y, z, a, dy = 0) {
    const ca = Math.cos(a), sa = Math.sin(a);
    out[i * 3] = x;
    out[i * 3 + 1] = y * ca - z * sa + dy;
    out[i * 3 + 2] = y * sa + z * ca;
  }
  function ring(out, i, rad, y, spread) {
    const a = rnd() * TAU;
    const r = rad + (rnd() - 0.5) * spread;
    return [Math.cos(a) * r, y + (rnd() - 0.5) * spread * 0.5, Math.sin(a) * r];
  }
  function plateShape(n) {
    // A plate seen from above at an angle: a crisp rim, the edge of the well, faint inner rings and a small heap of food.
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rnd();
      let p;
      if (r < 0.34) p = ring(out, i, 2.1, 0, 0.07);
      else if (r < 0.5) p = ring(out, i, 1.86, -0.03, 0.05);
      else if (r < 0.64) p = ring(out, i, 1.42, -0.1, 0.05);
      else if (r < 0.74) p = ring(out, i, 0.5 + Math.floor(rnd() * 3) * 0.3, -0.12, 0.03);
      else {
        const a = rnd() * TAU;
        const rr = 0.85 * Math.sqrt(rnd());
        p = [Math.cos(a) * rr, -0.1 + (1 - (rr / 0.85) ** 2) * 0.55 * rnd(), Math.sin(a) * rr];
      }
      tilt(out, i, p[0], p[1], p[2], 0.62);
    }
    return out;
  }
  function clocheShape(n) {
    // A serving cloche: the dome drawn as lines of latitude, a rim, the plate beneath and a handle.
    const out = new Float32Array(n * 3);
    const R = 1.75;
    const rings = 11;
    for (let i = 0; i < n; i++) {
      const r = rnd();
      let p;
      if (r < 0.55) {
        const k = Math.floor(Math.pow(rnd(), 0.8) * rings);
        const phi = (k / rings) * (Math.PI / 2);
        const a = rnd() * TAU;
        const rr = Math.cos(phi) * R;
        p = [Math.cos(a) * rr, Math.sin(phi) * R * 0.92 + (rnd() - 0.5) * 0.02, Math.sin(a) * rr];
      } else if (r < 0.66) {
        const u = rnd();
        const k = Math.sqrt(1 - u * u) * R;
        const a = rnd() * TAU;
        p = [Math.cos(a) * k, u * R * 0.92, Math.sin(a) * k];
      } else if (r < 0.9) {
        p = ring(out, i, rnd() < 0.6 ? 2.3 : 1.95, -0.04, 0.06);
      } else {
        const a = rnd() * TAU;
        const b = rnd() * TAU;
        const tube = 0.06;
        const major = 0.22;
        p = [(major + tube * Math.cos(b)) * Math.cos(a), R * 0.92 + 0.2 + tube * Math.sin(b) + (major + tube * Math.cos(b)) * Math.sin(a) * 0.5, 0];
      }
      tilt(out, i, p[0], p[1], p[2], 0.3, -0.75);
    }
    return out;
  }
  function flameShape(n) {
    // A flame: rounded base, pointed tip, tongues that lean, and sparks escaping above.
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.12) {
        out[i * 3] = (rnd() - 0.5) * 1.6;
        out[i * 3 + 1] = 1.2 + rnd() * 1.6;
        out[i * 3 + 2] = (rnd() - 0.5) * 0.8;
        continue;
      }
      const t = rnd();
      const base = Math.sin(Math.min(t / 0.22, 1) * Math.PI / 2);
      const w = 1.15 * Math.pow(base, 0.6) * Math.pow(1 - t, 1.25);
      const tongue = Math.floor(rnd() * 3) - 1;
      const lean = tongue * 0.32 * Math.pow(t, 1.4);
      const rad = w * Math.sqrt(rnd()) * (tongue === 0 ? 1 : 0.6);
      const a = rnd() * TAU;
      out[i * 3] = Math.cos(a) * rad + lean + Math.sin(t * 5) * 0.12 * t;
      out[i * 3 + 1] = -1.8 + t * (tongue === 0 ? 3.5 : 2.8);
      out[i * 3 + 2] = Math.sin(a) * rad * 0.55;
    }
    return out;
  }

  function createScene() {
    const THREE = window.THREE;
    const canvas = $("#scene");
    if (!THREE || !canvas) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch (_) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x0b0908, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const smokeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uWarm: { value: 1 }, uScroll: { value: 0 },
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: SMOKE_FRAG,
      depthWrite: false, depthTest: false,
    });
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), smokeMat);
    smoke.frustumCulled = false;
    smoke.renderOrder = -1;
    scene.add(smoke);

    const N = window.innerWidth < 760 ? 5200 : 11000;
    const targets = [
      textShape("BAYK", N, 6.6, "extra-expanded"),
      scatterShape(N),
      plateShape(N),
      clocheShape(N),
      flameShape(N),
      textShape("HUNGRY?", N, 6.6, "normal"),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(targets[0].slice(), 3));
    targets.forEach((t, i) => geo.setAttribute(`aT${i}`, new THREE.BufferAttribute(t, 3)));
    const seed = new Float32Array(N);
    const rand = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      seed[i] = rnd();
      rand[i * 3] = rnd() * 2 - 1; rand[i * 3 + 1] = rnd() * 2 - 1; rand[i * 3 + 2] = rnd() * 2 - 1;
    }
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));

    const uniforms = {
      uA: { value: [1, 0, 0, 0, 0, 0] }, uB: { value: [1, 0, 0, 0, 0, 0] }, uMix: { value: 0 },
      uTime: { value: 0 }, uIntro: { value: reduceMotion ? 1 : 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) }, uForce: { value: 0 },
      uOffset: { value: new THREE.Vector3() }, uSize: { value: window.innerWidth < 760 ? 7 : 8.5 },
      uPR: { value: renderer.getPixelRatio() }, uVel: { value: 0 }, uAlpha: { value: 1 }, uCalm: { value: reduceMotion ? 0.15 : 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const offset = new THREE.Vector3();
    let scale = 1;
    let force = 0;
    let rotX = 0;
    let rotY = 0;

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      smokeMat.uniforms.uRes.value.set(w, h);
      const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      scale = clamp((visH * camera.aspect) / 9.5, 0.36, 1);
      points.scale.setScalar(scale);
    }
    resize();

    const oneHot = (k) => [0, 1, 2, 3, 4, 5].map((i) => (i === k ? 1 : 0));
    const SHAPE_SIZE = [1, 1, 0.72, 0.72, 0.85, 0.7];
    const baseSize = uniforms.uSize.value;

    return {
      resize,
      intro() {
        if (reduceMotion) return;
        const start = performance.now();
        const run = (now) => {
          const k = clamp((now - start) / 2600, 0, 1);
          uniforms.uIntro.value = 1 - Math.pow(1 - k, 3);
          if (k < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      },
      update(time, st, vel, scrollY) {
        uniforms.uTime.value = time;
        smokeMat.uniforms.uTime.value = time;
        smokeMat.uniforms.uScroll.value = scrollY / window.innerHeight * 0.12;
        uniforms.uSize.value = baseSize * lerp(SHAPE_SIZE[st.a.shape], SHAPE_SIZE[st.b.shape], st.t);
        uniforms.uA.value = oneHot(st.a.shape);
        uniforms.uB.value = oneHot(st.b.shape);
        uniforms.uMix.value = st.t;
        const pa = placeOf(st.a);
        const pb = placeOf(st.b);
        offset.set(lerp(pa.x, pb.x, st.t), lerp(pa.y, pb.y, st.t), 0);
        uniforms.uOffset.value.copy(offset);
        const dim = lerp(pa.dim, pb.dim, st.t);
        uniforms.uAlpha.value = dim;
        smokeMat.uniforms.uWarm.value = 0.55 + 0.45 * dim;
        uniforms.uVel.value = lerp(uniforms.uVel.value, clamp(Math.abs(vel) / 30, 0, 1.4), 0.08);

        const now = performance.now();
        const active = now - pointer.last < 1800 || pointer.down;
        force = lerp(force, active && !reduceMotion ? 1 : 0, 0.05);
        uniforms.uForce.value = force;

        const nx = pointer.x / window.innerWidth;
        const ny = pointer.y / window.innerHeight;
        smokeMat.uniforms.uMouse.value.set(nx, 1 - ny);
        rotY = lerp(rotY, (nx - 0.5) * 0.35 + Math.sin(time * 0.2) * 0.08, 0.04);
        rotX = lerp(rotX, (ny - 0.5) * 0.18, 0.04);
        points.rotation.set(rotX, rotY, 0);
        points.updateMatrixWorld();

        ndc.set(nx * 2 - 1, -(ny * 2 - 1));
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          uniforms.uMouse.value.copy(points.worldToLocal(hit.clone()));
        }
        renderer.render(scene, camera);
      },
    };
  }

  /* ---------------------------------------------------------------- Loader */
  const loader = $(".loader");
  function runLoader(ready) {
    if (!loader) return Promise.resolve();
    if (reduceMotion) { loader.classList.add("is-done"); return Promise.resolve(); }
    const num = $("[data-loader-num]");
    const bar = $("[data-loader-bar]");
    const start = performance.now();
    let isReady = false;
    let shown = 0;
    ready.then(() => { isReady = true; });
    return new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - start;
        const target = Math.min(isReady ? 100 : 90, (elapsed / 1400) * 100);
        shown = lerp(shown, target, 0.14);
        if (isReady && target >= 100 && shown > 99.3) shown = 100;
        num.textContent = String(Math.round(shown)).padStart(3, "0");
        bar.style.transform = `scaleX(${shown / 100})`;
        if (shown >= 100 || elapsed > 5200) {
          loader.classList.add("is-done");
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- Boot */
  let stage = null;
  const fontsReady = Promise.race([
    Promise.all([
      document.fonts ? document.fonts.load('900 100px "Anybody"') : Promise.resolve(),
      document.fonts ? document.fonts.ready : Promise.resolve(),
    ]),
    wait(2500),
  ]).catch(() => {});
  const ready = fontsReady.then(() => {
    try { stage = createScene(); } catch (err) { stage = null; console.warn("BAYK: 3D scene unavailable", err); }
    if (!stage) root.classList.add("no-webgl");
  });

  if (lenis) lenis.stop();
  runLoader(ready).then(async () => {
    await ready;
    if (lenis) lenis.start();
    if (stage) stage.intro();
    setTimeout(revealHero, reduceMotion ? 0 : 450);
    measureAll();
    setTimeout(measureLens, 2200);
  });

  function measureAll() {
    measureGallery();
    measureChapters();
    measureLens();
  }
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (stage) stage.resize(); measureAll(); }, 150);
  });
  window.addEventListener("load", measureAll);
  measureAll();

  /* ---------------------------------------------------------------- Frame loop */
  let lastY = window.scrollY;
  let vel = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    const y = window.scrollY;
    const vh = window.innerHeight;
    vel = lerp(vel, clamp(y - lastY, -120, 120), 0.25);
    if (Math.abs(vel) < 0.05) vel = 0;
    lastY = y;

    // HUD
    const progress = clamp(y / maxScroll, 0, 1);
    if (hudBar) hudBar.style.transform = `scaleX(${progress})`;
    if (hudPct) hudPct.textContent = String(Math.round(progress * 100)).padStart(3, "0");
    const st = chapterState(y);
    const current = st.t < 0.5 ? st.a : st.b;
    if (current !== hudChapter && hudNo) {
      hudChapter = current;
      hudNo.textContent = current.no;
      hudName.textContent = current.name;
    }

    // Manifesto
    if (scrubEl && !reduceMotion) {
      const sec = scrubEl.closest(".manifesto");
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const lit = Math.floor(clamp(p * 1.15, 0, 1) * scrubWords.length);
      if (lit !== litCount) {
        litCount = lit;
        scrubWords.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
      }
    }

    // Pinned gallery
    if (gallery && galleryTrack) {
      const r = gallery.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      galleryTrack.style.transform = `translate3d(${-p * galleryDist}px, 0, 0)`;
      if (galleryBg) galleryBg.style.transform = `translate3d(${-p * galleryDist * 0.4}px, -50%, 0)`;
      if (!reduceMotion && r.top < vh && r.bottom > 0) {
        const skew = clamp(-vel * 0.25, -8, 8);
        dishFrames.forEach((f) => { f.style.transform = `skewX(${skew}deg)`; });
      }
    }

    // Marquee speeds up and turns with the scroll
    if (marquee && !reduceMotion) {
      if (Math.abs(vel) > 0.4) marqueeDir = vel > 0 ? 1 : -1;
      marqueeX -= (0.7 + Math.min(Math.abs(vel) * 0.4, 14)) * marqueeDir;
      const half = marquee.scrollWidth / 2;
      if (half > 0) {
        if (marqueeX <= -half) marqueeX += half;
        if (marqueeX > 0) marqueeX -= half;
      }
      marquee.style.transform = `translate3d(${marqueeX}px, 0, 0)`;
    }

    // Cursor
    if (useCursor) {
      ringPos.x = lerp(ringPos.x, pointer.x, 0.18);
      ringPos.y = lerp(ringPos.y, pointer.y, 0.18);
      cursorDot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      cursorRing.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
    }
    if (floatImg && floatImg.classList.contains("is-on")) {
      floatPos.x = lerp(floatPos.x, pointer.x, 0.14);
      floatPos.y = lerp(floatPos.y, pointer.y, 0.14);
      const rot = clamp((pointer.x - floatPos.x) * 0.06, -12, 12);
      floatImg.style.transform = `translate3d(${floatPos.x + 36}px, ${floatPos.y - 160}px, 0) rotate(${rot}deg)`;
    } else if (floatImg) {
      floatPos.x = pointer.x;
      floatPos.y = pointer.y;
    }

    // Hero lens
    if (lensCache.length && y < vh) {
      const py = pointer.y + y;
      const live = now - pointer.last < 2500;
      lensCache.forEach((c) => {
        const d = Math.hypot(pointer.x - c.x, (py - c.y) * 1.3);
        let f = live ? clamp(1 - d / 260, 0, 1) : 0;
        f = f * f;
        c.f = lerp(c.f, f, 0.18);
        if (Math.abs(c.f - (c.applied || 0)) < 0.004) return;
        c.applied = c.f < 0.004 ? 0 : c.f;
        c.el.style.fontVariationSettings = c.applied ? `"wdth" ${(62 + c.applied * 60).toFixed(1)}` : "";
        if (!c.em) c.el.style.color = c.applied > 0.02 ? `color-mix(in srgb, var(--flame) ${Math.round(c.applied * 100)}%, var(--bone))` : "";
      });
    }

    if (stage) stage.update(now / 1000, st, vel, y);
  }
  requestAnimationFrame(frame);
})();
