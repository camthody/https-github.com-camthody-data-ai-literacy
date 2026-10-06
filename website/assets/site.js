/* BAYK site behaviour.
   Everything you are likely to change lives in CONFIG. Leave a price as null and the
   site shows a [£] placeholder in its place. */
const CONFIG = {
  // [CONFIRM] Weekly order cut-off in UK time. weekday: 0 = Sunday, 1 = Monday ... 5 = Friday, 6 = Saturday.
  cutoff: { weekday: 5, hour: 18, minute: 0 },
  deliveryWeekday: 1, // Monday
  prices: {
    weeklyPerMeal: null, // BAYK Weekly, per meal
    workFromPerHead: null, // BAYK at Work, lowest per-head price
    privateFromPerHead: null, // Private dining, lowest per-head price
    kitchenPerMonth: null, // BAYK Kitchen membership
    boardroom: null, // per head
    entertaining: null, // per head
    teamday: null, // per head
    teammeals: null, // per head
  },
  // Paste a form endpoint (for example Formspree) to make enquiries send. null = show a copyable email instead.
  formEndpoint: null,
  // Paste your newsletter provider's form endpoint. null = show a fallback message.
  newsletterEndpoint: null,
  contactEmail: "cameron@thody.me",
};

document.documentElement.classList.add("js");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const money = (v) => (v == null ? "[£]" : gbp.format(v));

/* ---------- Dates in UK time ---------- */
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
const ticketDate = (d) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(d).replace(",", "").toUpperCase();
const pad = (n) => String(n).padStart(2, "0");
const cutoffTime = `${pad(CONFIG.cutoff.hour)}:${pad(CONFIG.cutoff.minute)}`;

let service = serviceDates();

function renderService() {
  if (!service) return;
  $$("[data-delivery-long]").forEach((el) => (el.textContent = longDate(service.delivery)));
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
$$("[data-countdown-wrap]").forEach((el) => (el.hidden = false));
tick();
setInterval(tick, 1000);

/* ---------- Prices ---------- */
$$("[data-price]").forEach((el) => {
  const v = CONFIG.prices[el.dataset.price];
  el.textContent = money(v);
  el.classList.toggle("placeholder", v == null);
});

/* ---------- Header ---------- */
const header = $(".site-header");
const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const toggle = $(".menu-toggle");
const nav = $("#site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }));
}

/* ---------- Hero plates ---------- */
const plates = $$(".plate img");
const plateName = $("[data-plate-name]");
if (plates.length > 1) {
  let i = 0;
  const show = (n) => {
    plates[i].classList.remove("is-active");
    i = (n + plates.length) % plates.length;
    plates[i].classList.add("is-active");
    if (plateName) plateName.textContent = plates[i].dataset.name;
  };
  if (!reduceMotion) {
    setInterval(() => { if (!document.hidden) show(i + 1); }, 4500);
  }
}

/* ---------- Offer tabs ---------- */
const tabs = $$('[role="tab"]');
function selectTab(tab, focus = false) {
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
    const k = e.key;
    let next = null;
    if (k === "ArrowDown" || k === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
    if (k === "ArrowUp" || k === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
    if (k === "Home") next = tabs[0];
    if (k === "End") next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); selectTab(next, true); }
  });
});
function openTabFromHash() {
  const id = location.hash.slice(1);
  const tab = tabs.find((t) => t.getAttribute("aria-controls") === id);
  if (tab) {
    selectTab(tab);
    const section = $("#offers");
    if (section) section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
}
$$('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute("href").slice(1);
  if (tabs.some((t) => t.getAttribute("aria-controls") === id)) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      openTabFromHash();
    });
  }
});
if (tabs.length) {
  window.addEventListener("hashchange", openTabFromHash);
  openTabFromHash();
}

