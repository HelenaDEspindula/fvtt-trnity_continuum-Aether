import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNPCSheet } from "./actor/npc-sheet.js";

Hooks.once("init", () => {
  console.log("Trinity Continuum: Aether | Initializing system");

  // Register Actor
  CONFIG.Actor.documentClass = AetherActor;

  // Unregister default sheets
  Actors.unregisterSheet("core", ActorSheet);

  // Register PC sheet
  Actors.registerSheet("fvtt-trnity_continuum-Aether", AetherActorSheet, {
    types: ["character"],
    makeDefault: true
  });

  // Register NPC sheet
  Actors.registerSheet("fvtt-trnity_continuum-Aether", AetherNPCSheet, {
    types: ["npc"],
    makeDefault: true
  });
});
