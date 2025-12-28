import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill
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

export class AetherActorSheet extends ActorSheet {

  /* -------------------------------------------- */
  /*  CONFIG                                      */
  /* -------------------------------------------- */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor"],
      width: 900,
      height: 820,
      tabs: [
        {
          navSelector: ".aether-tabs",
          contentSelector: ".aether-tab-content",
          initial: "description"
        }
      ]
    });
  }

  get template() {
    return `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`;
  }

  /* -------------------------------------------- */
  /*  DATA PREP                                   */
  /* -------------------------------------------- */

  getData() {
    const data = super.getData();

    data.AETHER = AETHER;
    data.system = this.actor.system;
    data.isGM = game.user.isGM;

    const items = this.actor.items;

    // === Item lists (ExEss-style) ===
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
    data.highestFacetKey = this.actor.getHighestFacetKey();

    return data;
  }

  /* -------------------------------------------- */
  /*  LISTENERS                                   */
  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    /* ---------------------------------------- */
    /*  Skill Rolls                              */
    /* ---------------------------------------- */

    html.find("[data-roll-skill], .aether-roll").on("click", async ev => {
      ev.preventDefault();

      const el = ev.currentTarget;
      const skillKey =
        el.dataset.rollSkill ??
        el.dataset.skill ??
        el.dataset.skillKey ??
        el.closest("[data-roll-skill]")?.dataset?.rollSkill;

      if (!skillKey) {
        ui.notifications.warn("No skill defined for this roll.");
        return;
      }

      const attrKey = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";
      const attrName = AETHER.ATTRIBUTES[attrKey] ?? attrKey;
      const skillName = AETHER.SKILLS[skillKey] ?? skillKey;

      await this.actor.rollStorypath({
        attrKey,
        skillKey,
        facetKey: this.actor.getHighestFacetKey(),
        label: `${attrName} + ${skillName}`
      });
    });

    /* ---------------------------------------- */
    /*  Inspiration Reset (Session Start)       */
    /* ---------------------------------------- */

    html.find(".aether-insp-reset").on("click", async ev => {
      ev.preventDefault();

      const max = Number(this.actor.system?.pools?.inspiration?.max ?? 0) || 0;
      await this.actor.update({
        "system.pools.inspiration.value": max
      });

      ui.notifications.info(`Inspiration reset to ${max}.`);
    });

    /* ---------------------------------------- */
    /*  Item Controls                            */
    /* ---------------------------------------- */

    html.find(".item-create").on("click", async ev => {
      ev.preventDefault();
      const type = ev.currentTarget.dataset.type;
      if (!type) return;

      await this.actor.createEmbeddedDocuments("Item", [
        { name: `New ${type}`, type }
      ]);
    });

    html.find(".item-edit").on("click", ev => {
      ev.preventDefault();
      const li = ev.currentTarget.closest(".item");
      const item = this.actor.items.get(li?.dataset?.itemId);
      item?.sheet?.render(true);
    });

    html.find(".item-delete").on("click", async ev => {
      ev.preventDefault();
      const li = ev.currentTarget.closest(".item");
      if (!li) return;
      await this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId]);
    });

    /* ---------------------------------------- */
    /*  Health Tracker                           */
    /* ---------------------------------------- */

    html.find(".health-box").on("click", async ev => {
      const levelKey = ev.currentTarget.dataset.level;
      const index = Number(ev.currentTarget.dataset.index);

      const level =
        foundry.utils.duplicate(this.actor.system.health.levels[levelKey]);

      const newChecked = ev.currentTarget.checked ? index + 1 : index;

      await this.actor.update({
        [`system.health.levels.${levelKey}.checked`]: newChecked
      });
    });
  }
}
