// panel.js — the menu-bar popover. Quick controls with a live slider + swatches.

const $ = (id) => document.getElementById(id);
let UI = { settings: {}, textures: { TEXTURES: {}, TEXTURE_ORDER: [] }, active: false };
let S = {};

function renderSwatches() {
  const wrap = $("swatches");
  wrap.innerHTML = "";
  for (const key of UI.textures.TEXTURE_ORDER) {
    const t = UI.textures.TEXTURES[key];
    const el = document.createElement("div");
    el.className = "swatch" + (S.texture === key ? " sel" : "");
    el.dataset.key = key;
    el.title = t.description || t.label;
    el.innerHTML = window.MatteScreenUI.grainSvg(key, t) + `<div class="name">${t.label}</div>`;
    el.addEventListener("click", () => selectTexture(key));
    wrap.appendChild(el);
  }
}

function markSelected(key) {
  document.querySelectorAll(".swatch").forEach((el) => {
    el.classList.toggle("sel", el.dataset.key === key);
  });
}

function render() {
  $("enabled").checked = !!S.enabled;
  $("status").textContent = UI.active ? "Active" : S.enabled ? "Paused" : "Off";
  const pct = Math.round((S.intensity || 0.22) * 100);
  $("intensity").value = pct;
  $("pct").textContent = pct + "%";
  renderSwatches();
  reportHeight();
}

function ingest(ui) {
  UI = ui;
  S = ui.settings;
  render();
}

async function selectTexture(key) {
  S.texture = key;
  markSelected(key);
  UI = await window.mattescreen.setSettings({ texture: key });
  S = UI.settings;
  $("status").textContent = UI.active ? "Active" : S.enabled ? "Paused" : "Off";
}

function reportHeight() {
  // Let main size the window exactly to the card.
  requestAnimationFrame(() => window.mattescreen.reportHeight(document.body.scrollHeight));
}

function wire() {
  $("enabled").addEventListener("change", async (e) => {
    UI = await window.mattescreen.setSettings({ enabled: e.target.checked });
    S = UI.settings;
    $("status").textContent = UI.active ? "Active" : S.enabled ? "Paused" : "Off";
  });
  $("intensity").addEventListener("input", (e) => {
    const p = Number(e.target.value);
    $("pct").textContent = p + "%";
    window.mattescreen.setSettings({ intensity: p / 100 });
  });
  document.querySelectorAll(".snooze .btn").forEach((b) => {
    b.addEventListener("click", async () => {
      UI = await window.mattescreen.snooze(Number(b.dataset.min));
      S = UI.settings;
      $("status").textContent = UI.active ? "Active" : "Paused";
    });
  });
  $("settings").addEventListener("click", () => window.mattescreen.openSettings());
  $("quit").addEventListener("click", () => window.mattescreen.quit());
}

window.mattescreen.onUi(ingest);
wire();
(async () => ingest(await window.mattescreen.getState()))();
