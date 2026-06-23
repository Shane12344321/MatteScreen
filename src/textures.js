// textures.js
// Each texture is defined as procedural SVG feTurbulence noise plus optional
// color tint and blend settings. These are shared between the renderer and the
// settings UI so the names always stay in sync.
//
// baseFrequency  -> grain size (higher = finer grain)
// numOctaves     -> grain complexity / softness
// type           -> 'fractalNoise' (cloudy, soft) or 'turbulence' (fibrous)
// saturate       -> 0 = grayscale grain, >0 keeps some color in the grain
// tint           -> CSS color painted under the grain (transparent = none)
// tintOpacity    -> strength of the tint wash (0..1)
// blend          -> CSS mix-blend-mode for the grain layer over the screen

const TEXTURES = {
  classic_matte: {
    label: "Classic Matte",
    description: "A smooth, diffused finish that softens harsh pixels and contrast.",
    baseFrequency: 0.9,
    numOctaves: 2,
    type: "fractalNoise",
    saturate: 0,
    tint: "transparent",
    tintOpacity: 0,
    blend: "multiply",
  },
  whisper_weave: {
    label: "Whisper Weave",
    description: "A delicate, tactile fabric texture that cuts through screen glare.",
    baseFrequency: 0.42,
    numOctaves: 3,
    type: "turbulence",
    saturate: 0,
    tint: "#efe9df",
    tintOpacity: 0.05,
    blend: "overlay",
  },
  sunbaked_parchment: {
    label: "Sunbaked Parchment",
    description: "A rich, heavy grain bathed in a comforting amber glow.",
    baseFrequency: 0.7,
    numOctaves: 2,
    type: "fractalNoise",
    saturate: 0,
    tint: "#d9a441",
    tintOpacity: 0.16,
    blend: "multiply",
  },
  saddle_linen: {
    label: "Saddle Linen",
    description: "A coarse, natural linen weave with warm earthy tones.",
    baseFrequency: 0.32,
    numOctaves: 4,
    type: "turbulence",
    saturate: 0,
    tint: "#caa56b",
    tintOpacity: 0.1,
    blend: "overlay",
  },
  vellum_mist: {
    label: "Vellum Mist",
    description: "A soft, semi-translucent haze that diffuses light like frosted vellum.",
    baseFrequency: 1.1,
    numOctaves: 2,
    type: "fractalNoise",
    saturate: 0,
    tint: "#f4f6f7",
    tintOpacity: 0.07,
    blend: "soft-light",
  },
};

const TEXTURE_ORDER = [
  "classic_matte",
  "whisper_weave",
  "sunbaked_parchment",
  "saddle_linen",
  "vellum_mist",
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TEXTURES, TEXTURE_ORDER };
}
