import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill (tweak freely).
 * If a skill is not mapped, it falls back to Dexterity.
 */
const DEFAULT_ATTR_BY_SKILL = {
  aim: "dexterity",
  athletics: "dexterity",
  close_combat: "might",
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
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor"],
      width: 720,
      height: 740
    });
  }

  get template() {
    if (this.actor.type === "npc") {
      return `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`;
    }
    return `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`;
  }

  getData() {
    const data = super.getData();
    data.AETHER = AETHER;
    data.system = this.actor.system;
    return data;
  }

  /**
   * Returns the facetKey with the highest numeric value on the actor.
   * If there is a tie, returns the first in object order.
   * Falls back to "intuitive" if facets are missing.
   */
  _getHighestFacetKey() {
    const facets = this.actor?.system?.facets ?? {};
    const entries = Object.entries(facets)
      .map(([k, v]) => [k, Number(v?.value ?? 0)]);

    if (!entries.length) return "intuitive";

    entries.sort((a, b) => b[1] - a[1]);
    const [bestKey] = entries[0] ?? [];
    return bestKey || "intuitive";
  }

  /**
   * Attempts to extract a skill key from various button dataset conventions.
   * Supports:
   *  - data-roll-skill="medicine"
   *  - data-skill="medicine"
   *  - data-skill-key="medicine"
   */
  _getSkillKeyFromEvent(ev) {
    const el = ev.currentTarget;

    // Most common patterns
    const direct =
      el?.dataset?.rollSkill ??
      el?.dataset?.skill ??
      el?.dataset?.skillKey ??
      el?.dataset?.skillkey ??
      el?.dataset?.key;

    if (direct) return String(direct);

    // Sometimes a child element carries the dataset
    const childWithData = el?.querySelector?.("[data-roll-skill],[data-skill],[data-skill-key]");
    if (childWithData) {
      return String(
        childWithData.dataset.rollSkill ??
        childWithData.dataset.skill ??
        childWithData.dataset.skillKey ??
        childWithData.dataset.skillkey ??
        childWithData.dataset.skillKey ??
        childWithData.dataset.key ??
        ""
      );
    }

    // Sometimes the closest parent has it
    const parent = el?.closest?.("[data-roll-skill],[data-skill],[data-skill-key]");
    if (parent) {
      return String(
        parent.dataset.rollSkill ??
        parent.dataset.skill ??
        parent.dataset.skillKey ??
        parent.dataset.skillkey ??
        parent.dataset.key ??
        ""
      );
    }

    return "";
  }

  activateListeners(html) {
    super.activateListeners(html);

    const highestFacetKey = this._getHighestFacetKey();

    /**
     * Skill roll handler (robust).
     * Binds to both:
     *  - [data-roll-skill] (recommended)
     *  - .aether-roll (in case template uses that class)
     */
    const onSkillRoll = async (ev) => {
      ev.preventDefault();

      const skillKey = this._getSkillKeyFromEvent(ev);

      if (!skillKey) {
        ui.notifications?.warn("No skill key found on the clicked Roll button.");
        return;
      }

      const attrKey = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";
      const skillName = AETHER.SKILLS?.[skillKey] ?? skillKey;
      const attrName = AETHER.ATTRIBUTES?.[attrKey] ?? attrKey;

      await this.actor.rollPrompt({
        attrKey,
        skillKey,
        facetKey: highestFacetKey,
        label: `${attrName} + ${skillName}`
      });
    };

    // Recommended selector (if your template uses data-roll-skill)
    html.find("[data-roll-skill]").on("click", onSkillRoll);

    // Fallback selector (if your template uses .aether-roll buttons)
    html.find(".aether-roll").on("click", onSkillRoll);

    // Generic prompt button
    html.find("[data-roll-prompt]").on("click", async (ev) => {
      ev.preventDefault();
      await this.actor.rollPrompt({
        label: "Storypath Roll",
        facetKey: highestFacetKey
      });
    });
  }
}
