import { AETHER } from "../constants.js";

export class AetherActor extends Actor {

  /* -------------------------------------------- */
  /*  DERIVED DATA                                */
  /* -------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();

    // === Automatic Inspiration Max (PCs only) ===
    if (this.type === "character") {
      const facets = this.system?.facets ?? {};
      const facetValues = Object.values(facets).map(f => Number(f?.value ?? 0) || 0);
      const maxInspiration = facetValues.length ? Math.max(...facetValues) : 0;

      this.system.pools = this.system.pools ?? {};
      this.system.pools.inspiration = this.system.pools.inspiration ?? { value: 0, max: 0 };
      this.system.pools.inspiration.max = maxInspiration;
    }
  }

  /* -------------------------------------------- */
  /*  HELPERS                                     */
  /* -------------------------------------------- */

  /**
   * Returns the facetKey with the highest value.
   * Used as default facet for rolls.
   */
  getHighestFacetKey() {
    const facets = this.system?.facets ?? {};
    const entries = Object.entries(facets)
      .map(([k, v]) => [k, Number(v?.value ?? 0) || 0]);

    if (!entries.length) return "intuitive";

    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0] || "intuitive";
  }

  /* -------------------------------------------- */
  /*  PC STORYPATH ROLL                           */
  /* -------------------------------------------- */

  /**
   * Storypath roll for PCs
   */
  async rollStorypath({
    label = "Roll",
    pool = 0,
    enhancement = 0,
    difficulty = 0,
    complication = 0,
    attrKey = null,
    skillKey = null,
    spendInspiration = false,
    facetKey = null
  } = {}) {

    pool = Number(pool) || 0;
    enhancement = Number(enhancement) || 0;
    difficulty = Number(difficulty) || 0;
    complication = Number(complication) || 0;

    // Default facet = highest facet
    facetKey = facetKey || this.getHighestFacetKey();

    // Spend Inspiration → Enhancement equal to facet
    if (spendInspiration) {
      const current = this.system?.pools?.inspiration?.value ?? 0;
      if (current <= 0) {
        ui.notifications.warn("No Inspiration available.");
      } else {
        const facetValue = Number(this.system?.facets?.[facetKey]?.value ?? 0) || 0;
        enhancement += facetValue;
        await this.update({ "system.pools.inspiration.value": current - 1 });
      }
    }

    if (pool <= 0) {
      ui.notifications.warn("Pool must be at least 1.");
      return;
    }

    const roll = new Roll(`${pool}d10`);
    await roll.evaluate({ async: true });

    const die = roll.dice[0];
    let successesFromDice = 0;

    for (const r of die.results) {
      r.classes ??= [];
      if (r.result >= 8) {
        successesFromDice++;
        r.classes.push("success");
      }
    }

    const totalSuccesses = successesFromDice + enhancement;
    const netSuccesses = totalSuccesses - difficulty;

    const attrName = attrKey ? (AETHER.ATTRIBUTES[attrKey] ?? attrKey) : null;
    const skillName = skillKey ? (AETHER.SKILLS[skillKey] ?? skillKey) : null;

    const header =
      attrName && skillName ? `${attrName} + ${skillName}` : label;

    const outcome =
      netSuccesses >= 0
        ? `<span class="aether-ok">SUCCESS</span>`
        : `<span class="aether-bad">FAILURE</span>`;

    const html = `
      <div class="aether-chatcard">
        <div class="aether-title">${header}</div>

        ${await roll.render()}

        <div class="aether-row"><b>Dice successes</b>: ${successesFromDice}</div>
        <div class="aether-row"><b>Enhancement</b>: +${enhancement}</div>
        <div class="aether-row"><b>Difficulty</b>: -${difficulty}</div>

        <hr>

        <div class="aether-row">
          <b>Net successes</b>:
          <span class="aether-big">${netSuccesses}</span> ${outcome}
        </div>

        ${complication
          ? `<hr><div class="aether-row"><b>Complication</b>: +${complication}</div>`
          : ""}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: html,
      roll
    });
  }

  /* -------------------------------------------- */
  /*  NPC STORYPATH ROLL                          */
  /* -------------------------------------------- */

  /**
   * NPC roll using a single pool
   * Result is whispered to GM
   */
  async rollNpcStorypath({
    label = "NPC Roll",
    basePool = 0,
    diceMod = 0,
    successMod = 0,
    enhancement = 0
  } = {}) {

    let pool = Math.max(0, Number(basePool) + Number(diceMod));
    successMod = Number(successMod) || 0;
    enhancement = Number(enhancement) || 0;

    if (pool <= 0) {
      ui.notifications.warn("NPC pool must be at least 1 die.");
      return;
    }

    const roll = new Roll(`${pool}d10`);
    await roll.evaluate({ async: true });

    const die = roll.dice[0];
    let successesFromDice = 0;

    for (const r of die.results) {
      r.classes ??= [];
      if (r.result >= 8) {
        successesFromDice++;
        r.classes.push("success");
      }
    }

    const totalSuccesses =
      successesFromDice +
      enhancement +
      successMod;

    const html = `
      <div class="aether-chatcard">
        <div class="aether-title">${this.name} — ${label}</div>

        ${await roll.render()}

        <div class="aether-row"><b>Dice successes</b>: ${successesFromDice}</div>
        <div class="aether-row"><b>Enhancement</b>: +${enhancement}</div>
        <div class="aether-row"><b>Success modifier</b>: ${successMod >= 0 ? "+" : ""}${successMod}</div>

        <hr>

        <div class="aether-row aether-big">
          Total Successes: ${totalSuccesses}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: html,
      roll,
      whisper: ChatMessage.getWhisperRecipients("GM")
    });
  }
}
