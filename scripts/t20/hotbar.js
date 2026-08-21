import {
  FILTERS,
  MODULE_ID,
  escapeHtml,
  getActionData,
  getActorStats,
  getDefaultActorOrder,
  getItemDescription,
  getManaCost,
  getQuantity,
  getSpellCircle,
  getTypeLabel,
  isEquipped,
  itemMatchesFilter,
  normalizeOrder,
  plainText,
  resolveActorDocument,
  resourcePercent,
  restActor,
  rollAbility,
  rollSkill,
  signed,
  sortItems,
  useDocument
} from "./adapter.js";

const FLAG_LAYOUT = "layout";
const SLOT_COUNT = 18;

export class T20Hotbar {
  constructor() {
    this.actor = null;
    this.token = null;
    this.order = [];
    this.filter = "all";
    this.page = 0;
    this.abilitiesOpen = false;
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

  applyClientSettings() {
    const scale = Number(game.settings.get(MODULE_ID, "scale") || 1);
    const opacity = Number(game.settings.get(MODULE_ID, "opacity") || 1);
    const position = game.settings.get(MODULE_ID, "verticalPosition") || "bottom";
    this.root.style.setProperty("--bg3t20-scale", String(scale));
    this.root.style.setProperty("--bg3t20-opacity", String(opacity));
    this.root.dataset.position = position;
    document.body.classList.toggle(
      "bg3t20-hide-core-hotbar",
      Boolean(this.enabled && game.settings.get(MODULE_ID, "hideCoreHotbar"))
    );
  }

  async setToken(token) {
    const nextActor = token?.actor ?? null;
    if (this.actor?.uuid === nextActor?.uuid && this.token?.id === token?.id) {
      this.render();
      return;
    }
    this.actor = nextActor;
    this.token = token ?? null;
    this.filter = "all";
    this.page = 0;
    this.abilitiesOpen = false;
    await this._loadLayout();
    this.render();
  }

  async refreshSelection() {
    const controlled = canvas?.tokens?.controlled ?? [];
    const token = controlled[0] ?? null;
    await this.setToken(token);
  }

  async _loadLayout() {
    if (!this.actor) {
      this.order = [];
      return;
    }
    const layout = this.actor.getFlag(MODULE_ID, FLAG_LAYOUT) ?? {};
    this.order = normalizeOrder(this.actor, layout.order ?? []);
  }

  async _saveLayout() {
    if (!this.actor || !this.canEdit) return;
    try {
      await this.actor.setFlag(MODULE_ID, FLAG_LAYOUT, { order: this.order });
    } catch (error) {
      console.warn(`${MODULE_ID} | Não foi possível salvar a ordem da hotbar`, error);
    }
  }

  _documents() {
    return this.order
      .map((uuid) => resolveActorDocument(this.actor, uuid))
      .filter(Boolean);
  }

  _filteredDocuments() {
    return this._documents().filter((document) => itemMatchesFilter(document, this.filter));
  }

  _pageDocuments() {
    const filtered = this._filteredDocuments();
    const start = this.page * SLOT_COUNT;
    return filtered.slice(start, start + SLOT_COUNT);
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
  }

  async _onClick(event) {
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (action === "use-item") {
      const document = resolveActorDocument(this.actor, event.target.closest("[data-uuid]")?.dataset.uuid);
      try {
        await useDocument(document, event);
      } catch (error) {
        console.error(`${MODULE_ID} | Erro ao usar item`, error);
        ui.notifications.error(`Não foi possível usar ${document?.name ?? "o item"}.`);
      }
      return;
    }
    if (action === "open-actor") {
      this.actor?.sheet?.render?.(true);
      return;
    }
    if (action === "toggle-abilities") {
      this.abilitiesOpen = !this.abilitiesOpen;
      this.render();
      return;
    }
    if (action === "filter") {
      this.filter = event.target.closest("[data-filter]").dataset.filter;
      this.page = 0;
      this.render();
      return;
    }
    if (action === "page-prev") {
      this.page = Math.max(0, this.page - 1);
      this.render();
      return;
    }
    if (action === "page-next") {
      const pages = Math.max(1, Math.ceil(this._filteredDocuments().length / SLOT_COUNT));
      this.page = Math.min(pages - 1, this.page + 1);
      this.render();
      return;
    }
    if (action === "roll-ability") {
      await rollAbility(this.actor, event.target.closest("[data-key]").dataset.key, event);
      return;
    }
    if (action === "roll-skill") {
      await rollSkill(this.actor, event.target.closest("[data-key]").dataset.key, event);
      return;
    }
    if (action === "end-turn") {
      if (game.combat?.started && game.combat?.combatant?.actor?.id === this.actor?.id) await game.combat.nextTurn();
      return;
    }
    if (action === "rest") {
      this._openRestDialog();
      return;
    }
    if (action === "death-save") {
      await rollSkill(this.actor, "fort", event);
      return;
    }
    if (action === "set-death-save") {
      const value = Number(event.target.closest("[data-value]").dataset.value);
      if (this.canEdit) await this.actor.update({ "system.resources.deathsave.value": value });
      return;
    }
    if (action === "toggle-effect") {
      const effect = this.actor?.effects?.get?.(event.target.closest("[data-effect-id]").dataset.effectId);
      if (effect && this.canEdit) await effect.update({ disabled: !effect.disabled });
      return;
    }
    if (action === "autofill") {
      this.order = getDefaultActorOrder(this.actor);
      await this._saveLayout();
      this.page = 0;
      this.render();
      ui.notifications.info("Hotbar preenchida com os itens da ficha.");
      return;
    }
    if (action === "open-settings") {
      game.settings.sheet?.render?.(true, { tab: MODULE_ID });
      return;
    }
    if (action === "toggle-hud") {
      await game.settings.set(MODULE_ID, "enabled", false);
    }
  }

  _onContextMenu(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement) return;
    event.preventDefault();
    const document = resolveActorDocument(this.actor, itemElement.dataset.uuid);
    document?.sheet?.render?.(true);
  }

