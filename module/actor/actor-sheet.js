import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill
 * (Used only as a suggestion; user can still choose other Attributes via prompt later.)
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
 * - Prefer the live value in the rendered sheet input (DOM)
 * - Fallback to actor.system value
 */
function readNumberFromSheet(html, inputName, fallback = 0) {
  try {
    const el = html?.find?.(`[name="${inputName}"]`)?.[0];
    if (!el) return Number(fallback) || 0;

    const v = Number(el.value);
    if (Number.isFinite(v)) return v;

    return Number(fallback) || 0;
  } catch (_e) {
    return Number(fallback) || 0;
  }
}

/**
 * Safely resolve the skill key from the clicked element or its ancestors.
 */
function getSkillKeyFromEvent(ev) {
  const el = ev.currentTarget;

  // Direct dataset variations
  const direct =
    el?.dataset?.rollSkill ??
    el?.dataset?.skill ??
    el?.dataset?.skillKey;

  if (direct) return direct;

  // Try closest ancestor with dataset
  const closest = el?.closest?.("[data-roll-skill]");
  if (closest?.dataset?.rollSkill) return closest.dataset.rollSkill;

  return null;
}

export class AetherActorSheet extends ActorSheet {
  /* -------------------------------------------- */
  /*  CONFIG                                      */
  /* -------------------------------------------- */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor"],
      width: 900,
      height: 820,
      /**
       * Tabs config must match the template selectors.
       * We use Foundry's standard:
       * - navSelector: ".sheet-tabs"
       * - contentSelector: ".sheet-body"
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
    // Character sheet only. NPC sheet is handled by npc-sheet.js (separate class).
    return `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`;
  }

  /* -------------------------------------------- */
  /*  DATA PREP                                   */
  /* -------------------------------------------- */

  getData() {
    const data = super.getData();

    data.AETHER = AETHER;
    data.system = this.actor.system;
    data.isGM = game.user?.isGM ?? false;

    const items = this.actor.items ?? [];

    // ExEss-style lists (kept if you are using Items for these)
    data.aspirations = items.filter(i => i.type === "aspiration");

    data.pathsOrigin = items.filter(i => i.type === "path" && i.system?.kind === "origin");
    data.pathsSociety = items.filter(i => i.type === "path" && i.system?.kind === "society");
    data.pathsRole = items.filter(i => i.type === "path" && i.system?.kind === "role");

    data.gifts = items.filter(i => i.type === "gift");
    data.deviations = items.filter(i => i.type === "deviation");

    data.edges = items.filter(i => i.type === "edge");
    data.skillTricks = items.filter(i => i.type === "skillTrick");
    data.affinities = items.filter(i => i.type === "affinity");

    data.weapons = items.filter(i => i.type === "weapon");
    data.armors = items.filter(i => i.type === "armor");
    data.vehicles = items.filter(i => i.type === "vehicle");
    data.apparatus = items.filter(i => i.type === "apparatus");

    // Required deviations = number of Magog gifts
    data.requiredDeviations = data.gifts.filter(g => g.system?.isMagog).length;

    // Highest facet (default for rolls)
    data.highestFacetKey = this.actor.getHighestFacetKey?.() ?? "intuitive";

    return data;
  }

  /* -------------------------------------------- */
  /*  LISTENERS                                   */
  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    /* ---------------------------------------- */
    /*  Skill Rolls (robust DOM-first)           */
    /* ---------------------------------------- */

