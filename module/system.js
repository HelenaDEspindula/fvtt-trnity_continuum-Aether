import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";

Hooks.once("init", () => {
  console.log(`${AETHER.ID} | init`);

  CONFIG.AETHER = AETHER;

  CONFIG.Actor.documentClass = AetherActor;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(AETHER.ID, AetherActorSheet, { makeDefault: true });

  loadTemplates([
    `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
    `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
  ]);
});
