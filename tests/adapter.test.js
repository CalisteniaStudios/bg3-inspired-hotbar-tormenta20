import test from "node:test";
import assert from "node:assert/strict";

import {
  actorForDocument,
  getActionKey,
  getActorEffects,
  getActorStats,
  getCoreMessageMode,
  getCombatActionState,
  enterCombatAndRollInitiative,
  getDragEventData,
  getManaCost,
  getQuantity,
  getSpellCircle,
  itemMatchesFilter,
  installSceneControlToggle,
  normalizeOrder,
  parseResourceInput,
  resourcePercent,
  resolveActorEffect,
  signed,
  sortItems,
  useDocument
} from "../scripts/t20/adapter.js";

function item(uuid, name, type, system = {}) {
  return { uuid, name, type, system };
}

test("lê a ativação nativa do Tormenta20 e aplica padrões seguros", () => {
  assert.equal(getActionKey(item("1", "Ataque", "arma")), "action");
  assert.equal(getActionKey(item("2", "Passo", "poder", { ativacao: { execucao: "move" } })), "move");
  assert.equal(getActionKey(item("3", "Aura", "poder", { ativacao: { execucao: "passive" } })), "passive");
  assert.equal(getActionKey(item("4", "Manto", "equipamento")), "passive");
  assert.equal(getActionKey(item("5", "Passo", "poder", { ativacao: { execucao: "Movimento" } })), "move");
});

test("lê custo de PM, quantidade e círculo", () => {
  const spell = item("1", "Bola de Fogo", "magia", { ativacao: { custo: 3 }, qtd: 2, circulo: 2 });
  assert.equal(getManaCost(spell), 3);
  assert.equal(getQuantity(spell), 2);
  assert.equal(getSpellCircle(spell), 2);
});

test("filtra itens por ação e tipo", () => {
  const spell = item("1", "Luz", "magia", { ativacao: { execucao: "action" } });
  assert.equal(itemMatchesFilter(spell, "magia"), true);
  assert.equal(itemMatchesFilter(spell, "action"), true);
  assert.equal(itemMatchesFilter(spell, "items"), false);
  assert.equal(itemMatchesFilter(spell, "custom"), false);
  assert.equal(itemMatchesFilter(spell, "reaction"), false);
  assert.equal(itemMatchesFilter(item("2", "Armadura", "equipamento"), "items"), true);
});

test("normaliza ordem preservando escolhas e acrescentando itens novos", () => {
  const actor = {
    items: [
      item("a", "Espada", "arma"),
      item("b", "Curar Ferimentos", "magia", { circulo: 1 }),
      item("c", "Poder", "poder", { ativacao: { execucao: "free" } })
    ]
  };
  assert.deepEqual(normalizeOrder(actor, ["c", "missing", "a", "c"]), ["c", "a", "b"]);
});

test("ordena armas, magias por círculo e poderes", () => {
  const values = [
    item("p", "Zelo", "poder"),
    item("m2", "Magia 2", "magia", { circulo: 2 }),
    item("a", "Arco", "arma"),
    item("m1", "Magia 1", "magia", { circulo: 1 })
  ];
  assert.deepEqual(sortItems(values).map((entry) => entry.uuid), ["a", "m1", "m2", "p"]);
});

test("lê recursos da ficha e limita percentuais", () => {
  const actor = {
    system: {
      attributes: {
        pv: { value: 15, max: 20, temp: 3 },
        pm: { value: 30, max: 20 },
        defesa: { value: 18 },
        nivel: { value: 7 }
      },
      resources: { deathsave: { value: 2, max: 3 } }
    }
  };
  const stats = getActorStats(actor);
  assert.deepEqual(stats.pv, { value: 15, max: 20, temp: 3 });
  assert.equal(stats.defense, 18);
  assert.equal(stats.level, 7);
  assert.equal(resourcePercent(stats.pv), 75);
  assert.equal(resourcePercent(stats.pm), 100);
  assert.equal(signed(-2), "-2");
  assert.equal(signed(4), "+4");
});

