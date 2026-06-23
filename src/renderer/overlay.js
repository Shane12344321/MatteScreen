// overlay.js — applies the current texture + intensity to the grain layer.

const grainEl = document.getElementById("grain");
const tintEl = document.getElementById("tint");
const feTurb = document.getElementById("feTurb");
const feSat = document.getElementById("feSat");

function applyState(state) {
  if (!state || !state.texture) return;
  const t = state.texture;

  // Procedural fractal grain parameters.
  feTurb.setAttribute("type", t.type || "fractalNoise");
  feTurb.setAttribute("baseFrequency", String(t.baseFrequency));
  feTurb.setAttribute("numOctaves", String(t.numOctaves));
  feSat.setAttribute("values", String(t.saturate ?? 0));

  // Blend mode + intensity for the grain.
  grainEl.style.mixBlendMode = t.blend || "multiply";
  grainEl.style.opacity = String(state.intensity ?? 0.22);

  // Optional color wash.
  if (t.tint && t.tint !== "transparent" && t.tintOpacity > 0) {
    tintEl.style.backgroundColor = t.tint;
    tintEl.style.opacity = String(t.tintOpacity);
  } else {
    tintEl.style.opacity = "0";
  }
}

if (window.mattescreen && window.mattescreen.onState) {
  window.mattescreen.onState(applyState);
}
