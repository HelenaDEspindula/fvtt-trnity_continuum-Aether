import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

/**
 * System bootstrap (Foundry VTT v12.343 target)
 * --------------------------------------------
 * Engineering goals:
 * - Keep core sheets registered (do not unregister) while iterating to avoid "sheet won't open" failure modes.
 * - Register separate sheets for PC (character) and NPC (npc).
 * - Preload templates for faster / safer sheet rendering.
 * - Provide a robust "chat corner die" handler that ALWAYS opens the roll dialog (no quick roll),
 *   using the currently controlled token's actor as the roll context.
 */

Hooks.once("init", async () => {
  console.log(`${AETHER.ID} | init`);

  // Expose constants (optional)
  CONFIG.AETHER = AETHER;

  // Register Actor document class
  CONFIG.Actor.documentClass = AetherActor;

  /**
   * IMPORTANT:
   * Do NOT unregister core sheets while iterating.
   * Keeping core sheets prevents "sheet won't open" if your custom sheet crashes.
   */

  // PC sheet (character)
  Actors.registerSheet(AETHER.ID, AetherActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Aether Character Sheet"
  });

  // NPC sheet (npc)
  Actors.registerSheet(AETHER.ID, AetherNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "Aether NPC Sheet"
  });

  // Preload templates (recommended)
  await loadTemplates([
    `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
    `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`,

    // Character tabs (ExEss-style: each tab is a file)
    `systems/${AETHER.ID}/templates/actor/tabs/description.hbs`,
    `systems/${AETHER.ID}/templates/actor/tabs/general.hbs`,
    `systems/${AETHER.ID}/templates/actor/tabs/stats.hbs`,
    `systems/${AETHER.ID}/templates/actor/tabs/gifts.hbs`,
    `systems/${AETHER.ID}/templates/actor/tabs/others.hbs`
  ]);
});

/* -------------------------------------------- */
/*  READY: robust "corner die" roll dialog      */
/* -------------------------------------------- */

/**
 * Get the best roll context:
 * - Prefer the first controlled token's actor.
 * - Fallback to the speaker's actor (if any).
 */
function getActiveRollActor() {
  try {
    const controlled = canvas?.tokens?.controlled ?? [];
    const tokenActor = controlled.length ? controlled[0].actor : null;
    if (tokenActor) return tokenActor;

    const speaker = ChatMessage.getSpeaker();
    if (speaker?.actor) return game.actors?.get(speaker.actor) ?? null;

    return null;
  } catch (e) {
    console.error(`${AETHER.ID} | getActiveRollActor failed`, e);
    return null;
  }
}

/**
 * Attach a click handler to the chat "corner die" icon.
 *
 * Why:
 * - In some setups, the core click handler can be missing or intercepted.
 * - We want consistent UX: ALWAYS open our roll dialog (never quick roll).
 *
 * Notes:
 * - We keep this defensive and no-op if the element isn't found in a given FVTT version/theme.
 * - We mark the element with a dataset flag to avoid binding multiple times.
 */
Hooks.on("renderChatInput", (_app, html) => {
  try {
    // html may be a jQuery object or an HTMLElement depending on Foundry version/plugins
    const root = html instanceof jQuery ? html[0] : html;
    if (!root) return;

    // This is the dice icon next to the roll mode selector in FVTT v12.
    // Selector set is intentionally broad for robustness across themes.
    const dieButton =
      root.querySelector("#chat-controls a.roll-type-select") ||
      root.querySelector("#chat-controls .roll-type-select") ||
      root.querySelector("#chat-controls [data-action='roll']") ||
      root.querySelector("#chat-controls .chat-control-icon");

    if (!dieButton) return;

    // Avoid double-binding (renderChatInput can fire multiple times)
    if (dieButton.dataset?.aetherBound === "1") return;
    dieButton.dataset.aetherBound = "1";

    dieButton.addEventListener(
      "click",
      async (ev) => {
        try {
          ev.preventDefault();
          ev.stopPropagation();

          const actor = getActiveRollActor();
          if (!actor) {
            ui.notifications?.warn("Select a token (or open a character sheet) to roll.");
            return;
          }

          // ALWAYS dialog (no quick roll)
          if (typeof actor.rollPrompt === "function") {
            await actor.rollPrompt({ label: "Storypath Roll" });
            return;
          }

          ui.notifications?.warn("This actor does not support rollPrompt.");
        } catch (err) {
          console.error(`${AETHER.ID} | chat die roll handler failed`, err);
          ui.notifications?.error("Could not open roll dialog. See console for details.");
        }
      },
      true // capture, so we still get the click even if something else stops bubbling
    );
  } catch (e) {
    console.error(`${AETHER.ID} | renderChatInput hook failed`, e);
  }
});