test("aceita valor exato ou ajuste relativo de PV e PM", () => {
  assert.equal(parseResourceInput("35", 20), 35);
  assert.equal(parseResourceInput("+10", 20), 30);
  assert.equal(parseResourceInput("-5", 20), 15);
  assert.equal(parseResourceInput(" 12,5 ", 0), 12.5);
  assert.equal(parseResourceInput("cinco", 20), null);
});

test("executa macros com o ator e token selecionados", async () => {
  let context = null;
  const macro = {
    documentName: "Macro",
    execute: async (value) => { context = value; }
  };
  const actor = { id: "ator" };
  const token = { document: { id: "token" } };
  assert.equal(await useDocument(macro, {}, { actor, token }), true);
  assert.deepEqual(context, { actor, token: token.document });
});

test("encaminha o evento e o modo de mensagem ao rolar itens no Foundry 14", async () => {
  const previousGame = globalThis.game;
  const event = { shiftKey: true };
  let options = null;
  globalThis.game = {
    settings: {
      get: (_namespace, key) => key === "messageMode" ? "gmroll" : undefined
    }
  };
  try {
    const document = { roll: async (value) => { options = value; } };
    assert.equal(await useDocument(document, event), true);
    assert.equal(options.configureDialog, false);
    assert.equal(options.rollMode, "gmroll");
    assert.equal(options.messageMode, "gmroll");
    assert.equal(options.event, event);
    assert.equal(options.extra.event, event);
  } finally {
    globalThis.game = previousGame;
  }
});

test("usa o nome antigo do modo de rolagem como compatibilidade com Foundry 13", () => {
  const settings = {
    get: (_namespace, key) => {
      if (key === "messageMode") throw new Error("setting ausente");
      return key === "rollMode" ? "blindroll" : undefined;
    }
  };
  assert.equal(getCoreMessageMode(settings), "blindroll");
});

test("lê dados arrastados pela API moderna do Foundry 14 e pelo payload serializado", () => {
  const previousFoundry = globalThis.foundry;
  globalThis.foundry = {
    applications: {
      ux: {
        TextEditor: { implementation: { getDragEventData: () => ({ type: "Item", uuid: "Actor.a.Item.b" }) } }
      }
    }
  };
  try {
    assert.deepEqual(getDragEventData({}), { type: "Item", uuid: "Actor.a.Item.b" });
  } finally {
    globalThis.foundry = previousFoundry;
  }
  const event = { dataTransfer: { getData: () => JSON.stringify({ type: "Macro", id: "m1" }) } };
  assert.deepEqual(getDragEventData(event), { type: "Macro", id: "m1" });
});

test("inclui efeitos transferidos por itens e resolve efeitos pelo UUID", () => {
  const direct = { id: "direct", uuid: "Actor.a.ActiveEffect.direct", name: "Direto" };
  const transferred = { id: "item", uuid: "Actor.a.Item.i.ActiveEffect.item", name: "Transferido", transfer: true };
  const temporary = { id: "temporary", uuid: "Actor.a.Item.i.ActiveEffect.temporary", transfer: false };
  const actor = {
    effects: [direct],
    allApplicableEffects: () => [direct, transferred],
    appliedEffects: [transferred],
    items: [{ effects: [transferred, temporary] }]
  };
  assert.deepEqual(getActorEffects(actor), [direct, transferred]);
  assert.equal(resolveActorEffect(actor, transferred.uuid), transferred);
  assert.equal(resolveActorEffect(actor, "direct"), direct);
});

test("encontra o ator de itens e efeitos aninhados", () => {
  const actor = { id: "a", documentName: "Actor" };
  const itemDocument = { documentName: "Item", actor };
  const effect = { documentName: "ActiveEffect", parent: itemDocument };
  assert.equal(actorForDocument(actor), actor);
  assert.equal(actorForDocument(itemDocument), actor);
  assert.equal(actorForDocument(effect), actor);
});

