import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill.
 * Suggestion only: the dialog allows changing.
 */
const DEFAULT_ATTR_BY_SKILL = {
  aim: "dexterity",
  athletics: "dexterity",
  closeCombat: "might",
  command: "presence",
  culture: "intellect",
  empathy: "presence",
  enigmas: "intellect",
  humanities: "intellect",
  integrity: "resolve",
  larceny: "cunning",
  medicine: "intellect",
  persuasion: "presence",
  pilot: "dexterity",
  science: "intellect",
  survival: "cunning",
  technology: "intellect"
};

/**
 * Robust numeric read:
 * - Prefer DOM (current typed value)
 * - Fallback to actor.system
 */
function readNumberFromSheet(html, inputName, fallback = 0) {
  try {
    const el = html?.find?.(`[name="${inputName}"]`)?.[0];
    if (!el) return Number(fallback) || 0;

    // Use valueAsNumber when possible (more reliable for number inputs)
    const v = Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : Number(el.value);
    return Number.isFinite(v) ? v : (Number(fallback) || 0);
  } catch {
    return Number(fallback) || 0;
  }
}

/**
 * Clamp integer within [min, max].
 */
function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export class AetherActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor"],
      width: 900,
      height: 820,

      /**
       * Foundry native tabs:
       * Must match:
       * - nav: <nav class="sheet-tabs tabs" data-group="primary">
       * - content: <section class="sheet-body"> ... <div class="tab" data-tab="...">
       */
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description"
        }
      ]
    });
  }

  get template() {
    return `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`;
  }

  getData() {
    const data = super.getData();
    data.AETHER = AETHER;
    data.system = this.actor.system;
    data.isGM = game.user.isGM;
    data.highestFacetKey = this.actor.getHighestFacetKey?.() ?? "intuitive";
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    /**
     * NO quick roll: always open dialog.
     * Clicking the Skill "Roll" button opens rollPrompt prefilled.
     */
    html.find("[data-roll-skill], [data-skill-roll]").on("click", async (ev) => {
      ev.preventDefault();

      const el = ev.currentTarget;
      const skillKey = el.dataset.rollSkill ?? el.dataset.skillRoll ?? el.dataset.skill;
      if (!skillKey) return;

      const suggestedAttr = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";

      const attrFallback = Number(this.actor.system?.attributes?.[suggestedAttr]?.value ?? 0) || 0;
      const skillFallback = Number(this.actor.system?.skills?.[skillKey]?.value ?? 0) || 0;

      // DOM-first read so unsaved typed values are respected
      const attrVal = readNumberFromSheet(html, `system.attributes.${suggestedAttr}.value`, attrFallback);
      const skillVal = readNumberFromSheet(html, `system.skills.${skillKey}.value`, skillFallback);

      const pool = (Number(attrVal) || 0) + (Number(skillVal) || 0);

      const attrName = AETHER.ATTRIBUTES?.[suggestedAttr] ?? suggestedAttr;
      const skillName = AETHER.SKILLS?.[skillKey] ?? skillKey;

      await this.actor.rollPrompt({
        label: `${attrName} + ${skillName}`,
        attrKey: suggestedAttr,
        skillKey,
        pool
      });
    });

    html.find("[data-roll-prompt]").on("click", async (ev) => {
      ev.preventDefault();
      await this.actor.rollPrompt({ label: "Storypath Roll" });
    });

    html.find(".aether-insp-reset").on("click", async (ev) => {
      ev.preventDefault();

      if (!game.user.isGM) {
        ui.notifications?.warn("Only the GM can reset Inspiration.");
        return;
      }

      const max = Number(this.actor.system?.pools?.inspiration?.max ?? 0) || 0;
      await this.actor.update({ "system.pools.inspiration.value": max });
      ui.notifications?.info(`Inspiration reset to ${max}.`);
    });

    /* -------------------------------------------- */
    /*  Health tracker (DOM-first + persisted)       */
    /* -------------------------------------------- */

    html.find(".aether-health-rebuild").on("click", async (ev) => {
      ev.preventDefault();
      await this._rebuildHealthFromSheet(html);
    });

    html.find(".aether-health-box").on("click", async (ev) => {
      ev.preventDefault();
      await this._cycleHealthBox(ev);
    });
  }

  /**
   * Rebuild health boxes array to match current Max.
   * Robust behavior:
   * - Read max from DOM (current typed value)
   * - Fallback actor.system.health.max
   * - Preserve existing box states where possible
   */
  async _rebuildHealthFromSheet(html) {
    const sysHealth = this.actor.system?.health ?? {};
    const currentMaxFallback = Number(sysHealth.max ?? 0) || 0;

    const max = Math.max(0, readNumberFromSheet(html, "system.health.max", currentMaxFallback));

    const existing = Array.isArray(sysHealth.boxes) ? sysHealth.boxes.slice() : [];
    const boxes = existing.slice(0, max);

    while (boxes.length < max) boxes.push(0);

    // Clamp states
    for (let i = 0; i < boxes.length; i++) {
      boxes[i] = clampInt(boxes[i], 0, 3);
    }

    await this.actor.update({
      "system.health.max": max,
      "system.health.boxes": boxes
    });
  }

  /**
   * Cycle a single health box state:
   * 0 empty -> 1 bashing -> 2 lethal -> 3 aggravated -> 0 empty
   */
  async _cycleHealthBox(ev) {
    const target = ev.currentTarget;
    const idx = Number(target?.dataset?.healthIndex);
    if (!Number.isFinite(idx)) return;

    // Always operate on actor.system (source of truth), then persist.
    const sysHealth = this.actor.system?.health ?? {};
    const boxes = Array.isArray(sysHealth.boxes) ? sysHealth.boxes.slice() : [];
    if (idx < 0 || idx >= boxes.length) return;

    const current = clampInt(boxes[idx], 0, 3);
    const next = (current + 1) % 4;
    boxes[idx] = next;

    await this.actor.update({ "system.health.boxes": boxes });
  }
}