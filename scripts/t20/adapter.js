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

const ACTION_ALIASES = Object.freeze({
  action: "action",
  acao: "action",
  ação: "action",
  padrao: "action",
  padrão: "action",
  move: "move",
  movement: "move",
  movimento: "move",
  full: "full",
  complete: "full",
  completa: "full",
  reaction: "reaction",
  reacao: "reaction",
  reação: "reaction",
  free: "free",
  livre: "free",
  passive: "passive",
  passiva: "passive",
  passivo: "passive",
  special: "special",
  especial: "special",
  minute: "minute",
  minuto: "minute",
  hour: "hour",
  hora: "hour",
  day: "day",
  dia: "day"
});

export const FILTERS = Object.freeze([
  { id: "action", label: "Ação", icon: ACTIONS.action.icon },
  { id: "move", label: "Movimento", icon: ACTIONS.move.icon },
  { id: "full", label: "Completa", icon: ACTIONS.full.icon },
  { id: "reaction", label: "Reação", icon: ACTIONS.reaction.icon },
  { id: "free", label: "Livre", icon: ACTIONS.free.icon },
  { id: "magia", label: "Magias", icon: "fa-solid fa-wand-sparkles" },
  { id: "poder", label: "Poderes", icon: "fa-solid fa-fire-flame-curved" },
  { id: "items", label: "Itens", icon: "fa-solid fa-backpack" },
  { id: "custom", label: "Personalizado", icon: "fa-solid fa-sparkles" }
]);

const ITEM_FILTER_TYPES = new Set(["arma", "consumivel", "equipamento", "tesouro"]);

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
  const configured = String(item?.system?.ativacao?.execucao ?? "").trim().toLocaleLowerCase("pt-BR");
  if (configured) return ACTION_ALIASES[configured] ?? configured;
  if (item?.type === "arma") return "action";
  if (["magia", "consumivel"].includes(item?.type)) return "action";
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
  return true;
}

export function itemMatchesFilter(item, filter) {
  if (!item || filter === "custom") return false;
  if (["magia", "poder"].includes(filter)) return item.type === filter;
  if (filter === "items") return ITEM_FILTER_TYPES.has(item.type);
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
  if (item?.documentName === "Macro") return "Macro";
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

function collectionValues(collection) {
  if (!collection) return [];
  try {
    return Array.from(collection.values?.() ?? collection);
  } catch (_error) {
    return [];
  }
}

export function getActorEffects(actor) {
  const effects = [];
  const seen = new Set();
  const add = (effect) => {
    if (!effect) return;
    const key = effect.uuid ?? `${effect.parent?.uuid ?? effect.parent?.id ?? "effect"}.${effect.id ?? effect.name ?? effects.length}`;
    if (seen.has(key)) return;
    seen.add(key);
    effects.push(effect);
  };
  const addCollection = (collection) => collectionValues(collection).forEach(add);

  addCollection(actor?.effects);
  try {
    addCollection(actor?.allApplicableEffects?.());
  } catch (_error) {
    // Some system documents may not be fully prepared while Foundry is loading.
  }
  addCollection(actor?.appliedEffects);
  for (const item of collectionValues(actor?.items)) {
    for (const effect of collectionValues(item?.effects)) {
      if (effect?.transfer === true) add(effect);
    }
  }
  return effects;
}

export function resolveActorEffect(actor, reference) {
  if (!reference) return null;
  const value = String(reference);
  const embedded = getActorEffects(actor).find((effect) => effect.uuid === value || effect.id === value);
  if (embedded) return embedded;
  try {
    return globalThis.fromUuidSync?.(value) ?? null;
  } catch (_error) {
    return null;
  }
}

export function actorForDocument(document) {
  let current = document;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current.documentName === "Actor") return current;
    if (current.actor?.documentName === "Actor") return current.actor;
    current = current.parent;
  }
  return null;
}

export function getCoreMessageMode(settings = globalThis.game?.settings) {
  for (const key of ["messageMode", "rollMode"]) {
    try {
      const value = settings?.get?.("core", key);
      if (value !== undefined && value !== null) return value;
    } catch (_error) {
      // Foundry 13 and 14 register different names for this setting.
    }
  }
  return undefined;
}