/* ---------- Process progress line ---------- */
const steps = $(".steps");
if (steps && !reduceMotion) {
  const update = () => {
    const r = steps.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.3)));
    steps.style.setProperty("--progress", p.toFixed(3));
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- Plan builder and order ticket ---------- */
const builder = $("#builder");
const docket = $(".docket");
function readPlan() {
  const data = new FormData(builder);
  return { meals: +data.get("meals"), diet: data.get("diet"), portion: data.get("portion") };
}
function renderDocket() {
  if (!builder || !docket) return;
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
  if (!reduceMotion) { docket.classList.remove("is-printing"); void docket.offsetWidth; docket.classList.add("is-printing"); }
}
if (builder) {
  builder.addEventListener("change", renderDocket);
  renderDocket();
  $("[data-send-ticket]").addEventListener("click", () => {
    const plan = readPlan();
    const when = service ? longDate(service.delivery) : "the next Monday delivery";
    prefill("#contact-form", {
      interest: "BAYK Weekly",
      message: `I'd like to start BAYK Weekly: ${plan.meals} meals a week, ${plan.diet.toLowerCase()}, ${plan.portion.toLowerCase()} portions, starting ${when}.`,
    });
    $("#contact").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(() => $("#c-name") && $("#c-name").focus({ preventScroll: true }), reduceMotion ? 0 : 700);
  });
}

/* Buttons that jump to a form and preset its subject */
$$("[data-prefill]").forEach((el) => {
  el.addEventListener("click", () => {
    const [form, interest] = el.dataset.prefill.split("|");
    prefill(form, { interest });
  });
});
function prefill(formSel, values) {
  const form = $(formSel);
  if (!form) return;
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field && value != null) field.value = value;
  });
}

/* ---------- Gallery ---------- */
const gallery = $(".gallery");
if (gallery) {
  const step = () => (gallery.querySelector("figure")?.getBoundingClientRect().width || 300) + 20;
  $("[data-gallery-prev]")?.addEventListener("click", () => gallery.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
  $("[data-gallery-next]")?.addEventListener("click", () => gallery.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
  let startX = 0, startScroll = 0, dragging = false;
  gallery.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    dragging = true; startX = e.clientX; startScroll = gallery.scrollLeft;
    gallery.classList.add("is-dragging");
    gallery.setPointerCapture(e.pointerId);
  });
  gallery.addEventListener("pointermove", (e) => { if (dragging) gallery.scrollLeft = startScroll - (e.clientX - startX); });
  const end = () => { dragging = false; gallery.classList.remove("is-dragging"); };
  gallery.addEventListener("pointerup", end);
  gallery.addEventListener("pointercancel", end);
}

/* ---------- What's in season (UK) ---------- */
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
    li.className = "chip";
    li.textContent = name;
    return li;
  }));
}

/* ---------- Corporate estimator ---------- */
const est = $("#estimator");
if (est) {
  const guests = $("#e-guests");
  const format = $("#e-format");
  const out = $("[data-e-guests]");
  const render = () => {
    const n = +guests.value;
    const opt = format.selectedOptions[0];
    const per = CONFIG.prices[opt.value];
    out.textContent = n;
    $("[data-e-per]").textContent = money(per);
    $("[data-e-per]").classList.toggle("placeholder", per == null);
    $("[data-e-n]").textContent = n;
    $("[data-e-total]").textContent = per == null ? "[£]" : gbp.format(per * n);
    $("[data-e-total]").classList.toggle("placeholder", per == null);
  };
  guests.addEventListener("input", render);
  format.addEventListener("change", render);
  render();
  $("[data-e-use]").addEventListener("click", () => {
    prefill("#enquiry-form", { guests: guests.value, format: format.selectedOptions[0].textContent });
    $("#enquire").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
}

/* ---------- Forms ---------- */
function summarise(form) {
  const lines = [];
  $$("input, select, textarea", form).forEach((f) => {
    if (!f.name || !f.value) return;
    const label = form.querySelector(`label[for="${f.id}"]`);
    lines.push(`${label ? label.textContent.replace(/\s*\(optional\)/i, "") : f.name}: ${f.value}`);
  });
  return lines.join("\n");
}
function status(form, html) {
  let box = $(".form-status", form);
  if (!box) {
    box = document.createElement("div");
    box.className = "form-status";
    box.setAttribute("role", "status");
    form.appendChild(box);
  }
  box.innerHTML = "";
  box.append(...html);
  return box;
}
function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (text) node.textContent = text;
  return node;
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

/* ---------- Copy buttons ---------- */
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
  try {
    navigator.clipboard.writeText(text).then(done, select);
  } catch (_) { select(); }
}
$$("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", () => copyText(btn.dataset.copy, btn, document.getElementById(btn.dataset.copyTarget)));
});

/* ---------- Reveal on scroll (content is visible before and after) ---------- */
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.remove("is-below"); io.unobserve(entry.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((node) => {
    if (node.getBoundingClientRect().top > window.innerHeight) {
      node.classList.add("is-below");
      io.observe(node);
    }
  });
}
