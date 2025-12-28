import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

/* -------------------------------------------- */
/*  SYSTEM INITIALIZATION                       */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log("Trinity Continuum: Aether | Initializing system");

  // Register custom Actor document
  CONFIG.Actor.documentClass = AetherActor;

  // Unregister core sheets
  Actors.unregisterSheet("core", ActorSheet);

  // Register PC sheet
  Actors.registerSheet("fvtt-trnity_continuum-Aether", AetherActorSheet, {
    types: ["character"],
    makeDefault: true
  });

  // Register NPC sheet
  Actors.registerSheet("fvtt-trnity_continuum-Aether", AetherNpcSheet, {
    types: ["npc"],
    makeDefault: true
  });
});
