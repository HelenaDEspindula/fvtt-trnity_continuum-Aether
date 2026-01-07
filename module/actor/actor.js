import { AETHER } from "../constants.js";

export class AetherActor extends Actor {
  /**
   * Storypath roll (Trinity Continuum):
   * - Roll pool d10
   * - Successes = die results >= 8
   * - Add Enhancement (auto successes)
   * - Subtract Difficulty
   * - Show Complication as informational only (MVP)
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

    // Spend 1 Inspiration to gain Enhancement equal to a chosen Facet
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

    const roll = await new Roll(`${pool}d10`).evaluate();

    const die = roll.dice?.[0];
    const results = (die?.results ?? []).map(r => r.result);
    const successesFromDice = results.filter(v => v >= 8).length;

    const totalSuccesses = successesFromDice + enhancement;
    const netSuccesses = totalSuccesses - difficulty;

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

    const html = `
      <div class="aether-chatcard">
        <div class="aether-title">${header}</div>

        <div class="aether-row"><b>Pool</b>: ${pool}d10</div>
        <div class="aether-row"><b>Dice</b>: ${results.join(", ")}</div>
        <div class="aether-row"><b>Successes (dice)</b>: ${successesFromDice}</div>
        <div class="aether-row"><b>Enhancement</b>: +${enhancement}</div>
        <div class="aether-row"><b>Difficulty</b>: -${difficulty}</div>

        <hr>

        <div class="aether-row"><b>Total successes</b>: ${totalSuccesses}</div>
        <div class="aether-row"><b>Net successes</b>: <span class="aether-big">${netSuccesses}</span> ${outcome}</div>

        ${complication ? `<hr><div class="aether-row"><b>Complication (info)</b>: +${complication}</div>` : ""}
      </div>
    `;

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: html
    });
  }

  /**
   * Standard roll prompt for Attribute + Skill.
   * Defaults to Dexterity + Aim as a common Aether starting point.
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
