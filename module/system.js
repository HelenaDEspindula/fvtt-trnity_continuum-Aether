import { AETHER } from "./constants.js";
import { AetherActor } from "./actor/actor.js";
import { AetherActorSheet } from "./actor/actor-sheet.js";
import { AetherNpcSheet } from "./actor/npc-sheet.js";

/**
 * Preload and register Handlebars templates and partials.
 * Keeping this explicit avoids race conditions and silent render failures.
 */
async function preloadHandlebarsTemplates() {
  const basePath = `systems/${AETHER.ID}/templates`;

  const templatePaths = [
    // Main actor sheets
    `${basePath}/actor/character-sheet.hbs`,
    `${basePath}/actor/npc-sheet.hbs`,

    // Character sheet tabs
    `${basePath}/actor/tabs/description.hbs`,
    `${basePath}/actor/tabs/general.hbs`,
    `${basePath}/actor/tabs/stats.hbs`,
    `${basePath}/actor/tabs/gifts.hbs`,
    `${basePath}/actor/tabs/others.hbs`
  ];

  // Preload all templates
  await loadTemplates(templatePaths);

  /**
   * Register partials explicitly.
   * This mirrors the ExEss pattern and keeps the main sheet clean.
   */
  Handlebars.registerPartial(
    "aether.character.tabs.description",
    await getTemplate(`${basePath}/actor/tabs/description.hbs`)
  );

  Handlebars.registerPartial(
    "aether.character.tabs.general",
    await getTemplate(`${basePath}/actor/tabs/general.hbs`)
  );

  Handlebars.registerPartial(
    "aether.character.tabs.stats",
    await getTemplate(`${basePath}/actor/tabs/stats.hbs`)
  );

  Handlebars.registerPartial(
    "aether.character.tabs.gifts",
    await getTemplate(`${basePath}/actor/tabs/gifts.hbs`)
  );

  Handlebars.registerPartial(
    "aether.character.tabs.others",
    await getTemplate(`${basePath}/actor/tabs/others.hbs`)
  );
}

Hooks.once("init", async () => {
  console.log(`${AETHER.ID} | Initializing system`);

  /**
   * Expose system constants
   * Useful for sheets, helpers and macros.
   */
  CONFIG.AETHER = AETHER;

  /**
   * Register Actor document class
   */
  CONFIG.Actor.documentClass = AetherActor;

  /**
   * IMPORTANT ENGINEERING NOTE:
   * Do NOT unregister core sheets while iterating.
   * Keeping core sheets ensures actors still open if a custom sheet crashes.
   */

  // Player Character sheet
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

  /**
   * Preload and register all templates and partials
   * Awaiting here avoids broken tabs on first open.
   */
  await preloadHandlebarsTemplates();

  console.log(`${AETHER.ID} | Templates preloaded`);
});