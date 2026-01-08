import { AETHER } from "../constants.js";
import { rollStorypath as rollStorypathService } from "../dice/storypath.js";

/**
 * AetherActor (Trinity Continuum: Aether - MVP)
 * --------------------------------------------
 * Objetivo:
 * - SEM quick roll: sempre abrir dialog
 * - Reutilizar o Dice Service (module/dice/storypath.js)
 * - Evitar circular deps (Actor não importa sheets)
 */
export class AetherActor extends Actor {
  /**
   * Retorna a facet de maior valor. Empate: primeira na ordem de AETHER.FACETS.
   * Usada como default quando "spend inspiration" estiver marcado.
   */
  getHighestFacetKey() {
    const facets = this.system?.facets ?? {};
    const facetOrder = Object.keys(AETHER.FACETS ?? facets);

    let bestKey = facetOrder.includes("intuitive") ? "intuitive" : (facetOrder[0] ?? "intuitive");
    let bestVal = -Infinity;

    for (const key of facetOrder) {
      const v = Number(facets?.[key]?.value ?? 0) || 0;
      if (v > bestVal) {
        bestVal = v;
        bestKey = key;
      }
    }
    return bestKey;
  }

  /* -------------------------------------------- */
  /*  PC: SEMPRE via dialog                       */
  /* -------------------------------------------- */