export function getDragEventData(event) {
  try {
    const modernTextEditor = globalThis.foundry?.applications?.ux?.TextEditor?.implementation;
    const data = modernTextEditor?.getDragEventData?.(event) ?? globalThis.TextEditor?.getDragEventData?.(event);
    if (data) return data;
  } catch (_error) {
    // Fall through to the serialized drag payload.
  }
  try {
    return JSON.parse(event?.dataTransfer?.getData?.("text/plain") || "{}");
  } catch (_error) {
    return {};
  }
}

export function installSceneControlToggle(controls, { active = false, onToggle } = {}) {
  const tokenControls = controls?.tokens ?? controls?.find?.((control) => control.name === "token" || control.name === "tokens");
  if (!tokenControls) return false;
  const base = {
    name: "toggleBG3T20",
    title: "Alternar BG3 Hotbar para Tormenta20",
    icon: "fa-solid fa-dragon",
    toggle: true,
    active: Boolean(active),
    order: 90
  };

  if (Array.isArray(tokenControls.tools) || Array.isArray(controls)) {
    tokenControls.tools ??= [];
    tokenControls.tools.push({
      ...base,
      onClick: (state) => onToggle?.(Boolean(state))
    });
  } else {
    tokenControls.tools ??= {};
    tokenControls.tools.toggleBG3T20 = {
      ...base,
      button: true,
      onChange: (_event, state) => onToggle?.(Boolean(state))
    };
  }
  return true;
}

export function parseResourceInput(input, currentValue = 0) {
  const text = String(input ?? "").trim().replace(",", ".");
  if (!text) return null;
  const current = numberValue(currentValue);
  if (/^[+-]\d+(?:\.\d+)?$/.test(text)) return current + Number(text);
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return null;
}

export function getCombatActionState({ combat, actor, token, scene } = {}) {
  const combatSceneId = combat?.scene?.id ?? combat?.scene ?? null;
  const sceneId = scene?.id ?? scene ?? null;
  const hasEncounter = Boolean(combat && (!sceneId || !combatSceneId || combatSceneId === sceneId));
  const started = Boolean(hasEncounter && combat.started);
  const actorId = actor?.id ?? null;
  const tokenId = token?.document?.id ?? token?.id ?? null;
  const activeActorId = combat?.combatant?.actor?.id ?? combat?.combatant?.actorId ?? null;

  const combatants = Array.from(combat?.combatants ?? []);
  const existing = combatants.find((entry) => {
    const entryTokenId = entry.tokenId ?? entry.token?.id ?? null;
    const entryActorId = entry.actorId ?? entry.actor?.id ?? null;
    return Boolean((tokenId && entryTokenId === tokenId) || (!tokenId && actorId && entryActorId === actorId));
  });
  const alreadyRolled = existing?.initiative !== null && existing?.initiative !== undefined;

  if (started && existing) {
    const isTurn = Boolean(actorId && activeActorId === actorId);
    return {
      action: alreadyRolled ? "end-turn" : "initiative",
      label: alreadyRolled ? "Encerrar turno" : "Iniciativa",
      icon: alreadyRolled ? "fa-solid fa-forward-step" : "fa-solid fa-dice-d20",
      disabled: alreadyRolled ? !isTurn : false,
      isCurrent: isTurn
    };
  }

  return {
    action: "initiative",
    label: "Iniciativa",
    icon: "fa-solid fa-dice-d20",
    disabled: !hasEncounter || !actor || !token || alreadyRolled,
    isCurrent: false
  };
}

export async function enterCombatAndRollInitiative(actor) {
  if (!actor?.rollInitiative) return false;
  await actor.rollInitiative({
    createCombatants: true,
    rerollInitiative: false
  });
  return true;
}

export async function useDocument(document, event = {}, context = {}) {
  if (!document) return false;
  if (document.documentName === "Macro" || typeof document.execute === "function") {
    await document.execute?.({
      actor: context.actor ?? document.actor ?? null,
      token: context.token?.document ?? context.token ?? context.actor?.token ?? document.actor?.token ?? null
    });
    return true;
  }
  if (typeof document.roll === "function") {
    const messageMode = getCoreMessageMode();
    await document.roll({
      configureDialog: !event.shiftKey,
      rollMode: messageMode,
      messageMode,
      createMessage: true,
      event,
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
