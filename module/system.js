import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";

Hooks.once("init", () => {
  console.log("Aether | init");

  CONFIG.Actor.documentClass = AetherActor;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fvtt-trnity_continuum-Aether", AetherActorSheet, {
    makeDefault: true
  });
});
