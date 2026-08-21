import test from "node:test";
import assert from "node:assert/strict";

import {
  getActionKey,
  getActorStats,
  getManaCost,
  getQuantity,
  getSpellCircle,
  itemMatchesFilter,
  normalizeOrder,
  parseResourceInput,
  resourcePercent,
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
