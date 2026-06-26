import { describe, it, expect } from "vitest";
import { EXPERTISE_STATES } from "@repo/schemas";

import { STATE_META, stateMeta } from "@/lib/states";

const VARIANTS = new Set([
  "default",
  "secondary",
  "outline",
  "gold",
  "success",
  "vinted",
  "destructive",
]);

describe("stateMeta", () => {
  it("chaque état d'expertise a un libellé FR, une icône et une variante connue", () => {
    for (const state of EXPERTISE_STATES) {
      const meta = stateMeta(state);
      expect(meta.label, `libellé pour ${state}`).toBeTruthy();
      expect(meta.icon, `icône pour ${state}`).toBeTruthy();
      expect(VARIANTS.has(meta.variant), `variante valide pour ${state}`).toBe(
        true,
      );
    }
  });

  it("« Authentifiée » porte le teal Vinted (signal de confiance partagé avec le shop)", () => {
    expect(stateMeta("authenticated").variant).toBe("vinted");
    expect(stateMeta("authenticated").label).toBe("Authentifiée");
  });

  it("« Refusée » reste en destructive", () => {
    expect(stateMeta("rejected").variant).toBe("destructive");
  });

  it("état inconnu → repli neutre (variante outline) avec le code brut en libellé", () => {
    const meta = stateMeta("etat_inexistant");
    expect(meta.variant).toBe("outline");
    expect(meta.label).toBe("etat_inexistant");
    expect(meta.icon).toBeTruthy();
  });

  it("ne couvre pas d'état orphelin : toute clé de STATE_META a un libellé non vide", () => {
    for (const [state, meta] of Object.entries(STATE_META)) {
      expect(meta.label, `libellé manquant pour ${state}`).toBeTruthy();
    }
  });
});
