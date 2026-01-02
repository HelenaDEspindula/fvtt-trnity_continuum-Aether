import { AETHER } from "../constants.js";

export class AetherActor extends Actor {

 prepareDerivedData() {
  super.prepareDerivedData();

  if (this.type !== "character") return;

  /* -------------------------------------------- */
  /*  ENSURE STRUCTURE                             */
  /* -------------------------------------------- */

  this.system.pools ??= {};
  this.system.pools.inspiration ??= { value: 0, max: 0 };

  this.system.combat ??= {};
  this.system.combat.armor ??= { soft: 0, hard: 0 };
  this.system.combat.defenseMods ??= { stamina: 0, resolve: 0, composure: 0 };
  this.system.combat.defenses ??= { stamina: 0, resolve: 0, composure: 0 };

  this.system.health ??= {};
  this.system.health.levels ??= {};
  this.system.health.current ??= 0;

  /* -------------------------------------------- */
  /*  INSPIRATION MAX (from Facets)               */
  /* -------------------------------------------- */

  const facets = this.system?.facets ?? {};
  const facetValues = Object.values(facets).map(f => Number(f?.value ?? 0) || 0);
  this.system.pools.inspiration.max =
    facetValues.length ? Math.max(...facetValues) : 0;

  /* -------------------------------------------- */
  /*  DEFENSES (3 tracks)                          */
  /* -------------------------------------------- */

  const sta = Number(this.system?.attributes?.stamina?.value ?? 0) || 0;
  const res = Number(this.system?.attributes?.resolve?.value ?? 0) || 0;
  const com = Number(this.system?.attributes?.composure?.value ?? 0) || 0;

  const soft = Number(this.system?.combat?.armor?.soft ?? 0) || 0;

  const mSta = Number(this.system?.combat?.defenseMods?.stamina ?? 0) || 0;
  const mRes = Number(this.system?.combat?.defenseMods?.resolve ?? 0) || 0;
  const mCom = Number(this.system?.combat?.defenseMods?.composure ?? 0) || 0;

  this.system.combat.defenses.stamina = sta + soft + mSta;
  this.system.combat.defenses.resolve = res + soft + mRes;
  this.system.combat.defenses.composure = com + soft + mCom;

  /* -------------------------------------------- */
  /*  HEALTH BASE (from track)                    */
  /* -------------------------------------------- */

  // Health base = total boxes defined by the track
  let healthBase = 0;

  for (const level of Object.values(this.system.health.levels)) {
    const boxes = Number(level?.boxes ?? 0) || 0;
    healthBase += boxes;
  }

  this.system.health.base = healthBase;

  /* -------------------------------------------- */
  /*  HEALTH MAX (base + hard armor)              */
  /* -------------------------------------------- */

  const hard = Number(this.system?.combat?.armor?.hard ?? 0) || 0;
  this.system.health.max = healthBase + hard;

  /* -------------------------------------------- */
  /*  CLAMP CURRENT HEALTH                        */
  /* -------------------------------------------- */

  if (this.system.health.current > this.system.health.max) {
    this.system.health.current = this.system.health.max;
  }
}

  /* -------------------------------------------- */
  /*  HELPERS                                     */
  /* -------------------------------------------- */

  /**
   * Returns the facetKey with the highest value.
   * Back-compat: if old key "destruction" exists, treat it as "destructive".
   */
  getHighestFacetKey() {
    const facets = this.system?.facets ?? {};
    const entries = Object.entries(facets)
      .map(([k, v]) => [k, Number(v?.value ?? 0) || 0]);

    if (!entries.length) return "intuitive";

    entries.sort((a, b) => b[1] - a[1]);
    const key = entries[0][0] || "intuitive";

    // Back-compat alias
    if (key === "destruction") return "destructive";
    return key;
  }

  /**
   * Resolve a facet key safely (supports old "destruction").
   */
  _resolveFacetKey(facetKey) {
    if (!facetKey) return this.getHighestFacetKey();
    if (facetKey === "destruction") return "destructive";
    return facetKey;
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
    facetKey = this._resolveFacetKey(facetKey);

    // Spend Inspiration → Enhancement equal to facet
    if (spendInspiration) {
      const current = this.system?.pools?.inspiration?.value ?? 0;
      if (current <= 0) {
        ui.notifications.warn("No Inspiration available.");
      } else {
        // Try destructive first, then old destruction key if still present
        const facetValue =
          Number(this.system?.facets?.[facetKey]?.value ?? 0) ||
          Number(this.system?.facets?.destruction?.value ?? 0) ||
          0;

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