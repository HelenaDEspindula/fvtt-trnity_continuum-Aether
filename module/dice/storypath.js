/**
 * Storypath Dice Service (Trinity Continuum / Aether MVP)
 * ------------------------------------------------------
 * Centralizes dice rolling rules so both PC and NPC sheets can reuse it.
 *
 * Rules (MVP):
 * - Roll pool d10
 * - Successes = results >= 8
 * - Enhancement adds automatic successes (can be negative if desired)
 * - Difficulty subtracts successes
 *
 * Notes:
 * - This file must NOT import sheets to avoid circular dependencies.
 * - Errors here should be caught by callers; do not break system init.
 */

/**
 * Count successes from a list of d10 results.
 * @param {number[]} results
 * @returns {number}
 */
export function countSuccesses(results = []) {
  return results.filter((v) => Number(v) >= 8).length;
}

/**
 * Perform a Storypath roll.
 *
 * @param {object} params
 * @param {Actor}  params.actor                Foundry Actor (speaker)
 * @param {string} params.label                Display label (e.g., "Primary Pool", "Dexterity + Aim")
 * @param {number} params.pool                 Dice pool (>= 1)
 * @param {number} params.enhancement          Auto-successes (can be negative)
 * @param {number} params.difficulty           Difficulty (>= 0)
 * @param {boolean} params.whisperGM           If true, whisper to all GMs
 * @param {object} params.meta                 Optional extra meta info for display
 * @returns {Promise<Roll>}
 */
export async function rollStorypath({
  actor,
  label = "Roll",
  pool = 0,
  enhancement = 0,
  difficulty = 0,
  whisperGM = false,
  meta = {}
} = {}) {
  pool = Number(pool) || 0;
  enhancement = Number(enhancement) || 0;

  // Difficulty should be a non-negative number (Storypath convention).
  // If callers accidentally pass negative values, normalize it for display and math safety.
  difficulty = Math.max(0, Number(difficulty) || 0);

  if (!actor) throw new Error("rollStorypath requires an actor.");
  if (pool <= 0) {
    ui.notifications?.warn("Pool must be at least 1.");
    return null;
  }

  const roll = await new Roll(`${pool}d10`).evaluate();

  const die = roll.dice?.[0];
  const results = (die?.results ?? []).map((r) => r.result);

  const successesFromDice = countSuccesses(results);
  const successesBeforeDifficulty = successesFromDice + enhancement;
  const netSuccesses = successesBeforeDifficulty - difficulty;

  const outcome =
    netSuccesses >= 0
      ? `<span class="aether-ok">SUCCESS</span>`
      : `<span class="aether-bad">FAILURE</span>`;

  const metaLines = [];
  for (const [k, v] of Object.entries(meta || {})) {
    if (v === null || v === undefined || v === "") continue;
    metaLines.push(`<div class="aether-row"><b>${k}</b>: ${v}</div>`);
  }

  const htmlCard = `
    <div class="aether-chatcard">
      <div class="aether-title">${actor.name} — ${label}</div>

      <div class="aether-row"><b>Pool</b>: ${pool}d10</div>
      <div class="aether-row"><b>Dice</b>: ${results.join(", ")}</div>

      <hr>

      <div class="aether-row"><b>Dice successes</b>: ${successesFromDice}</div>
      <div class="aether-row"><b>Enhancement</b>: ${enhancement >= 0 ? "+" : ""}${enhancement}</div>
      <div class="aether-row"><b>Difficulty</b>: ${difficulty} <span class="aether-muted">(subtracted)</span></div>

      <hr>

      <div class="aether-row"><b>Successes (before difficulty)</b>: ${successesBeforeDifficulty}</div>
      <div class="aether-row"><b>Net successes</b>: <span class="aether-big">${netSuccesses}</span> ${outcome}</div>

      ${metaLines.length ? `<hr>${metaLines.join("")}` : ""}
    </div>
  `;

  const gmIds = whisperGM
    ? (game.users?.filter((u) => u.isGM)?.map((u) => u.id) ?? [])
    : null;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: htmlCard,
    whisper: whisperGM ? gmIds : undefined
  });

  return roll;
}