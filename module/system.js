import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { registerDiceRoller } from "./dice/actor-template.js"; // ← NOVO

Hooks.once("init", () => {
  console.log(`${AETHER.ID} | init`);

  CONFIG.AETHER = AETHER;
  CONFIG.Actor.documentClass = AetherActor;

  Actors.registerSheet(AETHER.ID, AetherActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "Aether Sheet"
  });

  loadTemplates([
    `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
    `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
  ]);

  registerDiceRoller(); // ← NOVO
});