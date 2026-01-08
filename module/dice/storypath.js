/**
 * Storypath Dice Service (Trinity Continuum / Aether MVP)
 * ------------------------------------------------------
 * Centraliza regras de rolagem para PC e NPC.
 *
 * Regras (MVP):
 * - pool d10
 * - sucesso: resultado >= 8
 * - enhancement: auto-successes (pode ser negativo)
 * - difficulty: subtrai sucessos (>= 0)
 *
 * Nota: não importar sheets aqui (evita circular dependency).
 */

export function countSuccesses(results = []) {
  return results.filter(v => Number(v) >= 8).length;
}

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
  difficulty = Number(difficulty) || 0;

  if (!actor) throw new Error("rollStorypath requires an actor.");
  if (pool <= 0) {
    ui.notifications?.warn("Pool must be at least 1.");
    return null;
  }

  const roll = await new Roll(`${pool}d10`).evaluate();

  const die = roll.dice?.[0];
  const results = (die?.results ?? []).map(r => r.result);

  const successesFromDice = countSuccesses(results);
  const totalSuccesses = successesFromDice + enhancement;
  const netSuccesses = totalSuccesses - difficulty;

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

      <div class="aether-row"><b>Successes (before difficulty)</b>: ${totalSuccesses}</div>
      <div class="aether-row"><b>Net successes</b>: <span class="aether-big">${netSuccesses}</span> ${outcome}</div>

      ${metaLines.length ? `<hr>${metaLines.join("")}` : ""}
    </div>
  `;

  const gmIds = whisperGM
    ? (game.users?.filter(u => u.isGM)?.map(u => u.id) ?? [])
    : null;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: htmlCard,
    whisper: whisperGM ? gmIds : undefined
  });

  return roll;
}