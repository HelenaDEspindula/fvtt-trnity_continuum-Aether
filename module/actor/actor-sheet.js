import { AETHER } from "../constants.js";

/**
 * AetherActorSheet (base)
 * ----------------------
 * Base sheet used for both PCs and NPCs (template switches by actor.type).
 *
 * Robust engineering pattern:
 * - When a button depends on a value the user may have just typed,
 *   read it from the DOM first (form inputs) and only fallback to actor.system.
 * - This avoids stale values when inputs did not fire change/blur yet.
 */
export class AetherActorSheet extends ActorSheet {
  static get defaultOptions() {
    // Foundry v13: prefer foundry.utils.mergeObject (still compatible with mergeObject in many installs)
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
   * Read a number from the currently rendered sheet form.
   * This avoids the common Foundry issue where actor.system is not updated
   * until the input loses focus (blur/change).
   *
   * Example:
   *   const v = this.readFormNumber("system.npcPools.primary.value", this.actor.system?.npcPools?.primary?.value);
   */
  readFormNumber(inputName, fallback = 0) {
    try {
      const el = this.element?.find?.(`input[name="${inputName}"]`)?.[0];
      if (!el) return Number(fallback) || 0;

      // Prefer valueAsNumber (number inputs), fallback to Number(el.value)
      const v = Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : Number(el.value);
      return Number.isFinite(v) ? v : (Number(fallback) || 0);
    } catch (_e) {
      return Number(fallback) || 0;
    }
  }

  /**
   * Read a string from the currently rendered sheet form.
   * Useful for text inputs / textareas without relying on actor.system updates.
   */
  readFormString(inputName, fallback = "") {
    try {
      const el = this.element?.find?.(`[name="${inputName}"]`)?.[0];
      if (!el) return String(fallback ?? "");

      // Works for <input> and <textarea>
      const v = el.value ?? "";
      return String(v);
    } catch (_e) {
      return String(fallback ?? "");
    }
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