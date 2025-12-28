import { AETHER } from "../constants.js";

export class AetherNpcSheet extends ActorSheet {

  /* -------------------------------------------- */
  /*  CONFIG                                      */
  /* -------------------------------------------- */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["aether", "sheet", "actor", "npc"],
      width: 520,
      height: 520
    });
  }

  get template() {
    return `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`;
  }

  /* -------------------------------------------- */
  /*  DATA PREP                                   */
  /* -------------------------------------------- */

  getData() {
    const data = super.getData();

    data.system = this.actor.system;
    data.isGM = game.user.isGM;

    return data;
  }

  /* -------------------------------------------- */
  /*  LISTENERS                                   */
  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    // NPC rolls are GM-only
    if (!game.user.isGM) return;

    html.find(".npc-roll").on("click", ev => {
      ev.preventDefault();

      const poolKey = ev.currentTarget.dataset.pool;
      if (!poolKey) {
        ui.notifications.warn("No NPC pool defined.");
        return;
      }

      this._openNpcRollDialog(poolKey);
    });
  }

  /* -------------------------------------------- */
  /*  DIALOG                                      */
  /* -------------------------------------------- */

  async _openNpcRollDialog(poolKey) {
    const pools = this.actor.system?.npc?.pools ?? {};
    const poolData = pools[poolKey];

    if (!poolData) {
      ui.notifications.warn("Invalid NPC pool.");
      return;
    }

    const basePool = Number(poolData.value) || 0;
    const label = poolData.label ?? poolKey;

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Base Pool</label>
          <input type="number" value="${basePool}" disabled />
        </div>

        <div class="form-group">
          <label>Dice Modifier (+ / -)</label>
          <input type="number" name="diceMod" value="0" />
        </div>

        <div class="form-group">
          <label>Success Modifier (+ / -)</label>
          <input type="number" name="successMod" value="0" />
        </div>

        <div class="form-group">
          <label>Enhancement</label>
          <input type="number" name="enhancement" value="0" />
        </div>
      </form>
    `;

    new Dialog({
      title: `${this.actor.name} — ${label}`,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async html => {
            const form = html[0].querySelector("form");
            const fd = new FormData(form);

            await this.actor.rollNpcStorypath({
              label,
              basePool,
              diceMod: Number(fd.get("diceMod") || 0),
              successMod: Number(fd.get("successMod") || 0),
              enhancement: Number(fd.get("enhancement") || 0)
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }
}
