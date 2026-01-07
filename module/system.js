// module/system.js
import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";

Hooks.once("init", () => {
  console.log(`${AETHER.ID} | init`);

  // Expose constants (optional)
  CONFIG.AETHER = AETHER;

  // Register Actor document class
  CONFIG.Actor.documentClass = AetherActor;

  /**
   * IMPORTANT:
   * Do NOT unregister core sheets while iterating.
   * If the custom sheet crashes, keeping core sheets prevents "sheet won't open" situations.
   */

  // Register the same sheet class for both PC and NPC types.
  // (Your AetherActorSheet already switches template based on actor.type.)
  Actors.registerSheet(AETHER.ID, AetherActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "Aether Sheet"
  });

  // Preload templates (optional but helpful)
  loadTemplates([
    `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
    `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
  ]);
});