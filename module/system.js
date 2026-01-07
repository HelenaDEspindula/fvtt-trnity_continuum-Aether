import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

Hooks.once("init", () => {
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

  // PC sheet
  Actors.registerSheet(AETHER.ID, AetherActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Aether Character Sheet"
  });

  // NPC sheet
  Actors.registerSheet(AETHER.ID, AetherNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "Aether NPC Sheet"
  });

  // Preload templates (optional but helpful)
  loadTemplates([
    `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
    `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
  ]);
});