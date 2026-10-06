/* BAYK site behaviour, shared by every page.
   Everything you are likely to change lives in CONFIG. Leave a price as null and the
   site shows a [£] placeholder in its place. The 3D stage lives in stage.js. */
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
  const page = document.body.dataset.page || "";
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
  const money = (v) => (v == null ? "[£]" : gbp.format(v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get(k) { try { return window.sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (_) { /* storage blocked: carry on */ } },
  };

  /* Shared state the 3D stage reads */
  const BAYK = (window.BAYK = {
    reduceMotion, finePointer,
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2, last: -1e9, down: false },
    drag: { active: false, dx: 0, dy: 0 },
    reveal: 0, scrollY: 0, plan: { meals: 10 }, hoverObject: false, deliveryShort: "",
  });

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
  const shortDate = (d) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d).replace(",", "");
  const pad = (n) => String(n).padStart(2, "0");
  const cutoffTime = `${pad(CONFIG.cutoff.hour)}:${pad(CONFIG.cutoff.minute)}`;

  let service = serviceDates();
  function renderService() {
    if (!service) return;
    BAYK.deliveryShort = shortDate(service.delivery).toUpperCase();
    $$("[data-delivery-short]").forEach((el) => (el.textContent = shortDate(service.delivery)));
    $$("[data-delivery-long]").forEach((el) => (el.textContent = longDate(service.delivery)));
    $$("[data-cutoff-short]").forEach((el) => (el.textContent = `${shortDate(service.cutoffDay)}, ${cutoffTime}`));
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
    const parts = { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
    $$("[data-cd]").forEach((el) => { if (el.textContent !== parts[el.dataset.cd]) el.textContent = parts[el.dataset.cd]; });
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
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add("split");
  }
  $$("[data-split]").forEach(split);

  /* Reveal on scroll. Items inside [data-intro] wait for the page intro. */
  const animated = $$("[data-split], .reveal");
  const manual = $$("[data-manual]");
  const introItems = $$("[data-intro] [data-split], [data-intro] .reveal").filter((el) => !manual.includes(el));
  let io = null;
  if (!reduceMotion && "IntersectionObserver" in window) {
    animated.forEach((el) => el.classList.add("is-armed"));
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    animated.forEach((el) => { if (!introItems.includes(el) && !manual.includes(el)) io.observe(el); });
  }
  const playIntro = () => introItems.forEach((el, n) => setTimeout(() => el.classList.add("is-in"), n * 120));

  /* ---------------------------------------------------------------- Smooth scrolling */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    try { lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true }); } catch (_) { lenis = null; }
  }
  BAYK.lenis = lenis;
  function scrollToTarget(target, opts = {}) {
    if (lenis) { lenis.scrollTo(target, { duration: 1.6, ...opts }); return; }
    const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------------- Header */
  const header = $(".site-header");
  let lastHeaderY = 0;
  $$('.nav a, .menu-list a').forEach((a) => {
    if (a.dataset.page === page) a.setAttribute("aria-current", "page");
  });

  /* ---------------------------------------------------------------- Menu */
  const menu = $("#menu");
  const menuBtn = $(".menu-btn");
  const menuPreview = $(".menu-preview");
  const menuOpen = () => !!menu && menu.classList.contains("is-open");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) setTimeout(() => { const a = $("a", menu); if (a) a.focus({ preventScroll: true }); }, 400);
  }
  if (menu) {
    menu.inert = true;
    if (menuBtn) menuBtn.addEventListener("click", () => setMenu(!menuOpen()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen()) { setMenu(false); if (menuBtn) menuBtn.focus(); } });
    $$("a[data-img]", menu).forEach((a) => {
      const show = () => { if (menuPreview && menuPreview.getAttribute("src") !== a.dataset.img) menuPreview.src = a.dataset.img; };
      a.addEventListener("pointerenter", show);
      a.addEventListener("focus", show);
    });
  }

  /* ---------------------------------------------------------------- Page transitions */
  const curtain = $(".curtain");
  function go(url) {
    store.set("bayk-curtain", "1");
    if (!curtain || reduceMotion) { window.location.href = url; return; }
    curtain.classList.remove("is-leaving", "is-hold");
    curtain.style.transition = "none";
    curtain.style.transform = "translateY(100%)";
    void curtain.offsetWidth;
    curtain.style.transition = "";
    curtain.style.transform = "";
    curtain.classList.add("is-covering");
    setTimeout(() => { window.location.href = url; }, 760);
  }
  const samePage = (a) => a.pathname.replace(/\/index\.html$/, "/") === window.location.pathname.replace(/\/index\.html$/, "/");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (/^(mailto:|tel:|https?:)/i.test(href)) return;
    // In-page anchors scroll smoothly
    if (href.startsWith("#") || (samePage(a) && a.hash)) {
      const id = a.hash || href;
      const target = id === "#top" ? 0 : document.getElementById(id.slice(1));
      if (target == null) return;
      e.preventDefault();
      const wasOpen = menuOpen();
      if (wasOpen) setMenu(false);
      setTimeout(() => scrollToTarget(target), wasOpen ? 300 : 0);
      return;
    }
    if (!/\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    if (menuOpen()) setMenu(false);
    go(a.href);
  });
  if (reduceMotion) root.classList.remove("arriving");
  const arrivedByCurtain = store.get("bayk-curtain") === "1";
  store.set("bayk-curtain", "0");
  if (curtain && arrivedByCurtain && !reduceMotion) curtain.classList.add("is-hold");
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) { root.classList.remove("arriving"); curtain.classList.remove("is-covering", "is-hold"); curtain.classList.add("is-leaving"); }
  });

  /* ---------------------------------------------------------------- Pointer, drag, cursor */
  const P = BAYK.pointer;
  window.addEventListener("pointermove", (e) => {
    if (BAYK.drag.active) { BAYK.drag.dx += e.clientX - P.x; BAYK.drag.dy += e.clientY - P.y; }
    P.x = e.clientX; P.y = e.clientY; P.last = performance.now();
  }, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    P.x = e.clientX; P.y = e.clientY; P.last = performance.now(); P.down = true;
    if (e.target.closest("[data-drag]")) { BAYK.drag.active = true; }
  }, { passive: true });
  const endDrag = () => { P.down = false; BAYK.drag.active = false; };
  window.addEventListener("pointerup", endDrag, { passive: true });
  window.addEventListener("pointercancel", endDrag, { passive: true });

  const cursor = $(".cursor");
  const cursorDot = $(".cursor-dot");
  const cursorRing = $(".cursor-ring");
  const cursorLabel = $(".cursor-label");
  const ring = { x: P.x, y: P.y };
  const useCursor = finePointer && !reduceMotion && cursor;
  let hoverTarget = null;
  function paintCursor() {
    if (!useCursor) return;
    let label = hoverTarget && hoverTarget.dataset.cursor;
    if (hoverTarget && hoverTarget.hasAttribute("data-drag") && BAYK.hoverObject) label = hoverTarget.dataset.cursorObject || label;
    if (BAYK.drag.active) label = "";
    cursor.classList.toggle("is-label", !!label);
    cursor.classList.toggle("is-hover", !!hoverTarget && !label);
    cursor.classList.toggle("is-down", P.down && !label);
    if (cursorLabel.textContent !== (label || "")) cursorLabel.textContent = label || "";
  }
  if (useCursor) {
    root.classList.add("has-cursor");
    document.addEventListener("pointerover", (e) => {
      hoverTarget = e.target.closest("[data-cursor], [data-cursor-hover], a, button, label, [data-drag]");
    });
    document.documentElement.addEventListener("pointerleave", () => { cursor.style.opacity = "0"; });
    document.documentElement.addEventListener("pointerenter", () => { cursor.style.opacity = "1"; });
  }

  /* Buttons that lean towards the pointer */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.style.transition = "transform .6s cubic-bezier(.16,1,.3,1), color .45s cubic-bezier(.16,1,.3,1), border-color .45s cubic-bezier(.16,1,.3,1)";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.2}px, ${(e.clientY - (r.top + r.height / 2)) * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* Image that follows the pointer over index rows */
  const floatImg = $(".float-img");
  const floatPos = { x: 0, y: 0, r: 0 };
  if (floatImg && finePointer && !reduceMotion) {
    $$("[data-float]").forEach((a) => {
      a.addEventListener("pointerenter", () => {
        if (floatImg.getAttribute("src") !== a.dataset.float) floatImg.src = a.dataset.float;
        floatImg.classList.add("is-on");
      });
      a.addEventListener("pointerleave", () => floatImg.classList.remove("is-on"));
    });
  }

  /* ---------------------------------------------------------------- Home: lift the lid */
  const revealStage = $("[data-reveal-stage]");
  const revealSticky = revealStage && $(".reveal-sticky", revealStage);
  const lidPct = $("[data-lid-pct]");
  function revealTargetY(p) {
    const r = revealStage.getBoundingClientRect();
    return r.top + window.scrollY + p * (r.height - window.innerHeight);
  }
  $$("[data-lift]").forEach((b) => b.addEventListener("click", () => { if (revealStage) scrollToTarget(revealTargetY(0.8), { duration: 2.2 }); }));
  window.addEventListener("bayk:lift", () => { if (revealStage && BAYK.reveal < 0.5) scrollToTarget(revealTargetY(0.8), { duration: 2.2 }); });

  /* Manifesto: words light up with scroll */
  const scrubEl = $("[data-scrub]");
  let scrubWords = [];
  let litCount = -1;
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

  /* ---------------------------------------------------------------- Weekly: plan builder and order ticket */
  const builder = $("#builder");
  const ticket = $(".ticket");
  function readPlan() {
    const data = new FormData(builder);
    return { meals: +data.get("meals"), diet: data.get("diet"), portion: data.get("portion") };
  }
  function renderTicket(flash) {
    if (!builder) return;
    const plan = readPlan();
    BAYK.plan = plan;
    window.dispatchEvent(new CustomEvent("bayk:plan", { detail: plan }));
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
      setTimeout(() => ticket.classList.remove("is-flash"), 80);
    }
  }
  if (builder) {
    builder.addEventListener("change", () => renderTicket(true));
    renderTicket(false);
    const send = $("[data-send-ticket]");
    if (send) send.addEventListener("click", () => {
      const p = readPlan();
      go(`contact.html#plan-${p.meals}-${p.diet.toLowerCase()}-${p.portion.toLowerCase()}`);
    });
  }

  /* ---------------------------------------------------------------- Contact: prefill from the link */
  const contactForm = $("#contact-form");
  if (contactForm) {
    const hash = window.location.hash.slice(1);
    const m = hash.match(/^plan-(\d+)-([a-z]+)-([a-z]+)$/);
    if (m) {
      const when = service ? longDate(service.delivery) : "the next Monday delivery";
      contactForm.elements.interest.value = "BAYK Weekly";
      contactForm.elements.message.value = `I'd like to start BAYK Weekly: ${m[1]} meals a week, ${m[2]}, ${m[3]} portions, starting ${when}.`;
    }
    const interest = { "ask-weekly": "BAYK Weekly", "ask-private": "Private dining", "ask-kitchen": "BAYK Kitchen" }[hash];
    if (interest) contactForm.elements.interest.value = interest;
  }

  /* ---------------------------------------------------------------- Tabs (Journal) */
  const tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !on;
        if (on) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); }
      }
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      const next = { ArrowRight: idx + 1, ArrowDown: idx + 1, ArrowLeft: idx - 1, ArrowUp: idx - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      selectTab(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
  if (tabs.length) {
    const fromHash = tabs.find((t) => t.getAttribute("aria-controls") === window.location.hash.slice(1));
    if (fromHash) selectTab(fromHash);
  }

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
    if (!box) { box = el("div", { class: "form-status", role: "status" }); form.appendChild(box); }
    box.replaceChildren(...nodes);
  }
  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const kind = form.dataset.form;
      const isNewsletter = kind === "newsletter";
      const endpoint = isNewsletter ? CONFIG.newsletterEndpoint : CONFIG.formEndpoint;
      const text = summarise(form);
      if (endpoint) {
        try {
          const body = new FormData(form);
          body.append("form", kind);
          const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body });
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
    const label = btn.querySelector("span") || btn;
    const done = () => { const old = label.textContent; label.textContent = "Copied"; setTimeout(() => (label.textContent = old), 1600); };
    const select = () => {
      if (!fallbackNode) return;
      const range = document.createRange();
      range.selectNodeContents(fallbackNode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      label.textContent = "Press Ctrl+C";
    };
    try { navigator.clipboard.writeText(text).then(done, select); } catch (_) { select(); }
  }
  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", () => copyText(btn.dataset.copy, btn, document.getElementById(btn.dataset.copyTarget))));

  /* ---------------------------------------------------------------- Boot: loader on the first home visit, curtain elsewhere */
  const loader = $(".loader");
  const stageReady = new Promise((resolve) => {
    window.addEventListener("bayk:stage-ready", resolve, { once: true });
    setTimeout(resolve, 4500);
  });
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(2500)]).catch(() => {});

  function runLoader() {
    const num = $("[data-loader-num]");
    const bar = $("[data-loader-bar]");
    const start = performance.now();
    let ready = false;
    let shown = 0;
    Promise.all([stageReady, fontsReady]).then(() => { ready = true; });
    return new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - start;
        const target = Math.min(ready ? 100 : 88, (elapsed / 1500) * 100);
        shown = lerp(shown, target, 0.12);
        if (ready && target >= 100 && shown > 99.3) shown = 100;
        num.textContent = String(Math.round(shown)).padStart(3, "0");
        bar.style.transform = `scaleX(${shown / 100})`;
        if (shown >= 100 || elapsed > 6000) { loader.classList.add("is-done"); resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  (async () => {
    const firstHome = page === "home" && loader && !reduceMotion && store.get("bayk-seen") !== "1";
    if (lenis) lenis.stop();
    if (firstHome) {
      await runLoader();
      store.set("bayk-seen", "1");
    } else {
      if (loader) loader.classList.add("is-skipped");
      await Promise.race([Promise.all([stageReady, fontsReady]), wait(1400)]);
      if (curtain && (curtain.classList.contains("is-hold") || root.classList.contains("arriving"))) {
        curtain.classList.remove("is-hold");
        curtain.classList.add("is-leaving");
        root.classList.remove("arriving");
      }
    }
    if (lenis) lenis.start();
    window.dispatchEvent(new Event("bayk:intro"));
    setTimeout(playIntro, reduceMotion ? 0 : 350);
  })();

  /* ---------------------------------------------------------------- Frame loop */
  function frame(now) {
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    const y = window.scrollY;
    const vh = window.innerHeight;
    BAYK.scrollY = y;

    // Header: glass once scrolled, hides on the way down, returns on the way up
    if (header) {
      header.classList.toggle("is-scrolled", y > 10);
      if (!menuOpen()) {
        if (y > 400 && y > lastHeaderY + 6) header.classList.add("is-hidden");
        else if (y < lastHeaderY - 6 || y < 400) header.classList.remove("is-hidden");
      }
      lastHeaderY = y;
    }

    // Home reveal
    if (revealStage) {
      const r = revealStage.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      BAYK.reveal = reduceMotion ? (p > 0.3 ? 1 : 0) : p;
      revealSticky.style.setProperty("--reveal", BAYK.reveal.toFixed(3));
      const revealed = BAYK.reveal > 0.55;
      if (revealed !== revealSticky.classList.contains("is-revealed")) {
        revealSticky.classList.toggle("is-revealed", revealed);
        manual.forEach((m) => m.classList.toggle("is-in", revealed));
      }
      if (lidPct) lidPct.textContent = `${String(Math.round(clamp(BAYK.reveal / 0.8, 0, 1) * 100)).padStart(2, "0")}%`;
    }

    // Manifesto
    if (scrubEl && !reduceMotion) {
      const r = scrubEl.closest(".manifesto").getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const lit = Math.floor(clamp(p * 1.15, 0, 1) * scrubWords.length);
      if (lit !== litCount) { litCount = lit; scrubWords.forEach((w, i) => w.classList.toggle("is-lit", i < lit)); }
    }

    // Cursor
    if (useCursor) {
      ring.x = lerp(ring.x, P.x, 0.2);
      ring.y = lerp(ring.y, P.y, 0.2);
      cursorDot.style.transform = `translate3d(${P.x}px, ${P.y}px, 0)`;
      cursorRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      paintCursor();
    }
    if (floatImg) {
      if (floatImg.classList.contains("is-on")) {
        floatPos.x = lerp(floatPos.x, P.x, 0.14);
        floatPos.y = lerp(floatPos.y, P.y, 0.14);
        floatPos.r = lerp(floatPos.r, clamp((P.x - floatPos.x) * 0.08, -10, 10), 0.2);
        floatImg.style.transform = `translate3d(${floatPos.x + 30}px, ${floatPos.y - 150}px, 0) rotate(${floatPos.r}deg)`;
      } else { floatPos.x = P.x; floatPos.y = P.y; }
    }
  }
  requestAnimationFrame(frame);
})();
