import { AETHER } from "../constants.js";

export class AetherActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
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

  activateListeners(html) {
    super.activateListeners(html);

    // Click-to-roll on Skills: opens the standard prompt (defaults Attribute to Dexterity)
    html.find("[data-roll-skill]").on("click", async (ev) => {
      ev.preventDefault();
      const skillKey = ev.currentTarget.dataset.rollSkill;
      await this.actor.rollPrompt({ attrKey: "dexterity", skillKey, label: "Skill Roll" });
    });

    // Generic prompt button
    html.find("[data-roll-prompt]").on("click", async (ev) => {
      ev.preventDefault();
      await this.actor.rollPrompt({ label: "Storypath Roll" });
    });
  }
}
