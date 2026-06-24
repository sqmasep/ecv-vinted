import { describe, it, expect } from "vitest";

import { allowedActions } from "@/lib/transitions";

const kinds = (state: string) => allowedActions(state).map((a) => a.kind);

describe("allowedActions", () => {
  it("vendue → réception au hub", () => {
    expect(kinds("sold_awaiting_shipment")).toEqual(["reception"]);
  });
  it("reçue au hub → démarrer l'expertise", () => {
    expect(kinds("received_at_hub")).toEqual(["start"]);
  });
  it("expertise en cours → rapport, valider, refuser", () => {
    expect(kinds("authentication_in_progress")).toEqual([
      "rapport",
      "validate",
      "reject",
    ]);
  });
  it("analyse labo → valider, refuser (plus de rapport)", () => {
    expect(kinds("lab_analysis")).toEqual(["validate", "reject"]);
  });
  it.each(["authenticated", "rejected", "shipped", "delivered", "listed"])(
    "état terminal %s → aucune action",
    (state) => {
      expect(allowedActions(state)).toEqual([]);
    },
  );
});
