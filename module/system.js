// module/system.js
import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

/* -------------------------------------------- */
/*  System Init                                  */
/* -------------------------------------------- */

Hooks.once("init", async () => {
  console.log(`${AETHER.NAME} | Initializing`);

  // 1) Register custom Actor document class
  CONFIG.Actor.documentClass = AetherActor;

  // 2) Register Actor Sheets
  // IMPORTANT (V13): Do NOT unregister core sheets while developing.
  // If your custom sheet crashes, removing the core sheet can make actors impossible to open.
  Actors.registerSheet(AETHER.ID, AetherActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Aether Character Sheet"
  });

  Actors.registerSheet(AETHER.ID, AetherNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "Aether NPC Sheet"
  });

  // 3) Preload templates (optional but recommended)
  // If you use partials/includes, preloading prevents “not found” issues on first open.
  try {
    await loadTemplates([
      `systems/${AETHER.ID}/templates/actor/actor-sheet.hbs`,
      `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
    ]);
  } catch (err) {
    console.warn(`${AETHER.NAME} | Template preload warning`, err);
  }

  // 4) Expose a tiny API for debugging/macros
  game[AETHER.NAMESPACE] = game[AETHER.NAMESPACE] || {};
  game[AETHER.NAMESPACE].system = {
    id: AETHER.ID,
    version: game.system.version
  };

  console.log(`${AETHER.NAME} | Init complete`);
});

/* -------------------------------------------- */
/*  Ready                                        */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  console.log(`${AETHER.NAME} | Ready (Foundry v${game.version}, build ${game.build})`);
});
