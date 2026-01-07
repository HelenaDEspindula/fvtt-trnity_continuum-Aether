import { AetherActorSheet } from "./actor-sheet.js";
import { rollStorypath } from "../dice/storypath.js";

/**
 * AetherNpcSheet
 * -------------
 * GM-only rolls for NPC pools (Primary/Secondary/Desperation).
 *
 * Robust approach:
 * - Read the CURRENT input values from the rendered sheet when the button is clicked.
 *   (Foundry may not have committed the latest typed value into actor.system yet.)
 * - Fallback to actor.system values if inputs are not found.
 * - Rolls are ALWAYS whispered to GM (not blind) to preserve roll history and debugging.
 */
export class AetherNpcSheet extends AetherActorSheet {
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-npc-roll]").on("click", (ev) => this._onNpcPoolRoll(ev));
  }

  /**
   * Safely read a number from an input on the current sheet.
   */
  _readSheetNumberInput(inputName, fallback = 0) {
    try {
      const el = this.element?.find?.(`input[name="${inputName}"]`)?.[0];
      if (!el) return Number(fallback) || 0;

      // Use valueAsNumber when possible (more reliable for number inputs)
      const v = Number.isFinite(el.valueAsNumber) ? el.valueAsNumber : Number(el.value);
      return Number.isFinite(v) ? v : (Number(fallback) || 0);
    } catch (e) {
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

    // IMPORTANT: Read current values from the sheet inputs first (most up-to-date).
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
          Base Pool: <b>${basePool}</b> &nbsp;|&nbsp; Base Enhancement: <b>${baseEnh}</b>
        </p>
      </form>
    `;

    return new Dialog({
      title: `${label} Roll`,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async (html) => {
            try {
              const form = html[0].querySelector("form");
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