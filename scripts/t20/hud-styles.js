// Layout choice is independent of the existing color/structural themes.
export const HUD_STYLES = Object.freeze({
  original: { label: "Atual", icon: "fa-solid fa-dragon", description: "Preserva a organização do tema atual." },
  legend: { label: "Lenda", icon: "fa-solid fa-crown", description: "Medalhão, esferas de vida e mana e uma barra de fantasia dourada." },
  saga: { label: "Saga", icon: "fa-solid fa-bolt", description: "Arte integrada, papel claro, tinta escura e recortes de quadrinhos em vermelho e azul-petróleo." },
  sheet: { label: "Acompanhar Ficha Heroica", icon: "fa-solid fa-link", description: "Segue o estilo pessoal da ficha do personagem selecionado. Sem a Ficha Heroica, usa o estilo atual." }
});

export function resolveHudStyle(choice = "original", { active = false, preferences, actor } = {}) {
  if (choice !== "sheet") return Object.hasOwn(HUD_STYLES, choice) ? choice : "original";
  if (!active) return "original";
  const key = String(actor?.id ?? actor?.uuid ?? "default");
  const layout = (preferences?.actors?.[key] ?? preferences?.default)?.layout;
  return ["legend", "saga"].includes(layout) ? layout : "original";
}

export function isFavorite(item) {
  return Boolean(item?.flags?.tormenta20?.favorito);
}

// Keep the entire new layout inside the usable viewport, including its height.
export function fitStyledHudScale(requested, width, height, shellWidth, shellHeight, raised = false) {
  const scale = Number.isFinite(Number(requested)) ? Math.min(1.35, Math.max(0.4, Number(requested))) : 1;
  return Math.max(0.1, Math.min(scale, Math.max(1, width - 48) / Math.max(1, shellWidth), Math.max(1, height - (raised ? 120 : 64)) / Math.max(1, shellHeight)));
}
