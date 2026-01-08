import { AETHER } from "../constants.js";

/**
 * Default Attribute suggestion by Skill.
 * Only a suggestion; the dialog allows changing it.
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
 * Normalize Foundry's html argument into a plain HTMLElement root.
 * Works across appv1/appv2 cases and with/without jQuery.
 */
function getRootElement(html) {
  // jQuery-like
  if (html?.[0] instanceof HTMLElement) return html[0];
  // Already HTMLElement
  if (html instanceof HTMLElement) return html;
  // ActorSheet has this.element (usually jQuery), but don't rely on it
  return null;
}

/**
 * Robust numeric read:
 * - Prefer the live input value in the rendered sheet (DOM)
 * - Fallback to actor.system
 */
function readNumberFromRoot(root, inputName, fallback = 0) {
  try {
    if (!root) return Number(fallback) || 0;
    const el = root.querySelector(`[name="${inputName}"]`);
    if (!el) return Number(fallback) || 0;

    // Prefer valueAsNumber for number inputs
    const v =
      typeof el.valueAsNumber === "number" && Number.isFinite(el.valueAsNumber)
        ? el.valueAsNumber
        : Number(el.value);

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
       * Foundry native tabs:
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

    // Highest facet (default selection in roll dialog)
    data.highestFacetKey = this.actor.getHighestFacetKey?.() ?? "intuitive";

    // Ensure health exists for safe rendering (do not auto-save here)
    const h = data.system.health ?? {};
    data.system.health = {
      max: Number(h.max ?? 0) || 0,
      boxes: Array.isArray(h.boxes) ? h.boxes : []
    };

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    const root = getRootElement(html);
    if (!root) {
      console.warn(`${AETHER.ID} | AetherActorSheet | Could not resolve sheet root element.`);
      return;
    }

    /**
     * SEM quick roll: always open the roll dialog.
     * Any element with data-roll-skill (or compatible aliases) triggers rollPrompt.
     */
    const skillRollTargets = root.querySelectorAll("[data-roll-skill],[data-skill-roll],[data-rollskill]");
    skillRollTargets.forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const el = ev.currentTarget;

        const skillKey =
          el.dataset.rollSkill ??
          el.dataset.skillRoll ??
          el.dataset.rollskill ??
          el.dataset.skill;

        if (!skillKey) {
          ui.notifications?.warn("No skill defined for this roll.");
          return;
        }

        const suggestedAttr = DEFAULT_ATTR_BY_SKILL[skillKey] ?? "dexterity";

        const attrFallback = Number(this.actor.system?.attributes?.[suggestedAttr]?.value ?? 0) || 0;
        const skillFallback = Number(this.actor.system?.skills?.[skillKey]?.value ?? 0) || 0;

        const attrVal = readNumberFromRoot(root, `system.attributes.${suggestedAttr}.value`, attrFallback);
        const skillVal = readNumberFromRoot(root, `system.skills.${skillKey}.value`, skillFallback);

        const pool = (Number(attrVal) || 0) + (Number(skillVal) || 0);

        const attrName = AETHER.ATTRIBUTES?.[suggestedAttr] ?? suggestedAttr;
        const skillName = AETHER.SKILLS?.[skillKey] ?? skillKey;

        if (typeof this.actor.rollPrompt !== "function") {
          ui.notifications?.error("rollPrompt is not available on this Actor. Check actor.js exports/imports.");
          return;
        }

        await this.actor.rollPrompt({
          label: `${attrName} + ${skillName}`,
          attrKey: suggestedAttr,
          skillKey,
          pool
        });
      });
    });

    /**
     * Generic roll prompt button (optional)
     */
    root.querySelectorAll("[data-roll-prompt]").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (typeof this.actor.rollPrompt !== "function") {
          ui.notifications?.error("rollPrompt is not available on this Actor. Check actor.js exports/imports.");
          return;
        }

        await this.actor.rollPrompt({ label: "Storypath Roll" });
      });
    });

    /**
     * GM-only Inspiration reset
     */
    root.querySelectorAll(".aether-insp-reset").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (!game.user?.isGM) {
          ui.notifications?.warn("Only the GM can reset Inspiration.");
          return;
        }

        const max = Number(this.actor.system?.pools?.inspiration?.max ?? 0) || 0;
        await this.actor.update({ "system.pools.inspiration.value": max });
        ui.notifications?.info(`Inspiration reset to ${max}.`);
      });
    });

    /**
     * Health header: rebuild track (button exists in your header now)
     */
    root.querySelectorAll(".aether-health-rebuild").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const max = readNumberFromRoot(root, "system.health.max", Number(this.actor.system?.health?.max ?? 0) || 0);
        const safeMax = Math.max(0, Math.floor(Number(max) || 0));

        const boxes = Array.from({ length: safeMax }, () => ({ state: 0 }));
        await this.actor.update({
          "system.health.max": safeMax,
          "system.health.boxes": boxes
        });
      });
    });

    /**
     * Health header: click to cycle state 0->1->2->3->0
     */
    root.querySelectorAll(".aether-health-box").forEach((boxEl) => {
      boxEl.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const idx = Number(ev.currentTarget?.dataset?.index);
        if (!Number.isFinite(idx)) return;

        const boxes = Array.isArray(this.actor.system?.health?.boxes)
          ? foundry.utils.duplicate(this.actor.system.health.boxes)
          : [];

        if (!boxes[idx]) return;

        const current = Number(boxes[idx].state ?? 0) || 0;
        const next = (current + 1) % 4;
        boxes[idx].state = next;

        await this.actor.update({ "system.health.boxes": boxes });
      });
    });
  }
}