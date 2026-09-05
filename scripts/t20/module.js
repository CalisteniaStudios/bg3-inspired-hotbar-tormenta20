import { MODULE_ID, actorForDocument, installSceneControlToggle } from "./adapter.js";
import { T20Hotbar } from "./hotbar.js";
import { APPEARANCE_DEFAULTS, THEME_PRESETS } from "./themes.js";

function registerSettings() {
  game.settings.register(MODULE_ID, "enabled", {
    name: "Exibir a hotbar inspirada em BG3",
    hint: "Mostra a interface quando um token controlado é selecionado.",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      ui.BG3T20?.applyClientSettings();
      ui.BG3T20?.render();
    }
  });
  game.settings.register(MODULE_ID, "scale", {
    name: "Escala da interface",
    hint: "Ajusta o tamanho de toda a hotbar.",
    scope: "client",
    config: false,
    type: Number,
    range: { min: 0.65, max: 1.35, step: 0.05 },
    default: 1,
    onChange: () => { ui.BG3T20?.applyClientSettings(); ui.BG3T20?.render(); }
  });
  game.settings.register(MODULE_ID, "opacity", {
    name: "Opacidade da interface",
    hint: "Ajusta a transparência da hotbar sem alterar seus ícones.",
    scope: "client",
    config: false,
    type: Number,
    range: { min: 0.45, max: 1, step: 0.05 },
    default: 0.96,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });
  game.settings.register(MODULE_ID, "verticalPosition", {
    name: "Posição vertical",
    hint: "Escolha se a hotbar fica encostada na base ou um pouco acima dela.",
    scope: "client",
    config: false,
    type: String,
    choices: { bottom: "Na base da tela", raised: "Elevada" },
    default: "bottom",
    onChange: () => ui.BG3T20?.applyClientSettings()
  });
  game.settings.register(MODULE_ID, "portraitSource", {
    name: "Imagem do retrato",
    hint: "Define se o retrato usa a imagem da ficha ou a textura do token.",
    scope: "client",
    config: false,
    type: String,
    choices: { actor: "Imagem da ficha", token: "Imagem do token" },
    default: "actor",
    onChange: () => ui.BG3T20?.render()
  });
  game.settings.register(MODULE_ID, "hideCoreHotbar", {
    name: "Ocultar hotbar padrão do Foundry",
    hint: "Esconde a barra de macros nativa enquanto este módulo estiver ativo.",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });

  game.settings.register(MODULE_ID, "theme", {
    name: "Tema da HUD",
    scope: "client",
    config: false,
    type: String,
    choices: Object.fromEntries(Object.entries(THEME_PRESETS).map(([key, value]) => [key, value.label])),
    default: APPEARANCE_DEFAULTS.theme,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });

  for (const [key, name] of [
    ["primaryColor", "Cor principal"],
    ["secondaryColor", "Cor secundária"],
    ["panelColor", "Cor do painel"],
    ["textColor", "Cor do texto"]
  ]) {
    game.settings.register(MODULE_ID, key, {
      name,
      scope: "client",
      config: false,
      type: String,
      default: APPEARANCE_DEFAULTS[key],
      onChange: () => ui.BG3T20?.applyClientSettings()
    });
  }

  game.settings.register(MODULE_ID, "glowStrength", {
    name: "Intensidade do brilho",
    scope: "client",
    config: false,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: APPEARANCE_DEFAULTS.glowStrength,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });

  game.settings.register(MODULE_ID, "ornamentStrength", {
    name: "Intensidade dos ornamentos",
    scope: "client",
    config: false,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: APPEARANCE_DEFAULTS.ornamentStrength,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });

  game.settings.register(MODULE_ID, "showLabels", {
    name: "Exibir nomes nos atalhos",
    scope: "client",
    config: false,
    type: Boolean,
    default: APPEARANCE_DEFAULTS.showLabels,
    onChange: () => ui.BG3T20?.applyClientSettings()
  });
}

function registerKeybindings() {
  game.keybindings.register(MODULE_ID, "toggle", {
    name: "Mostrar/ocultar a hotbar de Tormenta20",
    hint: "Alterna rapidamente a interface inspirada em BG3.",
    editable: [{ key: "KeyH" }],
    onDown: () => { ui.BG3T20?.toggle(); return true; },
    restricted: false
  });
}

function registerSceneControl() {
  Hooks.on("getSceneControlButtons", (controls) => {
    installSceneControlToggle(controls, {
      active: game.settings.get(MODULE_ID, "enabled"),
      onToggle: (active) => ui.BG3T20?.toggle(active)
    });
  });
}

Hooks.once("init", () => {
  registerSettings();
  registerKeybindings();
  registerSceneControl();
});

Hooks.once("ready", async () => {
  if (game.system.id !== "tormenta20") {
    ui.notifications.error("BG3 Inspired Hotbar — Tormenta20 só pode ser usado com o sistema Tormenta20.");
    return;
  }
  ui.BG3T20 = new T20Hotbar();
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      hotbar: ui.BG3T20,
      refresh: () => ui.BG3T20.refreshSelection(),
      toggle: (force) => ui.BG3T20.toggle(force)
    };
  }
  await ui.BG3T20.refreshSelection();
  console.info(`${MODULE_ID} | Pronto para Tormenta20 ${game.system.version}`);
});

Hooks.on("controlToken", () => ui.BG3T20?.refreshSelection());
Hooks.on("canvasReady", () => ui.BG3T20?.refreshSelection());
Hooks.on("deleteToken", (token) => {
  if (ui.BG3T20?.token?.id === token.id) ui.BG3T20.setToken(null);
});

for (const hook of ["updateActor", "createItem", "updateItem", "deleteItem", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect", "updateCombat"]) {
  Hooks.on(hook, (document) => {
    const actor = actorForDocument(document);
    if (!ui.BG3T20?.actor || (actor?.id && actor.id !== ui.BG3T20.actor.id)) return;
    ui.BG3T20.render();
  });
}

Hooks.on("renderSettingsConfig", () => ui.BG3T20?.applyClientSettings());
