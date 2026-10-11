import test from "node:test";
import assert from "node:assert/strict";
import { resolveHudStyle, fitStyledHudScale, isFavorite } from "../scripts/t20/hud-styles.js";
import { T20Hotbar } from "../scripts/t20/hotbar.js";
import { APPEARANCE_DEFAULTS } from "../scripts/t20/themes.js";

test("escolhas explícitas funcionam sem Ficha Heroica; escolha inválida preserva o atual", () => {
  for (const choice of ["original", "legend", "saga"]) assert.equal(resolveHudStyle(choice), choice);
  assert.equal(resolveHudStyle("unknown"), "original");
  assert.equal(resolveHudStyle("sheet", { preferences: { default: { layout: "legend" } } }), "original");
});

test("HUD não consulta preferências de um módulo ausente", () => {
  const originalGame = globalThis.game;
  globalThis.game = { modules: new Map(), user: { getFlag() { throw new Error("Módulo ausente"); } } };
  try {
    const hud = Object.create(T20Hotbar.prototype);
    assert.equal(hud._resolveStyle("sheet"), "original");
    assert.equal(hud._resolveStyle("legend"), "legend");
  } finally { globalThis.game = originalGame; }
});

test("aplicar escala antes de criar a estrutura visual é seguro", () => {
  const hud = Object.create(T20Hotbar.prototype);
  hud.root = { querySelector: () => null };
  assert.doesNotThrow(() => hud._applyViewportFit());
});

test("acompanhar a ficha troca de estilo por personagem e respeita a preferência padrão", () => {
  const preferences = { default: { layout: "legend" }, actors: { a: { layout: "legend" }, b: { layout: "saga" }, c: { layout: "tabs" } } };
  const resolve = id => resolveHudStyle("sheet", { active: true, preferences, actor: { id } });
  assert.equal(resolve("a"), "legend");
  assert.equal(resolve("b"), "saga");
  assert.equal(resolve("missing"), "legend");
  assert.equal(resolve("c"), "original");
  assert.equal(resolveHudStyle("sheet", { active: true }), "original");
});

test("encaixe considera altura, posição elevada e largura sem ampliar a escala escolhida", () => {
  assert.equal(fitStyledHudScale(.8, 1920, 1080, 1100, 300), .8);
  assert.equal(fitStyledHudScale(1, 900, 700, 1100, 300), 852 / 1100);
  assert.equal(fitStyledHudScale(1, 1920, 320, 1100, 300), 256 / 300);
  assert.equal(fitStyledHudScale(1, 1920, 320, 1100, 300, true), 200 / 300);
  assert.equal(fitStyledHudScale("invalid", 1920, 1080, 1100, 300), 1);
});

test("Favoritos usa somente a marcação nativa da ficha e inclui itens de todos os tipos", () => {
  const hud = Object.create(T20Hotbar.prototype);
  hud.filter = "favorites";
  const items = [
    { id: "spell", name: "Magia", type: "magia", flags: { tormenta20: { favorito: true } } },
    { id: "power", name: "Poder", type: "poder", flags: { tormenta20: { favorito: true } } },
    { id: "weapon", name: "Arma", type: "arma", flags: { tormenta20: { favorito: true } } },
    { id: "other", name: "Outro", type: "poder", flags: { otherModule: { favorite: true } } },
    { id: "none", name: "Nenhum", type: "poder" }
  ];
  hud.actor = { items };
  assert.deepEqual(hud._automaticDocuments().map(i => i.id).sort(), ["power", "spell", "weapon"]);
  assert.equal(isFavorite(null), false);
});

test("abrir, cancelar e salvar ajustes preserva a escolha de estilo independentemente do tema", async () => {
  const values = { ...APPEARANCE_DEFAULTS, style: "saga", scale: 1, opacity: .96, verticalPosition: "bottom", portraitSource: "actor", hideCoreHotbar: false };
  const originalGame = globalThis.game, originalUi = globalThis.ui;
  globalThis.game = { settings: { get: (_, key) => values[key], set: async (_, key, value) => { values[key] = value; } } };
  globalThis.ui = { notifications: { info() {} } };
  try {
    const hud = Object.create(T20Hotbar.prototype);
    let preview;
    hud.render = () => {};
    hud.applyClientSettings = draft => { preview = draft?.style ?? values.style; };
    hud._saveLayout = async () => {};
    hud._openSettings();
    assert.equal(hud.settingsDraft.style, "saga");
    hud.settingsDraft.style = "original";
    hud._closeSettings(true);
    assert.equal(values.style, "saga");
    assert.equal(preview, "saga");
    hud._openSettings();
    hud.settingsDraft.style = "legend";
    await hud._saveSettings();
    assert.equal(values.style, "legend");
    assert.equal(values.theme, APPEARANCE_DEFAULTS.theme);
    assert.equal(hud.settingsDraft, null);
    hud._openSettings();
    assert.equal(hud.settingsDraft.style, "legend");
  } finally { globalThis.game = originalGame; globalThis.ui = originalUi; }
});

test("Grimório removido retorna à organização Atual, inclusive ao acompanhar uma ficha", () => {
  assert.equal(resolveHudStyle("grimoire"), "original");
  assert.equal(resolveHudStyle("sheet", { active: true, preferences: { default: { layout: "grimoire" } } }), "original");
});
