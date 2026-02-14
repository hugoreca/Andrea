const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const state = {
  data: { ziploc: [], songs: [] },
  zFav: new Set(JSON.parse(localStorage.getItem("favorites_ziploc") || "[]")),
  sFav: new Set(JSON.parse(localStorage.getItem("favorites_songs") || "[]")),
  zSearch: "",
  zTag: "all",
  zOnlyFav: false,
  mood: "all",
  reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};
const saveFavs = () => {
  localStorage.setItem("favorites_ziploc", JSON.stringify([...state.zFav]));
  localStorage.setItem("favorites_songs", JSON.stringify([...state.sFav]));
};
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const unique = (arr) => [...new Set(arr)];
const setPressed = (el, pressed) => el.setAttribute("aria-pressed", pressed ? "true" : "false");
const setSelectedChip = (wrap, value) => qsa(".chip", wrap).forEach(c => c.classList.toggle("selected", c.dataset.value === value));
const hearts = (x, y) => {
  if (state.reduce) return;
  const layer = qs("#heart-layer");
  for (let i = 0; i < 10; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = "❤";
    const dx = (Math.random() - 0.5) * 120;
    const dy = (Math.random() - 0.5) * 80;
    const size = 14 + Math.random() * 10;
    h.style.left = x + "px";
    h.style.top = y + "px";
    h.style.fontSize = size + "px";
    layer.appendChild(h);
    const duration = 900 + Math.random() * 700;
    const start = performance.now();
    const anim = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const ox = x + dx * p;
      const oy = y - 40 * p + dy * p;
      const o = 1 - p;
      h.style.transform = `translate(${ox - x}px, ${oy - y}px)`;
      h.style.opacity = String(o);
      if (p < 1) requestAnimationFrame(anim);
      else h.remove();
    };
    requestAnimationFrame(anim);
  }
};
const live = (el, msg) => { el.textContent = msg; setTimeout(() => { el.textContent = ""; }, 1200); };
const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};
const observeSections = () => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); });
  }, { threshold: 0.08 });
  qsa(".section").forEach(s => io.observe(s));
};
const buildTagChips = () => {
  const wrap = qs("#z-tags");
  const tags = unique(state.data.ziploc.map(z => z.tag)).sort();
  const all = document.createElement("button");
  all.className = "chip";
  all.dataset.value = "all";
  all.type = "button";
  all.textContent = "Todas";
  wrap.appendChild(all);
  tags.forEach(t => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.value = t;
    b.type = "button";
    b.textContent = `#${t}`;
    wrap.appendChild(b);
  });
  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.zTag = b.dataset.value;
    setSelectedChip(wrap, state.zTag);
    renderZList();
  });
  setSelectedChip(wrap, "all");
};
const buildMoodChips = () => {
  const wrap = qs("#mood-selector");
  const moods = unique(state.data.songs.map(s => s.mood)).sort();
  const all = document.createElement("button");
  all.className = "chip";
  all.dataset.value = "all";
  all.type = "button";
  all.textContent = "Todos";
  wrap.appendChild(all);
  moods.forEach(m => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.value = m;
    b.type = "button";
    b.textContent = m.replace(/_/g, " ");
    wrap.appendChild(b);
  });
  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.mood = b.dataset.value;
    setSelectedChip(wrap, state.mood);
    renderSongList();
    renderSongHighlight();
  });
  setSelectedChip(wrap, "all");
};
const zFiltered = () => {
  let items = state.data.ziploc;
  if (state.zTag !== "all") items = items.filter(i => i.tag === state.zTag);
  if (state.zSearch) {
    const q = state.zSearch.toLowerCase();
    items = items.filter(i => i.text.toLowerCase().includes(q));
  }
  if (state.zOnlyFav) items = items.filter(i => state.zFav.has(i.id));
  return items;
};
const sFiltered = () => {
  let items = state.data.songs;
  if (state.mood !== "all") items = items.filter(i => i.mood === state.mood);
  return items;
};
const renderZHighlight = () => {
  const items = zFiltered();
  const pick = items.length ? randItem(items) : null;
  qs("#z-phrase").textContent = pick ? pick.text : "Sin elementos";
  qs("#z-tag").textContent = pick ? `#${pick.tag}` : "";
  const save = qs("#z-save");
  if (pick) setPressed(save, state.zFav.has(pick.id));
  save.onclick = (e) => {
    if (!pick) return;
    const p = state.zFav.has(pick.id);
    if (p) state.zFav.delete(pick.id); else state.zFav.add(pick.id);
    saveFavs();
    setPressed(save, !p);
    const r = e.target.getBoundingClientRect();
    hearts(r.left + r.width / 2, r.top + window.scrollY);
    live(qs("#z-feedback"), p ? "Removido ✨" : "Guardado ✨");
    renderZList();
  };
  qs("#z-next").onclick = () => renderZHighlight();
  qs("#z-copy").onclick = async () => {
    if (!pick) return;
    const ok = await copyText(pick.text);
    live(qs("#z-feedback"), ok ? "Copiado ✨" : "Error al copiar");
  };
};
const zCard = (item) => {
  const d = document.createElement("div");
  d.className = "card";
  const t = document.createElement("div");
  t.className = "list-card-title";
  t.textContent = item.text;
  const m = document.createElement("div");
  m.className = "list-card-meta";
  m.textContent = `#${item.tag}`;
  const a = document.createElement("div");
  a.className = "list-card-actions";
  const fav = document.createElement("button");
  fav.className = "list-button star";
  fav.type = "button";
  setPressed(fav, state.zFav.has(item.id));
  fav.textContent = "⭐";
  fav.onclick = (e) => {
    const p = state.zFav.has(item.id);
    if (p) state.zFav.delete(item.id); else state.zFav.add(item.id);
    saveFavs();
    setPressed(fav, !p);
    const r = e.target.getBoundingClientRect();
    hearts(r.left + r.width / 2, r.top + window.scrollY);
  };
  const copy = document.createElement("button");
  copy.className = "list-button";
  copy.type = "button";
  copy.textContent = "Copiar";
  copy.onclick = async () => {
    const ok = await copyText(item.text);
    live(qs("#z-feedback"), ok ? "Copiado ✨" : "Error al copiar");
  };
  a.append(fav, copy);
  d.append(t, m, a);
  return d;
};
const renderZList = () => {
  const wrap = qs("#z-list");
  wrap.innerHTML = "";
  zFiltered().forEach(i => wrap.appendChild(zCard(i)));
};
const renderSongHighlight = () => {
  const items = sFiltered();
  const pick = items.length ? randItem(items) : null;
  qs("#s-title").textContent = pick ? pick.title : "Sin elementos";
  qs("#s-artist").textContent = pick ? pick.artist : "";
  qs("#s-note").textContent = pick ? pick.note : "";
  const open = qs("#s-open");
  open.href = pick ? pick.url : "#";
  const save = qs("#s-save");
  if (pick) setPressed(save, state.sFav.has(pick.id));
  save.onclick = (e) => {
    if (!pick) return;
    const p = state.sFav.has(pick.id);
    if (p) state.sFav.delete(pick.id); else state.sFav.add(pick.id);
    saveFavs();
    setPressed(save, !p);
    const r = e.target.getBoundingClientRect();
    hearts(r.left + r.width / 2, r.top + window.scrollY);
    live(qs("#s-feedback"), p ? "Removido ✨" : "Guardado ✨");
    renderSongList();
  };
  qs("#s-next").onclick = () => renderSongHighlight();
};
const sCard = (item) => {
  const d = document.createElement("div");
  d.className = "card";
  const t = document.createElement("div");
  t.className = "list-card-title";
  t.textContent = item.title;
  const m = document.createElement("div");
  m.className = "list-card-meta";
  m.textContent = item.artist;
  const a = document.createElement("div");
  a.className = "list-card-actions";
  const open = document.createElement("a");
  open.className = "list-button";
  open.href = item.url;
  open.target = "_blank";
  open.rel = "noopener";
  open.textContent = "Abrir 🎶";
  const fav = document.createElement("button");
  fav.className = "list-button star";
  fav.type = "button";
  setPressed(fav, state.sFav.has(item.id));
  fav.textContent = "⭐";
  fav.onclick = (e) => {
    const p = state.sFav.has(item.id);
    if (p) state.sFav.delete(item.id); else state.sFav.add(item.id);
    saveFavs();
    setPressed(fav, !p);
    const r = e.target.getBoundingClientRect();
    hearts(r.left + r.width / 2, r.top + window.scrollY);
  };
  a.append(open, fav);
  d.append(t, m, a);
  return d;
};
const renderSongList = () => {
  const wrap = qs("#s-list");
  wrap.innerHTML = "";
  sFiltered().forEach(i => wrap.appendChild(sCard(i)));
};
const wireInputs = () => {
  qs("#z-search").addEventListener("input", (e) => { state.zSearch = e.target.value; renderZList(); renderZHighlight(); });
  qs("#z-show-fav").addEventListener("change", (e) => { state.zOnlyFav = e.target.checked; renderZList(); renderZHighlight(); });
  qs("#modeToggle").addEventListener("click", (e) => {
    const pressed = e.currentTarget.getAttribute("aria-pressed") === "true";
    const next = !pressed;
    e.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
    document.body.classList.toggle("more-night", next);
  });
};
const init = async () => {
  observeSections();
  wireInputs();
  try {
    const res = await fetch("./data/content.json");
    const json = await res.json();
    state.data = json;
    buildTagChips();
    buildMoodChips();
    renderZHighlight();
    renderZList();
    renderSongHighlight();
    renderSongList();
  } catch {
    qs("#z-phrase").textContent = "No se pudo cargar el contenido.";
    qs("#s-title").textContent = "No se pudo cargar el contenido.";
  }
};
document.addEventListener("DOMContentLoaded", init);
