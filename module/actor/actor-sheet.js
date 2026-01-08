import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill.
 * Só sugestão: o dialog permite trocar.
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
 * - Prefer DOM (valor digitado agora)
 * - Fallback actor.system
 */
function readNumberFromSheet(html, inputName, fallback = 0) {
  try {
    const el = html?.find?.(`[name="${inputName}"]`)?.[0];
    if (!el) return Number(fallback) || 0;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : (Number(fallback) || 0);
  } catch {
    return Number(fallback) || 0;
  }
}

export class AetherActorSheet extends ActorSheet {
  static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ["aether", "sheet", "actor"],
    width: 900,
    height: 820,

    /**
     * Tabs nativas do Foundry
     * Devem bater com:
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
     * SEM quick roll: sempre abrir dialog.
     * Clique no "Roll" da skill abre rollPrompt pre-preenchido.
     */
    html.find("[data-roll-skill], [data-skill-roll]").on("click", async (ev) => {
      ev.preventDefault();

      const el = ev.currentTarget;
      const skillKey = el.dataset.rollSkill ?? el.dataset.skillRoll ?? el.dataset.skill;
      if (!skillKey) return;

      const suggestedAttr = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";

      const attrFallback = Number(this.actor.system?.attributes?.[suggestedAttr]?.value ?? 0) || 0;
      const skillFallback = Number(this.actor.system?.skills?.[skillKey]?.value ?? 0) || 0;

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
  }
}