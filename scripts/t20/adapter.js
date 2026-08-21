export const MODULE_ID = "bg3-inspired-hotbar-tormenta20";

export const T20_ITEM_TYPES = Object.freeze([
  "arma",
  "magia",
  "poder",
  "consumivel",
  "equipamento",
  "tesouro"
]);

export const ACTIONS = Object.freeze({
  action: { label: "Ação", icon: "fa-solid fa-bolt", color: "#d6aa43" },
  move: { label: "Movimento", icon: "fa-solid fa-person-running", color: "#4ca6d8" },
  full: { label: "Completa", icon: "fa-solid fa-hourglass", color: "#d46a55" },
  reaction: { label: "Reação", icon: "fa-solid fa-shield-halved", color: "#ad6bd6" },
  free: { label: "Livre", icon: "fa-solid fa-feather", color: "#62bd88" },
  passive: { label: "Passiva", icon: "fa-solid fa-circle-dot", color: "#8a8f9d" },
  special: { label: "Especial", icon: "fa-solid fa-star", color: "#d58a45" },
  minute: { label: "Minuto", icon: "fa-solid fa-clock", color: "#8a8f9d" },
  hour: { label: "Hora", icon: "fa-solid fa-clock", color: "#8a8f9d" },
  day: { label: "Dia", icon: "fa-solid fa-sun", color: "#8a8f9d" }
});

export const FILTERS = Object.freeze([
  { id: "all", label: "Todos", icon: "fa-solid fa-border-all" },
  { id: "action", label: "Ação", icon: ACTIONS.action.icon },
  { id: "move", label: "Movimento", icon: ACTIONS.move.icon },
  { id: "full", label: "Completa", icon: ACTIONS.full.icon },
  { id: "reaction", label: "Reação", icon: ACTIONS.reaction.icon },
  { id: "free", label: "Livre", icon: ACTIONS.free.icon },
  { id: "magia", label: "Magias", icon: "fa-solid fa-wand-sparkles" },
  { id: "poder", label: "Poderes", icon: "fa-solid fa-fire-flame-curved" }
]);

const TYPE_ORDER = Object.freeze({
  arma: 0,
  magia: 1,
  poder: 2,
  consumivel: 3,
  equipamento: 4,
  tesouro: 5
});

export function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, numberValue(value, min)));
}

export function signed(value) {
  const numeric = numberValue(value);
  return numeric >= 0 ? `+${numeric}` : String(numeric);
}

export function getActionKey(item) {
  const configured = item?.system?.ativacao?.execucao;
  if (configured) return configured;
  if (item?.type === "arma") return "action";
  if (["magia", "consumivel"].includes(item?.type)) return "action";
  if (item?.type === "equipamento") return "move";
  return "passive";
}

export function getActionData(item) {
  const key = getActionKey(item);
  return { key, ...(ACTIONS[key] ?? ACTIONS.special) };
}

export function getManaCost(item) {
  return Math.max(0, numberValue(item?.system?.ativacao?.custo));
}

export function getQuantity(item) {
  if (item?.system?.qtd === undefined) return null;
  return Math.max(0, numberValue(item.system.qtd));
}

export function getSpellCircle(item) {
  if (item?.type !== "magia") return null;
  return Math.max(0, numberValue(item?.system?.circulo));
}

export function isEquipped(item) {
  if (!item) return false;
  const slotsEnabled = globalThis.game?.settings?.get?.("tormenta20", "equipmentSlots");
  if (slotsEnabled) return numberValue(item.system?.equipado2?.slot) > 0;
  const equipped = item.system?.equipado;
  return equipped === true || numberValue(equipped) > 0;
}

export function isUsableItem(item, { includePassive = true } = {}) {
  if (!item || !T20_ITEM_TYPES.includes(item.type)) return false;
  if (!includePassive && getActionKey(item) === "passive") return false;
  if (item.type === "tesouro" && !item.system?.ativacao?.execucao) return false;
  return true;
}

export function itemMatchesFilter(item, filter) {
  if (!item || filter === "all") return Boolean(item);
  if (["magia", "poder"].includes(filter)) return item.type === filter;
  return getActionKey(item) === filter;
}

