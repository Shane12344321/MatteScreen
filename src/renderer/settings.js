// settings.js — drives the Preferences window.

const $ = (id) => document.getElementById(id);
let UI = { settings: {}, textures: { TEXTURES: {}, TEXTURE_ORDER: [] } };
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
  const cur = UI.textures.TEXTURES[S.texture];
  $("texdesc").textContent = cur ? cur.description || "" : "";
}

async function selectTexture(key) {
  S.texture = key;
  document.querySelectorAll(".swatch").forEach((el) => el.classList.toggle("sel", el.dataset.key === key));
  const cur = UI.textures.TEXTURES[key];
  $("texdesc").textContent = cur ? cur.description || "" : "";
  UI = await window.mattescreen.setSettings({ texture: key });
  S = UI.settings;
}

function render() {
  renderSwatches();
  const pct = Math.round((S.intensity || 0.22) * 100);
  $("intensity").value = pct;
  $("intensityVal").textContent = pct + "%";
  $("enabled").checked = !!S.enabled;
  $("launchAtLogin").checked = !!S.launchAtLogin;
  $("pauseOnBattery").checked = !!S.pauseOnBattery;
  const sch = S.schedule || { enabled: false, start: "19:00", end: "07:00" };
  $("scheduleEnabled").checked = !!sch.enabled;
  $("scheduleStart").value = sch.start;
  $("scheduleEnd").value = sch.end;
}

function ingest(ui) {
  UI = ui;
  S = ui.settings;
  render();
}

async function update(patch) {
  UI = await window.mattescreen.setSettings(patch);
  S = UI.settings;
}

function wire() {
  $("enabled").addEventListener("change", (e) => update({ enabled: e.target.checked }));
  $("intensity").addEventListener("input", (e) => {
    const pct = Number(e.target.value);
    $("intensityVal").textContent = pct + "%";
    update({ intensity: pct / 100 });
  });
  $("launchAtLogin").addEventListener("change", (e) => update({ launchAtLogin: e.target.checked }));
  $("pauseOnBattery").addEventListener("change", (e) => update({ pauseOnBattery: e.target.checked }));
  const pushSchedule = () =>
    update({
      schedule: {
        enabled: $("scheduleEnabled").checked,
        start: $("scheduleStart").value || "19:00",
        end: $("scheduleEnd").value || "07:00",
      },
    });
  $("scheduleEnabled").addEventListener("change", pushSchedule);
  $("scheduleStart").addEventListener("change", pushSchedule);
  $("scheduleEnd").addEventListener("change", pushSchedule);
}

// External changes (e.g. from the menu-bar panel) keep this window in sync.
window.mattescreen.onUi(ingest);
wire();
(async () => ingest(await window.mattescreen.getState()))();