  _onDragStart(event) {
    const itemElement = event.target.closest?.("[data-uuid]");
    if (!itemElement || !this.canEdit) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "BG3T20Hotbar", uuid: itemElement.dataset.uuid }));
    event.dataTransfer.effectAllowed = "move";
    itemElement.classList.add("is-dragging");
  }

  _onDragOver(event) {
    const slot = event.target.closest?.(".bg3t20-slot");
    if (!slot || !this.canEdit) return;
    event.preventDefault();
    slot.classList.add("is-drop-target");
    event.dataTransfer.dropEffect = "move";
  }

  async _onDrop(event) {
    const slot = event.target.closest?.(".bg3t20-slot");
    if (!slot || !this.canEdit) return;
    event.preventDefault();
    slot.classList.remove("is-drop-target");

    let data = {};
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain") || "{}");
    } catch (_error) {
      data = globalThis.TextEditor?.getDragEventData?.(event) ?? {};
    }
    if (!data.uuid) data = globalThis.TextEditor?.getDragEventData?.(event) ?? data;

    let document = resolveActorDocument(this.actor, data.uuid);
    if (!document && data.type === "Item" && data.uuid) {
      try {
        const source = await fromUuid(data.uuid);
        if (source?.documentName === "Item" && source.parent?.id !== this.actor.id) {
          const [created] = await this.actor.createEmbeddedDocuments("Item", [source.toObject()]);
          document = created;
        } else document = source;
      } catch (error) {
        console.warn(`${MODULE_ID} | Item arrastado não pôde ser resolvido`, error);
      }
    }
    if (!document?.uuid) return;

    const filtered = this._filteredDocuments();
    const targetIndexOnPage = Number(slot.dataset.slotIndex);
    const targetDocument = filtered[(this.page * SLOT_COUNT) + targetIndexOnPage];
    const sourceIndex = this.order.indexOf(document.uuid);
    if (sourceIndex >= 0) this.order.splice(sourceIndex, 1);
    const targetIndex = targetDocument ? this.order.indexOf(targetDocument.uuid) : this.order.length;
    this.order.splice(Math.max(0, targetIndex), 0, document.uuid);
    await this._saveLayout();
    this.render();
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
    const document = resolveActorDocument(this.actor, itemElement.dataset.uuid);
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
      <footer>Clique para usar • Shift+clique para uso rápido • Botão direito para abrir</footer>`;
    const rect = itemElement.getBoundingClientRect();
    tooltip.classList.add("is-visible");
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tooltipRect.width - 12, Math.max(12, rect.left + rect.width / 2 - tooltipRect.width / 2));
    const top = Math.max(12, rect.top - tooltipRect.height - 12);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    this.tooltipUuid = document.uuid;
  }

  _hideTooltip() {
    this.root.querySelector(".bg3t20-tooltip")?.classList.remove("is-visible");
    this.tooltipUuid = null;
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
      content: `<p>Escolha a condição de descanso. A recuperação é calculada pela própria ficha do Tormenta20.</p>`,
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
    const preferToken = game.settings.get(MODULE_ID, "portraitSource") === "token";
    return preferToken ? (this.token?.document?.texture?.src ?? this.actor?.img) : (this.actor?.img ?? this.token?.document?.texture?.src);
  }

  _renderPortrait(stats) {
    const pvPercent = resourcePercent(stats.pv);
    const pmPercent = resourcePercent(stats.pm);
    const deathVisible = stats.pv.value <= 0 && this.actor?.type === "character";
    const deathDots = Array.from({ length: stats.deathSave.max }, (_, index) => {
      const value = index + 1;
      return `<button type="button" data-action="set-death-save" data-value="${value}" class="${value <= stats.deathSave.value ? "is-marked" : ""}" aria-label="Marcar ${value} teste(s) contra a morte"></button>`;
    }).join("");
    return `
      <div class="bg3t20-portrait-wrap">
        <button type="button" class="bg3t20-portrait" data-action="open-actor" title="Abrir ficha de ${escapeHtml(this.actor.name)}">
          <img src="${escapeHtml(this._portraitImage())}" alt="${escapeHtml(this.actor.name)}">
          <span class="bg3t20-level">Nível ${stats.level}</span>
        </button>
        <div class="bg3t20-actor-name">${escapeHtml(this.actor.name)}</div>
        <div class="bg3t20-resource pv" title="Pontos de Vida">
          <span style="width:${pvPercent}%"></span><strong>${stats.pv.value}${stats.pv.temp ? ` +${stats.pv.temp}` : ""} / ${stats.pv.max}</strong>
        </div>
        <div class="bg3t20-resource pm" title="Pontos de Mana">
          <span style="width:${pmPercent}%"></span><strong>${stats.pm.value}${stats.pm.temp ? ` +${stats.pm.temp}` : ""} / ${stats.pm.max}</strong>
        </div>
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
    return `<div class="bg3t20-weapons" aria-label="Armas rápidas">
      ${Array.from({ length: 3 }, (_, index) => this._renderMiniItem(selected[index], index)).join("")}
    </div>`;
  }

  _renderMiniItem(item, index) {
    if (!item) return `<div class="bg3t20-mini-slot is-empty"><span>${index + 1}</span></div>`;
    const equipped = isEquipped(item);
    return `<button type="button" class="bg3t20-mini-slot ${equipped ? "is-equipped" : ""}" data-action="use-item" data-uuid="${escapeHtml(item.uuid)}" draggable="${this.canEdit}">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}"><span>${index + 1}</span>${equipped ? '<i class="fa-solid fa-hand-fist"></i>' : ""}
    </button>`;
  }

  _renderFilters() {
    return `<nav class="bg3t20-filters" aria-label="Filtros da hotbar">
      ${FILTERS.map((filter) => `<button type="button" data-action="filter" data-filter="${filter.id}" class="${this.filter === filter.id ? "is-active" : ""}" title="${escapeHtml(filter.label)}"><i class="${filter.icon}"></i><span>${escapeHtml(filter.label)}</span></button>`).join("")}
    </nav>`;
  }

  _renderGrid() {
    const documents = this._pageDocuments();
    return `<div class="bg3t20-grid">
      ${Array.from({ length: SLOT_COUNT }, (_, index) => this._renderSlot(documents[index], index)).join("")}
    </div>`;
  }

  _renderSlot(document, index) {
    if (!document) return `<div class="bg3t20-slot is-empty" data-slot-index="${index}"><span>${index + 1}</span></div>`;
    const action = getActionData(document);
    const mana = getManaCost(document);
    const quantity = getQuantity(document);
    const circle = getSpellCircle(document);
    return `<button type="button" class="bg3t20-slot has-item" style="--action-color:${action.color}" data-action="use-item" data-slot-index="${index}" data-uuid="${escapeHtml(document.uuid)}" draggable="${this.canEdit}">
      <img src="${escapeHtml(document.img)}" alt="${escapeHtml(document.name)}">
      <span class="bg3t20-slot-number">${index + 1}</span>
      <span class="bg3t20-item-name">${escapeHtml(document.name)}</span>
      ${mana ? `<span class="bg3t20-badge mana">${mana}</span>` : ""}
      ${circle !== null ? `<span class="bg3t20-badge circle">${circle}</span>` : ""}
      ${quantity !== null && (document.type === "consumivel" || quantity !== 1) ? `<span class="bg3t20-badge quantity">${quantity}</span>` : ""}
    </button>`;
  }

  _renderPageControls() {
    const count = this._filteredDocuments().length;
    const pages = Math.max(1, Math.ceil(count / SLOT_COUNT));
    if (pages <= 1) return "";
    return `<div class="bg3t20-pages"><button type="button" data-action="page-prev" ${this.page === 0 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button><span>${this.page + 1} / ${pages}</span><button type="button" data-action="page-next" ${this.page >= pages - 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button></div>`;
  }

  _renderEffects() {
    const effects = Array.from(this.actor?.effects ?? []).slice(0, 8);
    if (!effects.length) return `<div class="bg3t20-effects is-empty"><span>Sem efeitos ativos</span></div>`;
    return `<div class="bg3t20-effects">${effects.map((effect) => `<button type="button" data-action="toggle-effect" data-effect-id="${effect.id}" class="${effect.disabled ? "is-disabled" : ""}" title="${escapeHtml(effect.name)}"><img src="${escapeHtml(effect.img)}" alt=""></button>`).join("")}</div>`;
  }

  _renderActions() {
    const isTurn = Boolean(game.combat?.started && game.combat?.combatant?.actor?.id === this.actor?.id);
    return `<div class="bg3t20-side-actions">
      <button type="button" data-action="end-turn" class="bg3t20-end-turn ${isTurn ? "is-current" : ""}" ${isTurn ? "" : "disabled"}><i class="fa-solid fa-forward-step"></i><span>Encerrar<br>turno</span></button>
      <button type="button" data-action="rest"><i class="fa-solid fa-campground"></i><span>Descansar</span></button>
      ${this.canEdit ? '<button type="button" data-action="autofill"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Preencher</span></button>' : ""}
      <button type="button" data-action="open-settings"><i class="fa-solid fa-gear"></i><span>Ajustes</span></button>
    </div>`;
  }

  _renderAbilities() {
    if (!this.abilitiesOpen) return "";
    const abilities = CONFIG.T20?.atributos ?? {
      for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma"
    };
    const skills = CONFIG.T20?.pericias ?? {};
    const abilityButtons = Object.entries(abilities).map(([key, label]) => {
      const localized = game.i18n.localize(label);
      const value = this.actor?.system?.atributos?.[key]?.value ?? 0;
      return `<button type="button" data-action="roll-ability" data-key="${key}"><i class="fa-solid fa-dice-d20"></i><span>${escapeHtml(localized)}</span><strong>${signed(value)}</strong></button>`;
    }).join("");
    const skillButtons = Object.entries(skills).map(([key, config]) => {
      const actorSkill = this.actor?.system?.pericias?.[key];
      if (!actorSkill) return "";
      const label = game.i18n.localize(config.label ?? actorSkill.label ?? key);
      const value = actorSkill.value ?? 0;
      const trained = Boolean(actorSkill.treinado ?? actorSkill.trained ?? actorSkill.grau);
      return `<button type="button" data-action="roll-skill" data-key="${key}" class="${trained ? "is-trained" : ""}"><span>${escapeHtml(label)}</span><strong>${signed(value)}</strong></button>`;
    }).join("");
    return `<aside class="bg3t20-roll-panel">
      <header><h3>Testes</h3><button type="button" data-action="toggle-abilities"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="bg3t20-ability-list">${abilityButtons}</div>
      <h4>Perícias</h4><div class="bg3t20-skill-list">${skillButtons}</div>
    </aside>`;
  }

  render() {
    this.root.classList.toggle("is-hidden", !this.visible);
    if (!this.visible) {
      this.root.innerHTML = '<div class="bg3t20-tooltip"></div>';
      return;
    }
    this.order = normalizeOrder(this.actor, this.order);
    const stats = getActorStats(this.actor);
    this.root.innerHTML = `
      <div class="bg3t20-shell">
        ${this._renderPortrait(stats)}
        <main class="bg3t20-main">
          ${this._renderWeapons()}
          ${this._renderFilters()}
          ${this._renderGrid()}
          ${this._renderPageControls()}
          ${this._renderEffects()}
        </main>
        ${this._renderActions()}
        ${this._renderAbilities()}
      </div>
      <div class="bg3t20-tooltip"></div>`;
  }

  async toggle(force) {
    await game.settings.set(MODULE_ID, "enabled", force ?? !this.enabled);
  }

  destroy() {
    clearTimeout(this.tooltipTimer);
    this.root.remove();
  }
}
