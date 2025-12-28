import { AETHER } from "../constants.js";

export class AetherActor extends Actor {
  /**
   * Storypath roll (Trinity Continuum):
   * - Roll pool d10
   * - Successes = die results >= 8
   * - Add Enhancement (auto successes)
   * - Subtract Difficulty
   * - Complication shown as informational only
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
    facetKey = "intuitive"
  } = {}) {
    pool = Number(pool) || 0;
    enhancement = Number(enhancement) || 0;
    difficulty = Number(difficulty) || 0;
    complication = Number(complication) || 0;

    // Spend 1 Inspiration to gain Enhancement equal to the chosen Facet
    if (spendInspiration) {
      const currentInsp = this.system?.pools?.inspiration?.value ?? 0;
      if (currentInsp <= 0) {
        ui.notifications?.warn("No Inspiration available to spend.");
      } else {
        const facetVal = this.system?.facets?.[facetKey]?.value ?? 0;
        if (facetVal > 0) enhancement += Number(facetVal) || 0;
        await this.update({ "system.pools.inspiration.value": currentInsp - 1 });
      }
    }

    if (pool <= 0) {
      ui.notifications?.warn("Pool must be at least 1.");
      return;
    }

    // Roll dice (Foundry v12+ compatible)
    const roll = new Roll(`${pool}d10`);
    await roll.evaluate({ async: true });
    
    const die = roll.dice?.[0];
    const results = (die?.results ?? []).map(r => r.result);
    
    // Count successes (>= 8)
    const successesFromDice = results.filter(v => v >= 8).length;
    const totalSuccesses = successesFromDice + enhancement;
    const netSuccesses = totalSuccesses - difficulty;
    
    // Mark dice (ExEss-style)
    for (const r of die.results) {
      if (r.result >= 8) {
        r.classes.push("success");
      } else {
        r.classes.push("failure");
      }
    }
    
    // Render dice natively
    const rollHTML = await roll.render();
    
    // Create chat message (IMPORTANT: await it)
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      roll
    });


    // Header (Attribute + Skill)
    const attrName = attrKey ? (AETHER.ATTRIBUTES[attrKey] ?? attrKey) : null;
    const skillName = skillKey ? (AETHER.SKILLS[skillKey] ?? skillKey) : null;

    const headerParts = [];
    if (attrName) headerParts.push(attrName);
    if (skillName) headerParts.push(skillName);
    const header = headerParts.length ? headerParts.join(" + ") : label;

    const outcome =
      netSuccesses >= 0
        ? `<span class="aether-ok">SUCCESS</span>`
        : `<span class="aether-bad">FAILURE</span>`;

    // Chat card content (ExEss-like)
    const content = `
      <div class="aether-chatcard">
        <div class="aether-title">${header}</div>

        <div class="aether-roll-header">
          ${totalSuccesses} Successes
        </div>

        <div class="aether-roll-summary">
          ${pool} Dice + ${enhancement} successes
        </div>

        ${rollHTML}

        <div class="aether-roll-footer">
          ${netSuccesses} Successes ${outcome}
        </div>

        ${complication
          ? `<div class="aether-roll-complication">Complication (info): +${complication}</div>`
          : ""}
      </div>
    `;

    // IMPORTANT: use ChatMessage.create with roll attached
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      roll
    });
  }

  /**
   * Standard roll prompt for Attribute + Skill.
   */
  async rollPrompt({ attrKey = "dexterity", skillKey = "aim", label = "Storypath Roll" } = {}) {
    const attrVal = Number(this.system?.attributes?.[attrKey]?.value ?? 0) || 0;
    const skillVal = Number(this.system?.skills?.[skillKey]?.value ?? 0) || 0;
    const basePool = attrVal + skillVal;

    const attrs = Object.entries(AETHER.ATTRIBUTES)
      .map(([k, v]) => `<option value="${k}" ${k === attrKey ? "selected" : ""}>${v}</option>`)
      .join("");

    const skills = Object.entries(AETHER.SKILLS)
      .map(([k, v]) => `<option value="${k}" ${k === skillKey ? "selected" : ""}>${v}</option>`)
      .join("");

    const facets = Object.entries(AETHER.FACETS)
      .map(([k, v]) => `<option value="${k}">${v}</option>`)
      .join("");

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Attribute</label>
          <select name="attrKey">${attrs}</select>
        </div>

        <div class="form-group">
          <label>Skill</label>
          <select name="skillKey">${skills}</select>
        </div>

        <div class="form-group">
          <label>Pool (default = Attribute + Skill)</label>
          <input type="number" name="pool" value="${basePool}" min="1" />
        </div>

        <hr>

        <div class="form-group">
          <label>Enhancement</label>
          <input type="number" name="enhancement" value="0" />
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <input type="number" name="difficulty" value="0" />
        </div>

        <div class="form-group">
          <label>Complication (informational)</label>
          <input type="number" name="complication" value="0" />
        </div>

        <hr>

        <div class="form-group">
          <label>Spend 1 Inspiration for +Enhancement equal to a Facet</label>
          <input type="checkbox" name="spendInspiration" />
        </div>

        <div class="form-group">
          <label>Facet</label>
          <select name="facetKey">${facets}</select>
        </div>
      </form>
    `;

    return new Dialog({
      title: label,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async (html) => {
            const form = html[0].querySelector("form");
            const fd = new FormData(form);

            const data = {
              label,
              attrKey: String(fd.get("attrKey") || ""),
              skillKey: String(fd.get("skillKey") || ""),
              pool: Number(fd.get("pool") || 0),
              enhancement: Number(fd.get("enhancement") || 0),
              difficulty: Number(fd.get("difficulty") || 0),
              complication: Number(fd.get("complication") || 0),
              spendInspiration: Boolean(fd.get("spendInspiration")),
              facetKey: String(fd.get("facetKey") || "intuitive")
            };

            await this.rollStorypath(data);
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }
}
