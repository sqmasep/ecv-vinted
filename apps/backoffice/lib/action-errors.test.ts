import { describe, it, expect } from "vitest";

import { actionErrorMessage } from "@/lib/action-errors";

describe("actionErrorMessage", () => {
  it("409 → conflit d'état (déclenche un refresh côté client)", () => {
    expect(actionErrorMessage(409, "fallback")).toMatch(/changé entre-temps/);
  });

  it("403 → rôle non autorisé", () => {
    expect(actionErrorMessage(403, "fallback")).toMatch(/non autorisée/);
  });

  it("422 → données invalides", () => {
    expect(actionErrorMessage(422, "fallback")).toMatch(/invalides/);
  });

  it("404 → dossier introuvable", () => {
    expect(actionErrorMessage(404, "fallback")).toMatch(/introuvable/);
  });

  it("statut inconnu (500, 0…) → message de repli fourni par l'appelant", () => {
    expect(actionErrorMessage(500, "Échec de la réception.")).toBe(
      "Échec de la réception.",
    );
    expect(actionErrorMessage(0, "Échec du démarrage.")).toBe(
      "Échec du démarrage.",
    );
  });
});
