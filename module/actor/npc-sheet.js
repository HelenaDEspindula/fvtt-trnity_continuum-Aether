import { AetherActorSheet } from "./actor-sheet.js";
import { rollStorypath } from "../dice/storypath.js";

/**
 * AetherNpcSheet
 * -------------
 * Adds GM-only rolls for NPC pools (Primary/Secondary/Desperation).
 *
 * Design decisions:
 * - NPC rolls are ALWAYS whispered to GM (never blind) to preserve history and aid debugging.
 * - Uses centralized rules in module/dice/storypath.js to avoid duplication.
 * - Robust: failures must not break sheet rendering. Errors are caught and reported.
 */
export class AetherNpcSheet extends AetherActorSheet {
  activateListeners(html) {
    super.activateListeners(html);

    // Buttons expected in templates/actor/npc-sheet.hbs:
    // <button data-npc-roll="primary|secondary|desperation">
    html.find("[data-npc-roll]").on("click", (ev) => this._onNpcPoolRoll(ev));
  }

  async _onNpcPoolRoll(ev) {
    ev.preventDefault();

    // GM-only controls: players shouldn't roll NPC pools
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

    // Read base pool/enhancement from system data (template.json)
    const basePool = Number(this.actor.system?.npcPools?.[poolKey]?.value ?? 0) || 0;
    const baseEnh = Number(this.actor.system?.npcPools?.enhancement?.value ?? 0) || 0;

    if (basePool <= 0) {
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

              const finalPool = basePool + diceMod;
              const finalEnh = baseEnh + succMod;

              if (finalPool <= 0) {
                ui.notifications?.warn("Pool must be at least 1 after modifiers.");
                return;
              }

              // Whisper to GM by design (never blind)
              await rollStorypath({
                actor: this.actor,
                label,
                pool: finalPool,
                enhancement: finalEnh,
                difficulty,
                whisperGM: true,
                meta: {
                  "Base Pool": basePool,
                  "Dice Mod": diceMod,
                  "Base Enhancement": baseEnh,
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