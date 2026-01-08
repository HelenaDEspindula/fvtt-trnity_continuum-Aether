

# Trinity Continuum: Aether – Foundry VTT System

A custom Foundry VTT system for Trinity Continuum: Aether, focused on robustness,
extensibility, and long-term maintainability.

This project is developed incrementally, with small and well-isolated changes per
version. The primary goal is to maintain a clean architecture that supports future
expansion, automation, and collaboration without accumulating technical debt.

---

## Current Features (v0.5.0)

### Player Character Sheets (PC)

- Character sheet organized into tabs:
  - Description
  - General
  - Stats
  - Gifts and Deviations
  - Others
- Attributes and Skills (editable)
- Description and alternate identities fields
- Basic "General" fields (Type, Aspirations)
- Inspiration pool tracking
- GM-only button to reset Inspiration to the character maximum
- Skill roll buttons on the Stats tab
- PC rolls always open a roll dialog (no quick roll)

### Non-Player Character Sheets (NPC)

- Dedicated NPC sheet
- Persistent NPC Pools:
  - Primary Pool
  - Secondary Pool
  - Desperation Pool
- Base Enhancement value
- GM-only pool rolls
- Rolls are always whispered to the GM (never blind)
- NPC data persists correctly between sheet openings

### Dice System

- Centralized Storypath dice engine (single source of truth)
- d10 dice pool
- Successes counted on results greater than or equal to 8
- Enhancement adds automatic successes
- Difficulty subtracts successes
- Consistent chat card output for PCs and NPCs

---

## Dice Rolling Design

### PC Rolls

- No quick roll: always opens a dialog/prompt before rolling
- Standard chat visibility
- Uses the same Storypath dice engine as NPCs
- Designed for future expansion (spending Inspiration, additional modifiers)

### NPC Rolls

- Always whispered to the GM
- Never blind rolls
- Preserves chat history
- Improves auditability and debugging
- Suitable for investigative and narrative gameplay

---

## Engineering Principles

This system intentionally follows a robust engineering approach from early
development stages.

### Centralized Rules

All dice mechanics are implemented in a single module:

`module/dice/storypath.js`

Sheets do not duplicate dice logic.

---

### DOM-First Input Reading

Foundry VTT does not always immediately commit form input values to actor.system.

Rule:

Whenever a button depends on values typed in a sheet, values must be read from the
DOM first and only fall back to actor.system if necessary.

This prevents issues where the UI displays a value but the underlying data still
reads as zero.

Helper methods implemented in the base actor sheet:

`readFormNumber(name, fallback) readFormString(name, fallback)`

All future interactive buttons and roll logic should follow this pattern.

---

### Tabs: Foundry-Native Initialization

PC tabs are implemented using the Foundry-native tabs mechanism:

- Navigation element: `.sheet-tabs` with `data-group="primary"`
- Content container: `.sheet-body` containing `.tab` panels with matching
  `data-group` and `data-tab`

Tabs are initialized via `defaultOptions.tabs` in the ActorSheet class, avoiding
manual tab wiring and reducing the risk of UI regressions across Foundry versions.

---

### Safe Initialization

- Core Foundry sheets are never unregistered
- Optional features must never block system initialization
- Errors in one module must not prevent sheet rendering

This avoids common failure modes such as sheets opening with only the actor name
visible.

---

### Incremental Versioning

Development follows a one-change-per-version philosophy.

Examples:
- v0.4.4 – Restore stable PC and NPC sheets
- v0.4.5 – Introduce centralized dice engine
- v0.4.6 – Connect NPC pool rolls
- v0.4.7 – Add robust form input helpers
- v0.4.10 – Fix NPC data persistence
- v0.5.0 – PC sheet tabs and Foundry-native tab initialization

---

## Project Structure

```
css/
 ├─ aether.css
lang/
 ├─ en.json
module/
 ├─ actor/
 │  ├─ actor.js
 │  ├─ actor-sheet.js
 │  ├─ npc-sheet.js
 │ ├─ dice/
 │  └─ storypath.js
 │ ├─ constants.js
 ├─ system.js
templates/
 ├─ actor/
 │  ├─ tabs/
 │     ├─ description.hbs
 │     ├─ general.hbs
 │     ├─ gifts.hbs
 │     ├─ others.hbs
 │     └─ stats.hbs
 │  ├─ character-sheet.hbs
 │  └─ npc-sheet.hbs
README.md
system.json
templete.json
```


---

## Compatibility

- Designed for Foundry VTT version 12 and later
- Uses foundry.utils.mergeObject
- Avoids deprecated APIs whenever possible

---

## Roadmap

### Short Term (0.5.x)

- Automatic calculation of maximum Inspiration
- Checkbox to spend Inspiration during rolls
- PC roll flow fully unified with the centralized dice engine (prompt-driven)
- Structured lists for Paths (Origin/Society/Role)
- Expand "General", "Gifts and Deviations", and "Others" from placeholders to
  editable structured content

### Medium Term (0.6.x)

- Structured library of Gifts, Edges, and Deviations
- Declarative modifier system
- Context-aware roll modifiers
- Gradual automation of derived values (defenses, initiative, etc.)

### Long Term

- Deeper combat automation
- Health and damage tracks
- Optional advanced secrecy tools
- Compendium-driven rules integration

---

## Disclaimer

This is a fan-made system and is not affiliated with Onyx Path Publishing.

All trademarks, rules, and setting material belong to their respective owners.

---

## Development Philosophy

Correctness, clarity, and extensibility are prioritized over shortcuts.

The system is designed to grow in a controlled manner, minimizing technical debt and preserving maintainability over time.

---

## Contributors

This system is primarily developed and by Helena R S DEspindula.

ChatGPT is used as a collaborative assistance tool for design discussion, code review, debugging, and iterative development support.

