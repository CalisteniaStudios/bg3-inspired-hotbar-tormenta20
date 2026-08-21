export const THEME_PRESETS = Object.freeze({
  tormenta: Object.freeze({
    label: "Tormenta",
    primary: "#d6aa43",
    secondary: "#8f2630",
    panel: "#171116",
    text: "#f5ecd8"
  }),
  divine: Object.freeze({
    label: "Divino",
    primary: "#e7cb72",
    secondary: "#9d7834",
    panel: "#211d14",
    text: "#fff6d9"
  }),
  arcane: Object.freeze({
    label: "Arcano",
    primary: "#a986e8",
    secondary: "#3f68bb",
    panel: "#151525",
    text: "#eee9ff"
  }),
  shadow: Object.freeze({
    label: "Sombrio",
    primary: "#c14951",
    secondary: "#60347a",
    panel: "#120e16",
    text: "#eaddea"
  }),
  custom: Object.freeze({
    label: "Personalizado",
    primary: "#d6aa43",
    secondary: "#8f2630",
    panel: "#171116",
    text: "#f5ecd8"
  })
});

export const APPEARANCE_DEFAULTS = Object.freeze({
  theme: "tormenta",
  primaryColor: THEME_PRESETS.tormenta.primary,
  secondaryColor: THEME_PRESETS.tormenta.secondary,
  panelColor: THEME_PRESETS.tormenta.panel,
  textColor: THEME_PRESETS.tormenta.text,
  glowStrength: 0.55,
  ornamentStrength: 0.72,
  showLabels: true
});

export const APPEARANCE_KEYS = Object.freeze(Object.keys(APPEARANCE_DEFAULTS));

export const PORTRAIT_DEFAULTS = Object.freeze({
  zoom: 1,
  x: 50,
  y: 50
});

export function normalizePortraitTransform(value = {}) {
  const clamp = (number, min, max, fallback) => {
    if (number === null || number === undefined || number === "") return fallback;
    const parsed = Number(number);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  return {
    zoom: clamp(value.zoom, 1, 3, PORTRAIT_DEFAULTS.zoom),
    x: clamp(value.x, 0, 100, PORTRAIT_DEFAULTS.x),
    y: clamp(value.y, 0, 100, PORTRAIT_DEFAULTS.y)
  };
}

export function normalizePortraitTransforms(value = {}) {
  return {
    actor: normalizePortraitTransform(value.actor),
    token: normalizePortraitTransform(value.token)
  };
}

export function normalizeHex(value, fallback) {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
}

export function resolveAppearance(values = {}) {
  const theme = THEME_PRESETS[values.theme] ? values.theme : APPEARANCE_DEFAULTS.theme;
  const preset = THEME_PRESETS[theme] ?? THEME_PRESETS.tormenta;
  const custom = theme === "custom";
  return {
    theme,
    primaryColor: normalizeHex(custom ? values.primaryColor : preset.primary, preset.primary),
    secondaryColor: normalizeHex(custom ? values.secondaryColor : preset.secondary, preset.secondary),
    panelColor: normalizeHex(custom ? values.panelColor : preset.panel, preset.panel),
    textColor: normalizeHex(custom ? values.textColor : preset.text, preset.text),
    glowStrength: Math.min(1, Math.max(0, Number(values.glowStrength ?? APPEARANCE_DEFAULTS.glowStrength))),
    ornamentStrength: Math.min(1, Math.max(0, Number(values.ornamentStrength ?? APPEARANCE_DEFAULTS.ornamentStrength))),
    showLabels: values.showLabels ?? APPEARANCE_DEFAULTS.showLabels
  };
}

export function hexToRgba(hex, alpha = 1) {
  const value = normalizeHex(hex, "#000000").slice(1);
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, Number(alpha)))})`;
}
