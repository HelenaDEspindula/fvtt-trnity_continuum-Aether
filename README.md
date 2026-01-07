# Trinity Continuum: Aether – Foundry VTT System

A custom Foundry VTT system for Trinity Continuum: Aether, focused on robustness, extensibility, and long-term maintainability.

This system is being developed incrementally, with small, well-isolated changes per version, prioritizing software engineering best practices to support future expansion and collaboration.


## Features (current)

### Character Sheets (PC)

Attributes, Skills, Facets

Inspiration and Momentum pools

Combat values (initiative enhancement, armor, defenses)

Storypath dice rolling infrastructure (success-based)


### NPC Sheets

Dedicated NPC sheet

Primary / Secondary / Desperation Pools

Base Enhancement

GM-only pool rolls

Rolls are always whispered to the GM (never blind)


### Dice System

Centralized Storypath dice engine

Successes counted on d10 results ≥ 8

Enhancement and Difficulty handled consistently

Shared by PCs and NPCs (single source of truth)


### Dice Rolling Design

#### NPC Rolls

Always whispered to GM

Never blind rolls

Reasoning:

Preserves chat history

Improves debugging and auditability

Matches investigative and narrative playstyle

#### PC Rolls

Standard chat visibility

Uses the same dice engine for consistency

## Engineering Principles

This system intentionally follows a robust engineering approach, even at early stages:


### 1. Centralized Rules

All dice mechanics live in:

```{js}
module/dice/storypath.js
```
Sheets never duplicate dice logic.

### 2. DOM-first Input Reading (Important)

Foundry does not always commit input values to actor.system immediately.

Rule:

Whenever a button depends on values typed in the sheet, read from the DOM first, and only fallback to actor.system.

This avoids bugs where the UI shows a value (e.g. “5”) but the system still reads “0”.

Implemented helpers (base sheet):

```
readFormNumber(name, fallback)
readFormString(name, fallback)
```

All future roll buttons should use these helpers.

### 3. Safe Initialization

Core sheets are never unregistered

Optional features never block system loading

Errors in one module must not break sheet rendering

This avoids “sheet opens with only name” or hard crashes.

### 4. Incremental Versioning

Development follows a one-change-per-version philosophy:

Easier debugging

Clear rollback points

Safer collaboration

Example:
- v0.4.4 – restore stable PC/NPC sheets
- v0.4.5 – add dice engine (no UI changes)
- v0.4.6 – connect NPC pool rolls
- v0.4.7 – add robust form input helpers

## Project Structure (relevant)

```
module/
├─ actor/
│  ├─ actor.js
│  ├─ actor-sheet.js        # Base sheet + form helpers
│  ├─ npc-sheet.js          # NPC-specific logic
│
├─ dice/
│  └─ storypath.js          # Centralized dice engine
│
├─ constants.js
├─ system.js
templates/
├─ actor/
│  ├─ character-sheet.hbs
│  └─ npc-sheet.hbs
```

## Compatibility

Designed for Foundry VTT v12+

Uses `foundry.utils.mergeObject`

Avoids deprecated APIs when possible


## Roadmap (short-term)

- NPC pool roll refinements

- PC roll unification using the same dice service

- Combat calculations (defenses, health levels)

- Library-driven Gifts, Edges, and Deviations

- Automatic modifier aggregation

- Optional Blind Rolls (future, not default)


## Disclaimer

This system is a fan-made implementation and is not affiliated with Onyx Path Publishing.

All trademarks and game mechanics belong to their respective owners.


## Development Philosophy

Prefer correctness, clarity, and extensibility over shortcuts.

This project is intended to grow without technical debt.
