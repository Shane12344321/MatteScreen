// ui-common.js — shared helpers for the panel and settings windows.

// Build a small live preview of a texture using the same feTurbulence engine
// the real overlay uses, so swatches look exactly like what you'll get.
function grainSvg(key, t) {
  const fid = "f_" + key;
  const tint =
    t.tint && t.tint !== "transparent" && t.tintOpacity > 0
      ? `<rect width="100%" height="100%" fill="${t.tint}" opacity="${Math.min(1, t.tintOpacity * 3.2)}"/>`
      : "";
  const grainOpacity = Math.min(0.85, 0.42 + (t.tintOpacity || 0));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">` +
    `<defs><filter id="${fid}" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="${t.type}" baseFrequency="${t.baseFrequency}" numOctaves="${t.numOctaves}" stitchTiles="stitch" result="n"/>` +
    `<feColorMatrix in="n" type="saturate" values="${t.saturate}"/>` +
    `</filter></defs>` +
    tint +
    `<rect width="100%" height="100%" filter="url(#${fid})" opacity="${grainOpacity}" style="mix-blend-mode:${t.blend}"/>` +
    `</svg>`
  );
}

window.MatteScreenUI = { grainSvg };