test("registra o botão da HUD nas APIs de controles do Foundry 13 e 14", () => {
  const calls = [];
  const legacy = [{ name: "token", tools: [] }];
  assert.equal(installSceneControlToggle(legacy, { active: true, onToggle: (active) => calls.push(active) }), true);
  assert.equal(legacy[0].tools[0].active, true);
  legacy[0].tools[0].onClick(false);

  const modern = { tokens: { name: "tokens", tools: {} } };
  assert.equal(installSceneControlToggle(modern, { onToggle: (active) => calls.push(active) }), true);
  assert.equal(modern.tokens.tools.toggleBG3T20.button, true);
  modern.tokens.tools.toggleBG3T20.onChange({}, true);
  assert.deepEqual(calls, [false, true]);
});

test("mostra iniciativa desabilitada quando não há encontro ativo", () => {
  assert.deepEqual(getCombatActionState({ actor: { id: "a" }, token: { id: "t" }, scene: { id: "s" } }), {
    action: "initiative",
    label: "Iniciativa",
    icon: "fa-solid fa-dice-d20",
    disabled: true,
    isCurrent: false
  });
});

test("habilita iniciativa em encontro ainda não iniciado", () => {
  const state = getCombatActionState({
    combat: { scene: { id: "s" }, started: false, combatants: [] },
    actor: { id: "a" },
    token: { id: "t" },
    scene: { id: "s" }
  });
  assert.equal(state.action, "initiative");
  assert.equal(state.disabled, false);
});

test("desabilita nova iniciativa quando o token já rolou", () => {
  const state = getCombatActionState({
    combat: { scene: "s", started: false, combatants: [{ tokenId: "t", initiative: 18 }] },
    actor: { id: "a" },
    token: { id: "t" },
    scene: { id: "s" }
  });
  assert.equal(state.action, "initiative");
  assert.equal(state.disabled, true);
});

test("durante o combate só habilita encerrar turno para o ator atual", () => {
  const current = getCombatActionState({
    combat: { scene: "s", started: true, combatant: { actorId: "a" }, combatants: [{ tokenId: "t", actorId: "a", initiative: 20 }] },
    actor: { id: "a" }, token: { id: "t" }, scene: "s"
  });
  const waiting = getCombatActionState({
    combat: { scene: "s", started: true, combatant: { actorId: "outro" }, combatants: [{ tokenId: "t", actorId: "a", initiative: 20 }] },
    actor: { id: "a" }, token: { id: "t" }, scene: "s"
  });
  assert.equal(current.action, "end-turn");
  assert.equal(current.disabled, false);
  assert.equal(waiting.disabled, true);
});

test("oferece iniciativa para um ator que ainda não entrou no combate iniciado", () => {
  const state = getCombatActionState({
    combat: {
      scene: "s",
      started: true,
      combatant: { actorId: "outro" },
      combatants: [{ tokenId: "outro-token", actorId: "outro", initiative: 17 }]
    },
    actor: { id: "a" },
    token: { id: "t" },
    scene: "s"
  });
  assert.equal(state.action, "initiative");
  assert.equal(state.disabled, false);
});

test("oferece iniciativa para combatente que entrou sem rolar", () => {
  const state = getCombatActionState({
    combat: {
      scene: "s",
      started: true,
      combatant: { actorId: "outro" },
      combatants: [{ tokenId: "t", actorId: "a", initiative: null }]
    },
    actor: { id: "a" },
    token: { id: "t" },
    scene: "s"
  });
  assert.equal(state.action, "initiative");
  assert.equal(state.disabled, false);
});

test("entra no encontro e rola iniciativa sem abrir configuração", async () => {
  let options;
  const actor = {
    async rollInitiative(received) {
      options = received;
    }
  };
  assert.equal(await enterCombatAndRollInitiative(actor), true);
  assert.deepEqual(options, {
    createCombatants: true,
    rerollInitiative: false
  });
  assert.equal(await enterCombatAndRollInitiative({}), false);
});
