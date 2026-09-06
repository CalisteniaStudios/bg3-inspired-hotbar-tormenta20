import {
  FILTERS,
  MODULE_ID,
  escapeHtml,
  enterCombatAndRollInitiative,
  getActionData,
  getActorEffects,
  getActorStats,
  getCombatActionState,
  getDragEventData,
  getItemDescription,
  getManaCost,
  getQuantity,
  getSpellCircle,
  getTypeLabel,
  isEquipped,
  itemMatchesFilter,
  parseResourceInput,
  plainText,
  resourcePercent,
  resolveActorEffect,
  restActor,
  rollAbility,
  rollSkill,
  signed,
  sortItems,
  useDocument
} from "./adapter.js";
import {
  APPEARANCE_DEFAULTS,
  PORTRAIT_DEFAULTS,
  THEME_PRESETS,
  hexToRgba,
  normalizePortraitTransform,
  normalizePortraitTransforms,
  resolveAppearance
} from "./themes.js";

const FLAG_LAYOUT = "layout";
const SLOT_COUNT = 18;
const CLIENT_SETTING_KEYS = Object.freeze([
  "scale",
  "opacity",
  "verticalPosition",
  "portraitSource",
  "hideCoreHotbar",
  "theme",
  "primaryColor",
  "secondaryColor",
  "panelColor",
  "textColor",
  "glowStrength",
  "ornamentStrength",
  "showLabels"
]);
const RESOURCE_PATHS = Object.freeze({
  pv: "system.attributes.pv.value",
  pm: "system.attributes.pm.value"
});

export class T20Hotbar {
  constructor() {
    this.actor = null;
    this.token = null;
    this.customEntries = [];
    this.portraitTransforms = normalizePortraitTransforms();
    this.filter = "action";
    this.page = 0;
    this.abilitiesOpen = false;
    this.settingsOpen = false;
    this.settingsDraft = null;
    this.editingResource = null;
    this.tooltipTimer = null;
    this.tooltipUuid = null;
    this.root = document.createElement("section");
    this.root.id = "bg3t20-hud";
    this.root.className = "bg3t20-hud is-hidden";
    document.body.appendChild(this.root);
    this._bindEvents();
    this.applyClientSettings();
  }

  get enabled() {
    return game.settings.get(MODULE_ID, "enabled");
  }

  get visible() {
    return Boolean(this.enabled && this.actor && this.token);
  }

  get canEdit() {
    return Boolean(this.actor?.isOwner || game.user?.isGM);
  }

  _setting(key) {
    return game.settings.get(MODULE_ID, key);
  }

  _appearanceValues() {
    const storedTheme = this._setting("theme");
    return {
      theme: THEME_PRESETS[storedTheme] ? storedTheme : APPEARANCE_DEFAULTS.theme,
      primaryColor: this._setting("primaryColor"),
      secondaryColor: this._setting("secondaryColor"),
      panelColor: this._setting("panelColor"),
      textColor: this._setting("textColor"),
      glowStrength: this._setting("glowStrength"),
      ornamentStrength: this._setting("ornamentStrength"),
      showLabels: this._setting("showLabels")
    };
  }

  applyClientSettings(values = null) {
    const source = values ?? {
      scale: this._setting("scale"),
      opacity: this._setting("opacity"),
      verticalPosition: this._setting("verticalPosition"),
      hideCoreHotbar: this._setting("hideCoreHotbar"),
      ...this._appearanceValues()
    };
    const appearance = resolveAppearance(source);
    this.root.style.setProperty("--bg3t20-scale", String(Number(source.scale ?? 1)));
    this.root.style.setProperty("--bg3t20-opacity", String(Number(source.opacity ?? 0.96)));
    this.root.style.setProperty("--bg3t20-primary", appearance.primaryColor);
    this.root.style.setProperty("--bg3t20-secondary", appearance.secondaryColor);
    this.root.style.setProperty("--bg3t20-panel-color", appearance.panelColor);
    this.root.style.setProperty("--bg3t20-text-color", appearance.textColor);
    this.root.style.setProperty("--bg3t20-glow", hexToRgba(appearance.primaryColor, appearance.glowStrength));
    this.root.style.setProperty("--bg3t20-ornament-opacity", String(appearance.ornamentStrength));
    this.root.dataset.position = source.verticalPosition ?? "bottom";
    this.root.dataset.theme = appearance.theme;
    this.root.dataset.labels = appearance.showLabels ? "show" : "hide";
    document.body.classList.toggle("bg3t20-hide-core-hotbar", Boolean(this.enabled && source.hideCoreHotbar));
  }

  async setToken(token) {
    const nextActor = token?.actor ?? null;
    if (this.actor?.uuid === nextActor?.uuid && this.token?.id === token?.id) {
      this.render();
      return;
    }
    this.actor = nextActor;
    this.token = token ?? null;
    this.filter = "action";
    this.page = 0;
    this.abilitiesOpen = false;
    this.settingsOpen = false;
    this.editingResource = null;
    await this._loadLayout();
    this.render();
  }

  async refreshSelection() {
    await this.setToken((canvas?.tokens?.controlled ?? [])[0] ?? null);
  }