export function sortItems(items) {
  return [...items].sort((left, right) => {
    const actionLeft = Object.keys(ACTIONS).indexOf(getActionKey(left));
    const actionRight = Object.keys(ACTIONS).indexOf(getActionKey(right));
    const typeDifference = (TYPE_ORDER[left.type] ?? 99) - (TYPE_ORDER[right.type] ?? 99);
    if (typeDifference) return typeDifference;
    if (left.type === "magia" && right.type === "magia") {
      const circleDifference = getSpellCircle(left) - getSpellCircle(right);
      if (circleDifference) return circleDifference;
    }
    if (actionLeft !== actionRight) return actionLeft - actionRight;
    return String(left.name ?? "").localeCompare(String(right.name ?? ""), "pt-BR");
  });
}

export function getActorStats(actor) {
  const pv = actor?.system?.attributes?.pv ?? {};
  const pm = actor?.system?.attributes?.pm ?? {};
  const defense = actor?.system?.attributes?.defesa?.value ?? actor?.system?.attributes?.defesa ?? 0;
  const level = actor?.system?.attributes?.nivel?.value ?? actor?.system?.attributes?.nivel ?? 0;
  return {
    pv: {
      value: numberValue(pv.value),
      max: Math.max(0, numberValue(pv.max)),
      temp: Math.max(0, numberValue(pv.temp))
    },
    pm: {
      value: numberValue(pm.value),
      max: Math.max(0, numberValue(pm.max)),
      temp: Math.max(0, numberValue(pm.temp))
    },
    defense: numberValue(defense),
    level: numberValue(level),
    deathSave: {
      value: numberValue(actor?.system?.resources?.deathsave?.value),
      max: Math.max(1, numberValue(actor?.system?.resources?.deathsave?.max, 3))
    }
  };
}

export function resourcePercent(resource) {
  if (!resource?.max) return 0;
  return clamp((numberValue(resource.value) / numberValue(resource.max)) * 100, 0, 100);
}

export function getItemDescription(item) {
  return item?.system?.description?.value ?? item?.description ?? "";
}

export function getTypeLabel(item) {
  const labels = {
    arma: "Arma",
    magia: "Magia",
    poder: "Poder",
    consumivel: "Consumível",
    equipamento: "Equipamento",
    tesouro: "Tesouro",
    macro: "Macro"
  };
  return labels[item?.type] ?? String(item?.type ?? "Item");
}

export function getDefaultActorOrder(actor) {
  return sortItems((actor?.items ?? []).filter((item) => isUsableItem(item))).map((item) => item.uuid);
}

export function normalizeOrder(actor, savedOrder = []) {
  const usable = (actor?.items ?? []).filter((item) => isUsableItem(item));
  const byUuid = new Map(usable.map((item) => [item.uuid, item]));
  const result = [];
  for (const uuid of Array.isArray(savedOrder) ? savedOrder : []) {
    if (byUuid.has(uuid) && !result.includes(uuid)) result.push(uuid);
  }
  for (const item of sortItems(usable)) {
    if (!result.includes(item.uuid)) result.push(item.uuid);
  }
  return result;
}

export function resolveActorDocument(actor, uuid) {
  if (!uuid) return null;
  const embedded = actor?.items?.find?.((item) => item.uuid === uuid);
  if (embedded) return embedded;
  try {
    return globalThis.fromUuidSync?.(uuid) ?? null;
  } catch (_error) {
    return null;
  }
}

export async function useDocument(document, event = {}) {
  if (!document) return false;
  if (document.documentName === "Macro" || typeof document.execute === "function") {
    await document.execute?.({ actor: document.actor, token: document.actor?.token });
    return true;
  }
  if (typeof document.roll === "function") {
    await document.roll({
      configureDialog: !event.shiftKey,
      rollMode: globalThis.game?.settings?.get?.("core", "rollMode"),
      createMessage: true,
      extra: { event }
    });
    return true;
  }
  document.sheet?.render?.(true);
  return false;
}

export async function rollAbility(actor, key, event = {}) {
  if (!actor?.rollAtributo) return false;
  await actor.rollAtributo(key, { event, message: true });
  return true;
}

export async function rollSkill(actor, key, event = {}) {
  if (!actor?.rollPericia) return false;
  await actor.rollPericia(key, { event, message: true });
  return true;
}

export async function restActor(actor, modifier) {
  if (!actor?.descanso) return false;
  await actor.descanso(numberValue(modifier, 1), 0, 0, false, false, true);
  return true;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainText(html) {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
