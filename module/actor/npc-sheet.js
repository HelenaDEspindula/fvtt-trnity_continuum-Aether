import { AETHER } from "../constants.js";
import { rollStorypath } from "../dice/storypath.js";

/**
 * AetherNpcSheet
 * -------------
 * Dedicated NPC sheet (does NOT inherit from the PC sheet).
 *
 * Why:
 * - Inheriting from AetherActorSheet makes NPCs use the PC template and PC listeners.
 * - Keeping NPC isolated is more robust for future changes and collaboration.
 *
 * Rolls:
 * - GM-only
 * - Whispered to GM (not blind)
 * - Reads live DOM inputs first (most up-to-date), falls back to actor.system.
 */
export class AetherNpcSheet extends ActorSheet {
  /* -------------------------------------------- */
  /*  CONFIG                                      */
  /* -------------------------------------------- */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor", "npc"],
      width: 720,
      height: 420
    });
  }

  get template() {
    return `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`;
  }

  getData() {
    const data = super.getData();
    data.AETHER = AETHER;
    data.system = this.actor.system;
    data.isGM = game.user?.isGM ?? false;
    return data;
  }

  /* -------------------------------------------- */
  /*  LISTENERS                                   */
  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    // Only NPC pool rolls live here
    html.find("[data-npc-roll]").on("click", (ev) => this._onNpcPoolRoll(ev));
  }

  /**
   * Safely read a number from an input on the current sheet (DOM-first).
   * @param {string} inputName
   * @param {number} fallback
   */
  _readSheetNumberInput(inputName, fallback = 0) {
    try {
      // Use the rendered HTML when available; fallback to this.element
      const root = this.element ?? null;

      // Try direct from current rendered html (preferred)
      const direct = this._element?.find?.(`input[name="${inputName}"]`)?.[0];
      const el = direct ?? root?.find?.(`input[name="${inputName}"]`)?.[0];

      if (!el) return Number(fallback) || 0;

      // valueAsNumber is most reliable for <input type="number">
      const v = Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : Number(el.value);
      return Number.isFinite(v) ? v : (Number(fallback) || 0);
    } catch (_e) {
      return Number(fallback) || 0;
    }
  }

  async _onNpcPoolRoll(ev) {
    ev.preventDefault();

    // GM-only
    if (!game.user?.isGM) {
      ui.notifications?.warn("NPC pool rolls are GM-only.");
      return;
    }

    const poolKey = ev.currentTarget?.dataset?.npcRoll;
    if (!poolKey) return;

    const labelByKey = {
      primary: "Primary Pool",
      secondary: "Secondary Pool",
      desperation: "Desperation Pool"
    };
    const label = labelByKey[poolKey] ?? "NPC Pool";

    // Read current values from sheet first
    const inputPoolName = `system.npcPools.${poolKey}.value`;
    const inputEnhName = `system.npcPools.enhancement.value`;

    const sysPoolFallback = this.actor.system?.npcPools?.[poolKey]?.value ?? 0;
    const sysEnhFallback = this.actor.system?.npcPools?.enhancement?.value ?? 0;

    const basePool = this._readSheetNumberInput(inputPoolName, sysPoolFallback);
    const baseEnh = this._readSheetNumberInput(inputEnhName, sysEnhFallback);

    if ((Number(basePool) || 0) <= 0) {
      ui.notifications?.warn(`${label} is 0. Set a pool value before rolling.`);
      return;
    }

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Dice modifier (can be negative)</label>
          <input type="number" name="diceMod" value="0" />
        </div>

        <div class="form-group">
          <label>Success modifier (adds to Enhancement, can be negative)</label>
          <input type="number" name="succMod" value="0" />
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <input type="number" name="difficulty" value="0" min="0" />
        </div>

        <hr/>

        <p class="notes">
          Base Pool: <b>${Number(basePool) || 0}</b> &nbsp;|&nbsp;
          Base Enhancement: <b>${Number(baseEnh) || 0}</b>
        </p>
      </form>
    `;

    return new Dialog({
      title: `${this.actor.name} — ${label}`,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async (dlgHtml) => {
            try {
              const form = dlgHtml[0].querySelector("form");
              const fd = new FormData(form);

              const diceMod = Number(fd.get("diceMod") || 0) || 0;
              const succMod = Number(fd.get("succMod") || 0) || 0;
              const difficulty = Math.max(0, Number(fd.get("difficulty") || 0) || 0);

              const finalPool = (Number(basePool) || 0) + diceMod;
              const finalEnh = (Number(baseEnh) || 0) + succMod;

              if (finalPool <= 0) {
                ui.notifications?.warn("Pool must be at least 1 after modifiers.");
                return;
              }

              await rollStorypath({
                actor: this.actor,
                label,
                pool: finalPool,
                enhancement: finalEnh,
                difficulty,
                whisperGM: true,
                meta: {
                  "Base Pool": Number(basePool) || 0,
                  "Dice Mod": diceMod,
                  "Base Enhancement": Number(baseEnh) || 0,
                  "Success Mod": succMod
                }
              });
            } catch (e) {
              console.error("AetherNpcSheet | roll callback failed", e);
              ui.notifications?.error("NPC roll failed. See console for details.");
            }
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }
}