    // IMPORTANT: do NOT bind ".aether-roll" globally for PC,
    // because NPC uses ".aether-roll" too.
    // For PCs, bind only elements that explicitly declare a skill key.
    html.find("[data-roll-skill]").on("click", async (ev) => {
      ev.preventDefault();

      const skillKey = getSkillKeyFromEvent(ev);
      if (!skillKey) {
        ui.notifications?.warn("No skill defined for this roll.");
        return;
      }

      // Suggested attribute for this skill
      const attrKey = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";

      // Read CURRENT values from the sheet first (DOM), fallback to actor.system
      const attrFallback = Number(this.actor.system?.attributes?.[attrKey]?.value ?? 0) || 0;
      const skillFallback = Number(this.actor.system?.skills?.[skillKey]?.value ?? 0) || 0;

      const attrVal = readNumberFromSheet(html, `system.attributes.${attrKey}.value`, attrFallback);
      const skillVal = readNumberFromSheet(html, `system.skills.${skillKey}.value`, skillFallback);

      const pool = (Number(attrVal) || 0) + (Number(skillVal) || 0);

      const attrName = AETHER.ATTRIBUTES?.[attrKey] ?? attrKey;
      const skillName = AETHER.SKILLS?.[skillKey] ?? skillKey;

      if (pool <= 0) {
        ui.notifications?.warn(
          `Pool is ${pool}. Check that ${attrName} and ${skillName} values are set and saved.`
        );
        return;
      }

     // IMPORTANT: open the prompt so the user can choose attribute, mods, inspiration, etc.
  if (typeof this.actor.rollPrompt === "function") {
    await this.actor.rollPrompt({
      label: "Skill Roll",
      attrKey: suggestedAttrKey,
      skillKey,
      // prefill pool, but user can override in dialog
      pool: basePool,
      // default facet = highest facet
      facetKey: this.actor.getHighestFacetKey?.() ?? "intuitive"
    });
  } else {
    ui.notifications?.error("rollPrompt() is not available. Implement it in actor.js or use a Dialog here.");
  }
});

    /* ---------------------------------------- */
    /*  Generic prompt button (optional)         */
    /* ---------------------------------------- */

    html.find("[data-roll-prompt]").on("click", async (ev) => {
      ev.preventDefault();
      if (typeof this.actor.rollPrompt === "function") {
        await this.actor.rollPrompt({ label: "Storypath Roll" });
      } else {
        ui.notifications?.info("rollPrompt is not enabled in this build.");
      }
    });

    /* ---------------------------------------- */
    /*  Inspiration Reset (Session Start)        */
    /* ---------------------------------------- */

    html.find(".aether-insp-reset").on("click", async (ev) => {
      ev.preventDefault();

      if (!game.user?.isGM) {
        ui.notifications?.warn("Only the GM can reset Inspiration.");
        return;
      }

      const max = Number(this.actor.system?.pools?.inspiration?.max ?? 0) || 0;
      await this.actor.update({ "system.pools.inspiration.value": max });

      ui.notifications?.info(`Inspiration reset to ${max}.`);
    });

    /* ---------------------------------------- */
    /*  Item Controls (if you are using Items)   */
    /* ---------------------------------------- */

    html.find(".item-create").on("click", async (ev) => {
      ev.preventDefault();
      const type = ev.currentTarget?.dataset?.type;
      if (!type) return;

      await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${type}`, type }]);
    });

    html.find(".item-edit").on("click", (ev) => {
      ev.preventDefault();
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset?.itemId);
      item?.sheet?.render(true);
    });

    html.find(".item-delete").on("click", async (ev) => {
      ev.preventDefault();
      const li = ev.currentTarget.closest(".item");
      if (!li?.dataset?.itemId) return;
      await this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId]);
    });

    /* ---------------------------------------- */
    /*  Health tracker (optional)                */
    /* ---------------------------------------- */

    // Use delegation-safe selection; only bind if present.
    html.find(".health-box").on("click", async (ev) => {
      ev.preventDefault();

      const levelKey = ev.currentTarget?.dataset?.level;
      const index = Number(ev.currentTarget?.dataset?.index);

      if (!levelKey || !Number.isFinite(index)) return;

      const level = foundry.utils.duplicate(this.actor.system?.health?.levels?.[levelKey]);
      if (!level) return;

      const isChecked = !!ev.currentTarget?.checked;
      const newChecked = isChecked ? index + 1 : index;

      await this.actor.update({
        [`system.health.levels.${levelKey}.checked`]: newChecked
      });
    });
  }
}