  async _loadLayout() {
    const layout = this.actor?.getFlag(MODULE_ID, FLAG_LAYOUT) ?? {};
    const source = Array.isArray(layout.custom) ? layout.custom : [];
    this.customEntries = source
      .map((entry) => typeof entry === "string" ? { uuid: entry } : entry)
      .filter((entry) => entry?.uuid)
      .map((entry) => ({ uuid: entry.uuid, documentName: entry.documentName ?? null }));
    this.portraitTransforms = normalizePortraitTransforms(layout.portraits);
  }

  async _saveLayout() {
    if (!this.actor || !this.canEdit) return;
    try {
      await this.actor.setFlag(MODULE_ID, FLAG_LAYOUT, {
        version: 3,
        custom: this.customEntries,
        portraits: this.portraitTransforms
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Não foi possível salvar o layout da HUD`, error);
      ui.notifications.error("Não foi possível salvar o layout da HUD.");
    }
  }

  _automaticDocuments() {
    return sortItems((this.actor?.items ?? []).filter((item) => itemMatchesFilter(item, this.filter)));
  }

  _resolveEntry(entry) {
    if (!entry?.uuid) return null;
    const embedded = this.actor?.items?.find?.((item) => item.uuid === entry.uuid);
    if (embedded) return embedded;
    try {
      return globalThis.fromUuidSync?.(entry.uuid) ?? game.macros?.find?.((macro) => macro.uuid === entry.uuid) ?? null;
    } catch (_error) {
      return null;
    }
  }

  _filteredEntries() {
    if (this.filter === "custom") {
      return this.customEntries.map((entry) => ({ entry, document: this._resolveEntry(entry) }));
    }
    return this._automaticDocuments().map((document) => ({ entry: null, document }));
  }

  _pageEntries() {
    const start = this.page * SLOT_COUNT;
    return this._filteredEntries().slice(start, start + SLOT_COUNT);
  }

  _pageCount() {
    const count = this._filteredEntries().length + (this.filter === "custom" && this.canEdit ? 1 : 0);
    return Math.max(1, Math.ceil(count / SLOT_COUNT));
  }

  _bindEvents() {
    this.root.addEventListener("click", (event) => this._onClick(event));
    this.root.addEventListener("contextmenu", (event) => this._onContextMenu(event));
    this.root.addEventListener("dragstart", (event) => this._onDragStart(event));
    this.root.addEventListener("dragend", (event) => event.target.closest?.("[data-uuid]")?.classList.remove("is-dragging"));
    this.root.addEventListener("dragover", (event) => this._onDragOver(event));
    this.root.addEventListener("dragleave", (event) => event.target.closest?.(".bg3t20-slot")?.classList.remove("is-drop-target"));
    this.root.addEventListener("drop", (event) => this._onDrop(event));
    this.root.addEventListener("mouseover", (event) => this._onMouseOver(event));
    this.root.addEventListener("mouseout", (event) => this._onMouseOut(event));
    this.root.addEventListener("input", (event) => this._onSettingsInput(event));
    this.root.addEventListener("change", (event) => this._onSettingsInput(event));
    this.root.addEventListener("keydown", (event) => this._onKeyDown(event));
    this.root.addEventListener("focusout", (event) => this._onFocusOut(event));
  }

  async _onClick(event) {
    if (event.target.closest("[data-setting]")) return;
    const target = event.target.closest?.("[data-action]");
    const action = target?.dataset.action;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();

    if (action === "use-item") {
      const document = this._resolveEntry({ uuid: target.dataset.uuid });
      try {
        await useDocument(document, event, { actor: this.actor, token: this.token });
      } catch (error) {
        console.error(`${MODULE_ID} | Erro ao usar atalho`, error);
        ui.notifications.error(`Não foi possível usar ${document?.name ?? "o atalho"}.`);
      }
      return;
    }
    if (action === "open-actor") return this.actor?.sheet?.render?.(true);
    if (action === "toggle-abilities") {
      this.abilitiesOpen = !this.abilitiesOpen;
      this.render();
      return;
    }
    if (action === "filter") {
      this.filter = target.dataset.filter;
      this.page = 0;
      this.render();
      return;
    }
    if (action === "page-prev" || action === "page-next") {
      const delta = action === "page-prev" ? -1 : 1;
      this.page = Math.min(this._pageCount() - 1, Math.max(0, this.page + delta));
      this.render();
      return;
    }
    if (action === "roll-ability") return rollAbility(this.actor, target.dataset.key, event);
    if (action === "roll-skill") return rollSkill(this.actor, target.dataset.key, event);
    if (action === "end-turn") {
      if (game.combat?.started && game.combat?.combatant?.actor?.id === this.actor?.id) await game.combat.nextTurn();
      return;
    }
    if (action === "initiative") {
      if (!game.combat || !this.actor || !this.token) return;
      try {
        await enterCombatAndRollInitiative(this.actor);
      } catch (error) {
        console.error(`${MODULE_ID} | Erro ao entrar no combate e rolar iniciativa`, error);
        ui.notifications.error("Não foi possível entrar no encontro e rolar iniciativa.");
      }
      this.render();
      return;
    }
    if (action === "rest") return this._openRestDialog();
    if (action === "death-save") return rollSkill(this.actor, "fort", event);
    if (action === "set-death-save" && this.canEdit) {
      await this.actor.update({ "system.resources.deathsave.value": Number(target.dataset.value) });
      return;
    }
    if (action === "toggle-effect") {
      const effect = resolveActorEffect(this.actor, target.dataset.effectUuid ?? target.dataset.effectId);
      if (effect && this.canEdit) await effect.update({ disabled: !effect.disabled });
      return;
    }
    if (action === "edit-resource" && this.canEdit) {
      this.editingResource = target.dataset.resource;
      this.render();
      requestAnimationFrame(() => this.root.querySelector(`[data-resource-input="${this.editingResource}"]`)?.select());
      return;
    }
    if (action === "open-settings") return this._openSettings();
    if (action === "close-settings") return this._closeSettings(true);
    if (action === "save-settings") return this._saveSettings();
    if (action === "reset-settings") return this._resetSettings();
    if (action === "reset-portrait") {
      const source = this.settingsDraft?.portraitSource ?? "actor";
      this.settingsDraft.portraitTransforms[source] = { ...PORTRAIT_DEFAULTS };
      this.render();
      return;
    }
    if (action === "select-theme") {
      const themeKey = target.dataset.theme;
      const preset = THEME_PRESETS[themeKey];
      this.settingsDraft.theme = themeKey;
      if (preset && themeKey !== "custom") {
        this.settingsDraft.primaryColor = preset.primary;
        this.settingsDraft.secondaryColor = preset.secondary;
        this.settingsDraft.panelColor = preset.panel;
        this.settingsDraft.textColor = preset.text;
      }
      this.applyClientSettings(this.settingsDraft);
      this.render();
      return;
    }
  }

  _onContextMenu(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement) return;
    event.preventDefault();
    if (this.filter === "custom" && this.canEdit && event.shiftKey) {
      this._removeCustom(itemElement.dataset.uuid);
      return;
    }
    this._resolveEntry({ uuid: itemElement.dataset.uuid })?.sheet?.render?.(true);
  }

  _onDragStart(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement || !this.canEdit) return;
    const document = this._resolveEntry({ uuid: itemElement.dataset.uuid });
    if (!document) return;
    const payload = document.toDragData?.() ?? {
      type: document.documentName,
      uuid: document.uuid
    };
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = this.filter === "custom" ? "move" : "copy";
    itemElement.classList.add("is-dragging");
  }

  _onDragOver(event) {
    const slot = event.target.closest?.(".bg3t20-slot");
    if (!slot || !this.canEdit || this.filter !== "custom") return;
    event.preventDefault();
    slot.classList.add("is-drop-target");
    event.dataTransfer.dropEffect = "copy";
  }

  _dragData(event) {
    return getDragEventData(event);
  }

  async _resolveDroppedDocument(data) {
    let document = null;
    if (data.uuid) {
      try {
        document = await fromUuid(data.uuid);
      } catch (_error) {
        document = null;
      }
    }
    if (!document && data.type === "Macro" && data.id) document = game.macros?.get?.(data.id);
    if (!document && data.type === "Item" && data.id) document = this.actor?.items?.get?.(data.id);
    if (!document || !["Item", "Macro"].includes(document.documentName)) return null;

    if (document.documentName === "Item" && document.parent?.id !== this.actor?.id) {
      const [created] = await this.actor.createEmbeddedDocuments("Item", [document.toObject()]);
      return created ?? null;
    }
    return document;
  }

  async _onDrop(event) {
    const slot = event.target.closest?.(".bg3t20-slot");
    if (!slot || !this.canEdit || this.filter !== "custom") return;
    event.preventDefault();
    slot.classList.remove("is-drop-target");
    const document = await this._resolveDroppedDocument(this._dragData(event));
    if (!document?.uuid) {
      ui.notifications.warn("Arraste um item, poder, magia ou macro para esta área.");
      return;
    }

    const targetIndex = (this.page * SLOT_COUNT) + Number(slot.dataset.slotIndex);
    const currentIndex = this.customEntries.findIndex((entry) => entry.uuid === document.uuid);
    if (currentIndex >= 0) this.customEntries.splice(currentIndex, 1);
    const adjustedIndex = currentIndex >= 0 && currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
    this.customEntries.splice(Math.min(adjustedIndex, this.customEntries.length), 0, {
      uuid: document.uuid,
      documentName: document.documentName
    });
    await this._saveLayout();
    this.render();
  }

  async _removeCustom(uuid) {
    const index = this.customEntries.findIndex((entry) => entry.uuid === uuid);
    if (index < 0) return;
    this.customEntries.splice(index, 1);
    await this._saveLayout();
    this.page = Math.min(this.page, this._pageCount() - 1);
    this.render();
    ui.notifications.info("Atalho removido da área personalizada.");
  }

  _onMouseOver(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement || itemElement.contains(event.relatedTarget)) return;
    clearTimeout(this.tooltipTimer);
    this.tooltipTimer = setTimeout(() => this._showTooltip(itemElement), 350);
  }

  _onMouseOut(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement || itemElement.contains(event.relatedTarget)) return;
    clearTimeout(this.tooltipTimer);
    this._hideTooltip();
  }

  _showTooltip(itemElement) {
    const document = this._resolveEntry({ uuid: itemElement.dataset.uuid });
    if (!document) return;
    const action = getActionData(document);
    const mana = getManaCost(document);
    const quantity = getQuantity(document);
    const circle = getSpellCircle(document);
    const description = plainText(getItemDescription(document)).slice(0, 520);
    const tooltip = this.root.querySelector(".bg3t20-tooltip");
    if (!tooltip) return;
    tooltip.innerHTML = `
      <header><img src="${escapeHtml(document.img)}" alt=""><div><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(getTypeLabel(document))}</span></div></header>
      <div class="bg3t20-tooltip-tags">
        <span style="--tag-color:${action.color}"><i class="${action.icon}"></i>${escapeHtml(action.label)}</span>
        ${mana ? `<span><i class="fa-solid fa-droplet"></i>${mana} PM</span>` : ""}
        ${circle !== null ? `<span><i class="fa-solid fa-wand-sparkles"></i>${circle}º círculo</span>` : ""}
        ${quantity !== null ? `<span><i class="fa-solid fa-box"></i>${quantity}</span>` : ""}
      </div>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      <footer>Clique para usar • Shift+clique: uso rápido • Botão direito: abrir • Shift+botão direito no Personalizado: remover</footer>`;
    const rect = itemElement.getBoundingClientRect();
    tooltip.classList.add("is-visible");
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.min(window.innerWidth - tooltipRect.width - 12, Math.max(12, rect.left + rect.width / 2 - tooltipRect.width / 2))}px`;
    tooltip.style.top = `${Math.max(12, rect.top - tooltipRect.height - 12)}px`;
    this.tooltipUuid = document.uuid;
  }

  _hideTooltip() {
    this.root.querySelector(".bg3t20-tooltip")?.classList.remove("is-visible");
    this.tooltipUuid = null;
  }

  async _commitResource(input) {
    if (!this.editingResource || !this.canEdit) return;
    const resource = this.editingResource;
    this.editingResource = null;
    const current = getActorStats(this.actor)[resource]?.value ?? 0;
    const parsed = parseResourceInput(input?.value, current);
    if (parsed === null) {
      ui.notifications.warn("Digite um valor, +10 ou -5.");
      this.render();
      return;
    }
    await this.actor.update({ [RESOURCE_PATHS[resource]]: Math.max(0, parsed) });
    this.render();
  }

  _onKeyDown(event) {
    const input = event.target.closest?.("[data-resource-input]");
    if (!input) return;
    if (event.key === "Enter") {
      event.preventDefault();
      this._commitResource(input);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.editingResource = null;
      this.render();
    }
  }

  _onFocusOut(event) {
    const input = event.target.closest?.("[data-resource-input]");
    if (!input) return;
    setTimeout(() => {
      if (this.editingResource === input.dataset.resourceInput && document.activeElement !== input) this._commitResource(input);
    }, 0);
  }

  _activePortraitTransform(draft = this.settingsDraft) {
    const source = draft?.portraitSource ?? this._setting("portraitSource") ?? "actor";
    const transforms = draft?.portraitTransforms ?? this.portraitTransforms;
    return normalizePortraitTransform(transforms?.[source]);
  }

  _portraitStyle(transform = this._activePortraitTransform()) {
    const normalized = normalizePortraitTransform(transform);
    return `--portrait-zoom:${normalized.zoom};--portrait-x:${normalized.x}%;--portrait-y:${normalized.y}%`;
  }

  _applyPortraitPreview(transform) {
    const normalized = normalizePortraitTransform(transform);
    for (const image of this.root.querySelectorAll(".bg3t20-portrait img, .bg3t20-portrait-editor-preview img")) {
      image.style.setProperty("--portrait-zoom", String(normalized.zoom));
      image.style.setProperty("--portrait-x", `${normalized.x}%`);
      image.style.setProperty("--portrait-y", `${normalized.y}%`);
    }
  }

  _openSettings() {
    this.settingsDraft = {
      scale: this._setting("scale"),
      opacity: this._setting("opacity"),
      verticalPosition: this._setting("verticalPosition"),
      portraitSource: this._setting("portraitSource"),
      hideCoreHotbar: this._setting("hideCoreHotbar"),
      portraitTransforms: normalizePortraitTransforms(this.portraitTransforms),
      ...this._appearanceValues()
    };
    this.settingsOpen = true;
    this.render();
  }

  _closeSettings(revert = false) {
    if (revert) this.applyClientSettings();
    this.settingsOpen = false;
    this.settingsDraft = null;
    this.render();
  }

  _onSettingsInput(event) {
    const input = event.target.closest?.("[data-setting]");
    if (!input || !this.settingsDraft) return;
    const key = input.dataset.setting;
    let value = input.type === "checkbox" ? input.checked : input.value;
    if (input.type === "range") value = Number(value);

    if (["portraitZoom", "portraitX", "portraitY"].includes(key)) {
      const source = this.settingsDraft.portraitSource ?? "actor";
      const property = { portraitZoom: "zoom", portraitX: "x", portraitY: "y" }[key];
      this.settingsDraft.portraitTransforms[source][property] = value;
      const transform = normalizePortraitTransform(this.settingsDraft.portraitTransforms[source]);
      this.settingsDraft.portraitTransforms[source] = transform;
      const output = this.root.querySelector(`[data-output="${key}"]`);
      if (output) output.textContent = property === "zoom" ? `${Math.round(transform.zoom * 100)}%` : `${Math.round(transform[property])}%`;
      this._applyPortraitPreview(transform);
      return;
    }

    this.settingsDraft[key] = value;
    if (key === "portraitSource") {
      this.render();
      return;
    }
    if (["primaryColor", "secondaryColor", "panelColor", "textColor"].includes(key)) {
      this.settingsDraft.theme = "custom";
      this.root.querySelectorAll("[data-theme]").forEach((button) => button.classList.toggle("is-active", button.dataset.theme === "custom"));
    }
    const output = this.root.querySelector(`[data-output="${key}"]`);
    if (output) output.textContent = input.type === "range" ? `${Math.round(Number(value) * 100)}%` : String(value);
    this.applyClientSettings(this.settingsDraft);
  }

  async _saveSettings() {
    if (!this.settingsDraft) return;
    const draft = {
      ...this.settingsDraft,
      portraitTransforms: normalizePortraitTransforms(this.settingsDraft.portraitTransforms)
    };
    this.portraitTransforms = draft.portraitTransforms;
    this.settingsOpen = false;
    this.settingsDraft = null;
    for (const key of CLIENT_SETTING_KEYS) await game.settings.set(MODULE_ID, key, draft[key]);
    await this._saveLayout();
    this.applyClientSettings();
    this.render();
    ui.notifications.info("A aparência da HUD foi salva.");
  }

  _resetSettings() {
    this.settingsDraft = {
      scale: 1,
      opacity: 0.96,
      verticalPosition: "bottom",
      portraitSource: "actor",
      hideCoreHotbar: false,
      portraitTransforms: normalizePortraitTransforms(),
      ...APPEARANCE_DEFAULTS
    };
    this.applyClientSettings(this.settingsDraft);
    this.render();
  }

  _openRestDialog() {
    if (!this.actor) return;
    const rest = async (modifier) => {
      try {
        await restActor(this.actor, modifier);
      } catch (error) {
        console.error(`${MODULE_ID} | Erro ao descansar`, error);
        ui.notifications.error("Não foi possível realizar o descanso.");
      }
    };
    new Dialog({
      title: `Descanso — ${this.actor.name}`,
      content: "<p>Escolha a condição do descanso. A própria ficha de Tormenta20 calcula a recuperação.</p>",
      buttons: {
        poor: { icon: '<i class="fa-solid fa-cloud-rain"></i>', label: "Ruim (½×)", callback: () => rest(0.5) },
        normal: { icon: '<i class="fa-solid fa-campground"></i>', label: "Normal (1×)", callback: () => rest(1) },
        comfortable: { icon: '<i class="fa-solid fa-bed"></i>', label: "Confortável (2×)", callback: () => rest(2) },
        luxurious: { icon: '<i class="fa-solid fa-crown"></i>', label: "Luxuoso (3×)", callback: () => rest(3) }
      },
      default: "normal"
    }).render(true);
  }

  _portraitImage() {
    const source = this.settingsDraft?.portraitSource ?? this._setting("portraitSource");
    const preferToken = source === "token";
    return preferToken ? (this.token?.document?.texture?.src ?? this.actor?.img) : (this.actor?.img ?? this.token?.document?.texture?.src);
  }

  _renderResource(type, resource) {
    const temp = resource.temp ? ` +${resource.temp}` : "";
    if (this.editingResource === type) {
      return `<div class="bg3t20-resource ${type} is-editing">
        <span style="width:${resourcePercent(resource)}%"></span>
        <input type="text" inputmode="numeric" value="${resource.value}" data-resource-input="${type}" aria-label="Editar ${type.toUpperCase()}" title="Valor exato, +10 ou -5">
        <em>/ ${resource.max}</em>
      </div>`;
    }
    const editable = this.canEdit ? "is-editable" : "";
    return `<button type="button" class="bg3t20-resource ${type} ${editable}" data-action="edit-resource" data-resource="${type}" title="${this.canEdit ? "Clique para editar. Use um valor exato, +10 ou -5." : type.toUpperCase()}">
      <span style="width:${resourcePercent(resource)}%"></span><strong>${resource.value}${temp} / ${resource.max}</strong>
    </button>`;
  }

  _renderPortrait(stats) {
    const deathVisible = stats.pv.value <= 0 && this.actor?.type === "character";
    const deathDots = Array.from({ length: stats.deathSave.max }, (_, index) => {
      const value = index + 1;
      return `<button type="button" data-action="set-death-save" data-value="${value}" class="${value <= stats.deathSave.value ? "is-marked" : ""}" aria-label="Marcar ${value} teste(s) contra a morte"></button>`;
    }).join("");
    return `<div class="bg3t20-portrait-wrap">
      <button type="button" class="bg3t20-portrait" data-action="open-actor" title="Abrir ficha de ${escapeHtml(this.actor.name)}">
        <img src="${escapeHtml(this._portraitImage())}" alt="${escapeHtml(this.actor.name)}" style="${this._portraitStyle()}"><span class="bg3t20-level">Nível ${stats.level}</span>
      </button>
      <div class="bg3t20-actor-name">${escapeHtml(this.actor.name)}</div>
      ${this._renderResource("pv", stats.pv)}
      ${this._renderResource("pm", stats.pm)}
      <div class="bg3t20-defenses">
        <span title="Defesa"><i class="fa-solid fa-shield"></i>${stats.defense}</span>
        <button type="button" data-action="toggle-abilities" class="${this.abilitiesOpen ? "is-active" : ""}" title="Atributos e perícias"><i class="fa-solid fa-dice-d20"></i></button>
      </div>
      ${deathVisible ? `<div class="bg3t20-death"><button type="button" data-action="death-save" title="Rolar Fortitude"><i class="fa-solid fa-skull"></i></button><div>${deathDots}</div></div>` : ""}
    </div>`;
  }

  _renderWeapons() {
    const weapons = sortItems((this.actor?.items ?? []).filter((item) => item.type === "arma"));
    const selected = [...weapons.filter(isEquipped), ...weapons.filter((item) => !isEquipped(item))].slice(0, 3);
    return `<div class="bg3t20-weapons" aria-label="Armas rápidas">${Array.from({ length: 3 }, (_, index) => this._renderMiniItem(selected[index], index)).join("")}</div>`;
  }

  _renderMiniItem(item, index) {
    if (!item) return `<div class="bg3t20-mini-slot is-empty"><span>${index + 1}</span></div>`;
    return `<button type="button" class="bg3t20-mini-slot ${isEquipped(item) ? "is-equipped" : ""}" data-action="use-item" data-uuid="${escapeHtml(item.uuid)}" draggable="${this.canEdit}">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}"><span>${index + 1}</span>${isEquipped(item) ? '<i class="fa-solid fa-hand-fist"></i>' : ""}
    </button>`;
  }

  _renderFilters() {
    return `<nav class="bg3t20-filters" aria-label="Filtros da hotbar">${FILTERS.map((filter) => `<button type="button" data-action="filter" data-filter="${filter.id}" class="${this.filter === filter.id ? "is-active" : ""}" title="${escapeHtml(filter.label)}"><i class="${filter.icon}"></i><span>${escapeHtml(filter.label)}</span></button>`).join("")}</nav>`;
  }

  _renderGrid() {
    const entries = this._pageEntries();
    return `<div class="bg3t20-grid">${Array.from({ length: SLOT_COUNT }, (_, index) => this._renderSlot(entries[index], index)).join("")}</div>`;
  }

  _renderSlot(wrapper, index) {
    const absoluteIndex = (this.page * SLOT_COUNT) + index;
    if (!wrapper) {
      const invitation = this.filter === "custom" && this.canEdit && absoluteIndex === this.customEntries.length;
      return `<div class="bg3t20-slot is-empty ${invitation ? "is-invitation" : ""}" data-slot-index="${index}"><span>${index + 1}</span>${invitation ? '<i class="fa-solid fa-arrow-down"></i><em>Arraste aqui</em>' : ""}</div>`;
    }
    const document = wrapper.document;
    if (!document) {
      return `<button type="button" class="bg3t20-slot is-missing" data-slot-index="${index}" data-uuid="${escapeHtml(wrapper.entry.uuid)}" title="Atalho indisponível. Clique direito para remover."><i class="fa-solid fa-link-slash"></i><em>Indisponível</em></button>`;
    }
    const action = getActionData(document);
    const mana = getManaCost(document);
    const quantity = getQuantity(document);
    const circle = getSpellCircle(document);
    return `<button type="button" class="bg3t20-slot has-item" style="--action-color:${action.color}" data-action="use-item" data-slot-index="${index}" data-uuid="${escapeHtml(document.uuid)}" draggable="${this.canEdit}">
      <img src="${escapeHtml(document.img)}" alt="${escapeHtml(document.name)}"><span class="bg3t20-slot-number">${index + 1}</span><span class="bg3t20-item-name">${escapeHtml(document.name)}</span>
      ${mana ? `<span class="bg3t20-badge mana">${mana}</span>` : ""}${circle !== null ? `<span class="bg3t20-badge circle">${circle}</span>` : ""}${quantity !== null && (document.type === "consumivel" || quantity !== 1) ? `<span class="bg3t20-badge quantity">${quantity}</span>` : ""}
    </button>`;
  }

  _renderPageControls() {
    const pages = this._pageCount();
    if (pages <= 1) return "";
    return `<div class="bg3t20-pages"><button type="button" data-action="page-prev" ${this.page === 0 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button><span>${this.page + 1} / ${pages}</span><button type="button" data-action="page-next" ${this.page >= pages - 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button></div>`;
  }

  _renderEffects() {
    const effects = getActorEffects(this.actor).slice(0, 8);
    if (!effects.length) return '<div class="bg3t20-effects is-empty"><span>Sem efeitos ativos</span></div>';
    return `<div class="bg3t20-effects">${effects.map((effect) => `<button type="button" data-action="toggle-effect" data-effect-uuid="${escapeHtml(effect.uuid ?? effect.id)}" class="${effect.disabled ? "is-disabled" : ""}" title="${escapeHtml(effect.name)}"><img src="${escapeHtml(effect.img)}" alt=""></button>`).join("")}</div>`;
  }

  _renderActions() {
    const combatAction = getCombatActionState({
      combat: game.combat,
      actor: this.actor,
      token: this.token,
      scene: canvas?.scene
    });
    return `<div class="bg3t20-side-actions">
      <button type="button" data-action="${combatAction.action}" class="bg3t20-end-turn ${combatAction.isCurrent ? "is-current" : ""}" ${combatAction.disabled ? "disabled" : ""}><i class="${combatAction.icon}"></i><span>${combatAction.label}</span></button>
      <button type="button" data-action="rest" class="bg3t20-rest"><i class="fa-solid fa-campground"></i><span>Descansar</span></button>
      <button type="button" data-action="open-settings" class="bg3t20-settings-button"><i class="fa-solid fa-gear"></i><span>Ajustes</span></button>
    </div>`;
  }

  _renderAbilities() {
    if (!this.abilitiesOpen) return "";
    const abilities = CONFIG.T20?.atributos ?? { for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma" };
    const skills = CONFIG.T20?.pericias ?? {};
    const abilityButtons = Object.entries(abilities).map(([key, label]) => `<button type="button" data-action="roll-ability" data-key="${key}"><i class="fa-solid fa-dice-d20"></i><span>${escapeHtml(game.i18n.localize(label))}</span><strong>${signed(this.actor?.system?.atributos?.[key]?.value ?? 0)}</strong></button>`).join("");
    const skillButtons = Object.entries(skills).map(([key, config]) => {
      const actorSkill = this.actor?.system?.pericias?.[key];
      if (!actorSkill) return "";
      const trained = Boolean(actorSkill.treinado ?? actorSkill.trained ?? actorSkill.grau);
      return `<button type="button" data-action="roll-skill" data-key="${key}" class="${trained ? "is-trained" : ""}"><span>${escapeHtml(game.i18n.localize(config.label ?? actorSkill.label ?? key))}</span><strong>${signed(actorSkill.value ?? 0)}</strong></button>`;
    }).join("");
    return `<aside class="bg3t20-roll-panel"><header><h3>Testes</h3><button type="button" data-action="toggle-abilities"><i class="fa-solid fa-xmark"></i></button></header><div class="bg3t20-ability-list">${abilityButtons}</div><h4>Perícias</h4><div class="bg3t20-skill-list">${skillButtons}</div></aside>`;
  }

  _renderSettingsPanel() {
    if (!this.settingsOpen || !this.settingsDraft) return "";
    const draft = this.settingsDraft;
    const appearance = resolveAppearance(draft);
    const portrait = this._activePortraitTransform(draft);
    const portraitSourceLabel = draft.portraitSource === "token" ? "Imagem do token" : "Imagem da ficha";
    const portraitDisabled = this.canEdit ? "" : "disabled";
    const themes = Object.entries(THEME_PRESETS).map(([key, theme]) => `<button type="button" data-action="select-theme" data-theme="${key}" class="bg3t20-theme ${draft.theme === key ? "is-active" : ""}" style="--theme-primary:${theme.primary};--theme-secondary:${theme.secondary};--theme-panel:${theme.panel}">
      <span class="bg3t20-theme-art" aria-hidden="true"><span class="bg3t20-theme-avatar"><i class="${theme.icon}"></i></span><span class="bg3t20-theme-slots"><i></i><i></i><i></i><i></i><i></i></span><span class="bg3t20-theme-action"></span></span>
      <span class="bg3t20-theme-copy"><strong>${theme.label}</strong><small>${theme.description}</small></span>
      <i class="fa-solid fa-check bg3t20-theme-check" aria-hidden="true"></i>
    </button>`).join("");
    const range = (key, label, min, max, step, value) => `<label class="bg3t20-setting range"><span>${label}<output data-output="${key}">${Math.round(Number(value) * 100)}%</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${key}"></label>`;
    const portraitRange = (key, label, min, max, step, value, display) => `<label class="bg3t20-setting range"><span>${label}<output data-output="${key}">${display}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${key}" ${portraitDisabled}></label>`;
    const color = (key, label, value) => `<label class="bg3t20-setting color"><span>${label}</span><input type="color" value="${escapeHtml(value)}" data-setting="${key}"></label>`;
    return `<div class="bg3t20-settings-backdrop"><section class="bg3t20-settings-panel" role="dialog" aria-modal="true" aria-label="Forja da HUD">
      <header><div class="bg3t20-settings-title"><span><i class="fa-solid fa-hammer"></i> Personalização</span><h2>Forja da HUD</h2><p>Escolha um estilo e refine apenas o que quiser.</p></div><button type="button" data-action="close-settings" title="Fechar sem salvar" aria-label="Fechar sem salvar"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="bg3t20-settings-content">
        <fieldset class="bg3t20-settings-section bg3t20-theme-section"><legend><i class="fa-solid fa-layer-group"></i> Estilo da HUD</legend><p class="bg3t20-section-note">Cada tema altera formato, retrato, slots, filtros e botões — não somente as cores.</p><div class="bg3t20-theme-list">${themes}</div></fieldset>
        <div class="bg3t20-settings-pair">
        <fieldset class="bg3t20-settings-section"><legend><i class="fa-solid fa-palette"></i> Cores personalizadas</legend><div class="bg3t20-color-list">${color("primaryColor", "Destaque", appearance.primaryColor)}${color("secondaryColor", "Contraste", appearance.secondaryColor)}${color("panelColor", "Painel", appearance.panelColor)}${color("textColor", "Texto", appearance.textColor)}</div><p class="bg3t20-section-note">Ao alterar uma cor, o tema muda para Personalizado.</p></fieldset>
        <fieldset class="bg3t20-settings-section bg3t20-setting-columns"><legend><i class="fa-solid fa-wand-magic-sparkles"></i> Presença visual</legend>${range("scale", "Escala", 0.65, 1.35, 0.05, draft.scale)}${range("opacity", "Opacidade", 0.45, 1, 0.05, draft.opacity)}${range("glowStrength", "Brilho", 0, 1, 0.05, draft.glowStrength)}${range("ornamentStrength", "Ornamentos", 0, 1, 0.05, draft.ornamentStrength)}</fieldset>
        </div>
        <fieldset class="bg3t20-settings-section bg3t20-setting-columns bg3t20-behavior"><legend><i class="fa-solid fa-sliders"></i> Comportamento</legend>
          <label class="bg3t20-setting select"><span>Posição</span><select data-setting="verticalPosition"><option value="bottom" ${draft.verticalPosition === "bottom" ? "selected" : ""}>Na base da tela</option><option value="raised" ${draft.verticalPosition === "raised" ? "selected" : ""}>Elevada</option></select></label>
          <label class="bg3t20-setting select"><span>Retrato</span><select data-setting="portraitSource"><option value="actor" ${draft.portraitSource === "actor" ? "selected" : ""}>Imagem da ficha</option><option value="token" ${draft.portraitSource === "token" ? "selected" : ""}>Imagem do token</option></select></label>
          <label class="bg3t20-setting toggle"><input type="checkbox" data-setting="showLabels" ${draft.showLabels ? "checked" : ""}><span>Exibir nomes nos atalhos</span></label>
          <label class="bg3t20-setting toggle"><input type="checkbox" data-setting="hideCoreHotbar" ${draft.hideCoreHotbar ? "checked" : ""}><span>Ocultar hotbar padrão</span></label>
        </fieldset>
        <fieldset class="bg3t20-settings-section bg3t20-portrait-editor"><legend><i class="fa-solid fa-crop-simple"></i> Enquadramento do retrato</legend>
          <div class="bg3t20-portrait-editor-layout">
            <div class="bg3t20-portrait-editor-preview"><img src="${escapeHtml(this._portraitImage())}" alt="Prévia de ${escapeHtml(this.actor.name)}" style="${this._portraitStyle(portrait)}"><span>${escapeHtml(portraitSourceLabel)}</span></div>
            <div class="bg3t20-portrait-editor-controls">
              <div class="bg3t20-portrait-editor-ranges">
                ${portraitRange("portraitZoom", "Zoom", 1, 3, 0.05, portrait.zoom, `${Math.round(portrait.zoom * 100)}%`)}
                ${portraitRange("portraitX", "Horizontal", 0, 100, 1, portrait.x, `${Math.round(portrait.x)}%`)}
                ${portraitRange("portraitY", "Vertical", 0, 100, 1, portrait.y, `${Math.round(portrait.y)}%`)}
              </div>
              <p>${this.canEdit ? "O enquadramento fica salvo neste personagem e é exibido para todos." : "Somente o dono do personagem ou o mestre pode salvar este enquadramento."}</p>
              <button type="button" data-action="reset-portrait" ${portraitDisabled}><i class="fa-solid fa-crosshairs"></i> Centralizar imagem</button>
            </div>
          </div>
        </fieldset>
      </div>
      <footer><span>As mudanças são exibidas ao vivo.</span><div><button type="button" data-action="reset-settings"><i class="fa-solid fa-rotate-left"></i> Restaurar</button><button type="button" data-action="save-settings" class="is-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar ajustes</button></div></footer>
    </section></div>`;
  }

  render() {
    this.root.classList.toggle("is-hidden", !this.visible);
    if (!this.visible) {
      this.root.innerHTML = '<div class="bg3t20-tooltip"></div>';
      return;
    }
    const stats = getActorStats(this.actor);
    this.root.innerHTML = `<div class="bg3t20-shell">
      ${this._renderPortrait(stats)}
      <main class="bg3t20-main">${this._renderWeapons()}${this._renderFilters()}${this._renderGrid()}${this._renderPageControls()}${this._renderEffects()}</main>
      ${this._renderActions()}${this._renderAbilities()}
    </div><div class="bg3t20-tooltip"></div>${this._renderSettingsPanel()}`;
  }

  async toggle(force) {
    await game.settings.set(MODULE_ID, "enabled", force ?? !this.enabled);
  }

  destroy() {
    clearTimeout(this.tooltipTimer);
    this.root.remove();
  }
}
