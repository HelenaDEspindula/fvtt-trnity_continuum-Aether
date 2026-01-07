import { AetherActorSheet } from "./actor-sheet.js";

export class AetherNpcSheet extends AetherActorSheet {
  activateListeners(html) {
    super.activateListeners(html);

    // NPC pool rolls (GM-only)
    html.find("[data-npc-roll]").on("click", (ev) => this._onNpcRoll(ev));
  }

  async _onNpcRoll(ev) {
    ev.preventDefault();

    const poolKey = ev.currentTarget?.dataset?.npcRoll;
    if (!poolKey) return;

    // Read base pool
    const basePool = Number(this.actor.system?.npcPools?.[poolKey]?.value ?? 0) || 0;
    const baseEnh = Number(this.actor.system?.npcPools?.enhancement?.value ?? 0) || 0;

    const poolLabels = {
      primary: "Primary Pool",
      secondary: "Secondary Pool",
      desperation: "Desperation Pool"
    };

    const label = poolLabels[poolKey] ?? "NPC Pool";

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Dice modifier (can be negative)</label>
          <input type="number" name="diceMod" value="0" />
        </div>

        <div class="form-group">
          <label>Success modifier (Enhancement, can be negative)</label>
          <input type="number" name="succMod" value="0" />
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <input type="number" name="difficulty" value="0" />
        </div>
      </form>
    `;

    return new Dialog({
      title: `${label} Roll`,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async (html) => {
            const form = html[0].querySelector("form");
            const fd = new FormData(form);

            const diceMod = Number(fd.get("diceMod") || 0) || 0;
            const succMod = Number(fd.get("succMod") || 0) || 0;
            const difficulty = Number(fd.get("difficulty") || 0) || 0;

            const finalPool = Math.max(0, basePool + diceMod);
            const enhancement = baseEnh + succMod;

            if (finalPool <= 0) {
              ui.notifications?.warn("Pool must be at least 1 after modifiers.");
              return;
            }

            const roll = await new Roll(`${finalPool}d10`).evaluate();

            const die = roll.dice?.[0];
            const results = (die?.results ?? []).map(r => r.result);
            const successesFromDice = results.filter(v => v >= 8).length;

            const totalSuccesses = successesFromDice + enhancement;
            const netSuccesses = totalSuccesses - difficulty;

            const htmlCard = `
              <div class="aether-chatcard">
                <div class="aether-title">${this.actor.name} — ${label}</div>

                <div class="aether-row"><b>Pool</b>: ${finalPool}d10 (base ${basePool}${diceMod ? `, mod ${diceMod}` : ""})</div>
                <div class="aether-row"><b>Dice</b>: ${results.join(", ")}</div>

                <hr>

                <div class="aether-row"><b>Successes (dice)</b>: ${successesFromDice}</div>
                <div class="aether-row"><b>Enhancement</b>: ${enhancement >= 0 ? "+" : ""}${enhancement} (base ${baseEnh}${succMod ? `, mod ${succMod}` : ""})</div>
                <div class="aether-row"><b>Difficulty</b>: -${difficulty}</div>

                <hr>

                <div class="aether-row"><b>Total successes</b>: ${totalSuccesses}</div>
                <div class="aether-row"><b>Net successes</b>: <span class="aether-big">${netSuccesses}</span></div>
              </div>
            `;

            // Whisper to GM only
            const gmIds = game.users?.filter(u => u.isGM)?.map(u => u.id) ?? [];

            return roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flavor: htmlCard,
              whisper: gmIds
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }
}