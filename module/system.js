import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

Hooks.once("init", async () => {
  console.log(`${AETHER.ID} | init`);

  CONFIG.AETHER = AETHER;
  CONFIG.Actor.documentClass = AetherActor;

  // Register sheets
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

  // Preload templates
  try {
    await loadTemplates([
      `systems/${AETHER.ID}/templates/actor/character-sheet.hbs`,
      `systems/${AETHER.ID}/templates/actor/npc-sheet.hbs`
    ]);
  } catch (e) {
    console.warn(`${AETHER.ID} | template preload warning`, e);
  }

  // OPTIONAL: Dice roller (do not break the system if missing)
  try {
    const mod = await import("./dice/actor-template.js"); // <-- adjust path if needed
    if (typeof mod.registerDiceRoller === "function") {
      mod.registerDiceRoller();
      console.log(`${AETHER.ID} | Dice roller registered`);
    } else {
      console.warn(`${AETHER.ID} | Dice roller module loaded but registerDiceRoller() not found`);
    }
  } catch (e) {
    console.warn(`${AETHER.ID} | Dice roller not loaded (safe to ignore for now)`, e);
  }
});