  /**
   * Abre o dialog de rolagem (PC).
   * - attrKey/skillKey: pré-seleciona
   * - pool: pré-preenche (ideal quando vem do DOM, sem depender de salvar)
   */
  async rollPrompt({
    label = "Skill Roll",
    attrKey = "dexterity",
    skillKey = "aim",
    pool = null
  } = {}) {
    const attrs = Object.entries(AETHER.ATTRIBUTES ?? {})
      .map(([k, v]) => `<option value="${k}" ${k === attrKey ? "selected" : ""}>${v}</option>`)
      .join("");

    const skills = Object.entries(AETHER.SKILLS ?? {})
      .map(([k, v]) => `<option value="${k}" ${k === skillKey ? "selected" : ""}>${v}</option>`)
      .join("");

    const attrVal = Number(this.system?.attributes?.[attrKey]?.value ?? 0) || 0;
    const skillVal = Number(this.system?.skills?.[skillKey]?.value ?? 0) || 0;

    // Se sheet passou pool (DOM-first), usa. Se não, calcula do Actor.
    const basePool = Number.isFinite(Number(pool)) ? Number(pool) : (attrVal + skillVal);

    const defaultFacetKey = this.getHighestFacetKey();

    const facetOptions = Object.entries(AETHER.FACETS ?? {})
      .map(([k, v]) => `<option value="${k}" ${k === defaultFacetKey ? "selected" : ""}>${v}</option>`)
      .join("");

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Attribute</label>
          <select name="attrKey">${attrs}</select>
        </div>

        <div class="form-group">
          <label>Skill</label>
          <select name="skillKey">${skills}</select>
        </div>

        <div class="form-group">
          <label>Pool (default = Attribute + Skill)</label>
          <input type="number" name="pool" value="${basePool}" min="1" />
        </div>

        <hr>

        <div class="form-group">
          <label>Enhancement (auto-successes)</label>
          <input type="number" name="enhancement" value="0" />
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <input type="number" name="difficulty" value="0" min="0" />
        </div>

        <div class="form-group">
          <label>Complication (informational)</label>
          <input type="number" name="complication" value="0" />
        </div>

        <hr>

        <div class="form-group">
          <label>Spend 1 Inspiration for +Enhancement equal to a Facet</label>
          <input type="checkbox" name="spendInspiration" />
        </div>

        <div class="form-group">
          <label>Facet</label>
          <select name="facetKey">${facetOptions}</select>
        </div>
      </form>
    `;

    return new Dialog({
      title: label,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: async (html) => {
            const form = html[0].querySelector("form");
            const fd = new FormData(form);

            const chosenAttrKey = String(fd.get("attrKey") || "");
            const chosenSkillKey = String(fd.get("skillKey") || "");

            let poolN = Number(fd.get("pool") || 0);
            let enhancementN = Number(fd.get("enhancement") || 0);
            const difficultyN = Number(fd.get("difficulty") || 0);
            const complicationN = Number(fd.get("complication") || 0);

            const spendInspiration = fd.get("spendInspiration") ? true : false;
            const facetKey = String(fd.get("facetKey") || defaultFacetKey);

            // Se pool inválido, recalcula do Actor (previsível e robusto)
            if (!Number.isFinite(poolN) || poolN <= 0) {
              const a = Number(this.system?.attributes?.[chosenAttrKey]?.value ?? 0) || 0;
              const s = Number(this.system?.skills?.[chosenSkillKey]?.value ?? 0) || 0;
              poolN = a + s;
            }

            // Spend Inspiration: +Enh = valor da Facet escolhida, e decrementa 1 Inspiration
            if (spendInspiration) {
              const current = Number(this.system?.pools?.inspiration?.value ?? 0) || 0;
              if (current <= 0) {
                ui.notifications?.warn("No Inspiration available to spend.");
              } else {
                const facetVal = Number(this.system?.facets?.[facetKey]?.value ?? 0) || 0;
                enhancementN += facetVal;
                await this.update({ "system.pools.inspiration.value": Math.max(0, current - 1) });
              }
            }

            const attrName = AETHER.ATTRIBUTES?.[chosenAttrKey] ?? chosenAttrKey;
            const skillName = AETHER.SKILLS?.[chosenSkillKey] ?? chosenSkillKey;

            await rollStorypathService({
              actor: this,
              label: `${attrName} + ${skillName}`,
              pool: poolN,
              enhancement: enhancementN,
              difficulty: difficultyN,
              whisperGM: false,
              meta: complicationN ? { "Complication (info)": complicationN } : {}
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll",
      render: (html) => {
        // UX: ao trocar Attribute/Skill, recalcula pool automaticamente (com dados do Actor).
        const form = html[0].querySelector("form");
        if (!form) return;

        const attrSel = form.querySelector('select[name="attrKey"]');
        const skillSel = form.querySelector('select[name="skillKey"]');
        const poolInput = form.querySelector('input[name="pool"]');

        const recompute = () => {
          const ak = String(attrSel?.value || "");
          const sk = String(skillSel?.value || "");
          const a = Number(this.system?.attributes?.[ak]?.value ?? 0) || 0;
          const s = Number(this.system?.skills?.[sk]?.value ?? 0) || 0;
          if (poolInput) poolInput.value = String(a + s);
        };

        attrSel?.addEventListener("change", recompute);
        skillSel?.addEventListener("change", recompute);
      }
    }).render(true);
  }

  /* -------------------------------------------- */
  /*  NPC: SEMPRE via dialog (GM-only)            */
  /* -------------------------------------------- */

  /**
   * Abre dialog de rolagem para NPC pools.
   * poolKey: "primary" | "secondary" | "desperation"
   */
  async rollNpcPrompt({ poolKey = "primary" } = {}) {
    if (!game.user?.isGM) {
      ui.notifications?.warn("Only the GM can roll NPC pools.");
      return;
    }

    const labelMap = {
      primary: "Primary Pool",
      secondary: "Secondary Pool",
      desperation: "Desperation Pool"
    };

    const basePool = Number(this.system?.npcPools?.[poolKey]?.value ?? 0) || 0;
    const baseEnhancement = Number(this.system?.npcPools?.enhancement?.value ?? 0) || 0;

    const content = `
      <form class="aether-rollform">
        <div class="form-group">
          <label>Base Pool</label>
          <input type="number" name="basePool" value="${basePool}" min="0" />
        </div>

        <div class="form-group">
          <label>Dice Mod (can be negative)</label>
          <input type="number" name="diceMod" value="0" />
        </div>

        <div class="form-group">
          <label>Base Enhancement</label>
          <input type="number" name="baseEnhancement" value="${baseEnhancement}" />
        </div>

        <div class="form-group">
          <label>Success Mod (auto-successes, can be negative)</label>
          <input type="number" name="successMod" value="0" />
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <input type="number" name="difficulty" value="0" min="0" />
        </div>
      </form>
    `;

    return new Dialog({
      title: `${this.name} — ${labelMap[poolKey] ?? "NPC Pool"}`,
      content,
      buttons: {
        roll: {
          label: "Roll (GM whisper)",
          callback: async (html) => {
            const form = html[0].querySelector("form");
            const fd = new FormData(form);

            const basePoolN = Number(fd.get("basePool") || 0);
            const diceModN = Number(fd.get("diceMod") || 0);
            const baseEnhN = Number(fd.get("baseEnhancement") || 0);
            const successModN = Number(fd.get("successMod") || 0);
            const difficultyN = Number(fd.get("difficulty") || 0);

            const finalPool = Math.max(0, basePoolN + diceModN);
            const enhancement = baseEnhN + successModN;

            if (finalPool <= 0) {
              ui.notifications?.warn("Pool must be at least 1 d10.");
              return;
            }

            await rollStorypathService({
              actor: this,
              label: labelMap[poolKey] ?? "NPC Pool",
              pool: finalPool,
              enhancement,
              difficulty: difficultyN,
              whisperGM: true,
              meta: {
                "Base Pool": basePoolN,
                "Dice Mod": diceModN,
                "Base Enhancement": baseEnhN,
                "Success Mod": successModN
              }
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }
}