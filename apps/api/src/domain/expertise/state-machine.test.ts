import { describe, it, expect } from "vitest";
import type { State } from "@repo/schemas";
import {
  transition,
  EXPERTISE_EVENTS,
  type ExpertiseEvent,
  type Effect,
} from "./state-machine.js";

// Helper: assert a successful transition and return its payload.
function ok(
  from: State,
  event: ExpertiseEvent,
  payload?: Parameters<typeof transition>[2],
) {
  const res = transition(from, event, payload);
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error("expected ok");
  return res;
}

function hasNotify(effects: Effect[], audience: "buyer" | "seller") {
  return effects.some((e) => e.type === "NOTIFY" && e.audience === audience);
}

describe("legal transitions (happy path)", () => {
  it("RECEPTION_HUB: sold_awaiting_shipment -> received_at_hub + buyer notif", () => {
    const r = ok("sold_awaiting_shipment", "RECEPTION_HUB", { hubId: "hub-1" });
    expect(r.etatCible).toBe("received_at_hub");
    expect(hasNotify(r.effets, "buyer")).toBe(true);
  });

  it("START_EXPERTISE: received_at_hub -> authentication_in_progress, tracking only", () => {
    const r = ok("received_at_hub", "START_EXPERTISE", { expertId: "u_1" });
    expect(r.etatCible).toBe("authentication_in_progress");
    expect(r.effets).toEqual([{ type: "TRACKING_ONLY" }]);
  });

  it("DEMANDE_LABO: authentication_in_progress -> lab_analysis, no notif", () => {
    const r = ok("authentication_in_progress", "DEMANDE_LABO");
    expect(r.etatCible).toBe("lab_analysis");
    expect(hasNotify(r.effets, "buyer")).toBe(false);
  });

  it("VALIDER from authentication_in_progress -> authenticated + unlock shipment", () => {
    const r = ok("authentication_in_progress", "VALIDER");
    expect(r.etatCible).toBe("authenticated");
    expect(hasNotify(r.effets, "buyer")).toBe(true);
    expect(r.effets.some((e) => e.type === "UNLOCK_SHIPMENT")).toBe(true);
  });

  it("VALIDER from lab_analysis -> authenticated", () => {
    expect(ok("lab_analysis", "VALIDER").etatCible).toBe("authenticated");
  });

  it("REFUSER from authentication_in_progress (with motif) -> rejected + refund + 2 notifs", () => {
    const r = ok("authentication_in_progress", "REFUSER", { motif: "Cuir non conforme" });
    expect(r.etatCible).toBe("rejected");
    expect(r.effets.some((e) => e.type === "REFUND")).toBe(true);
    expect(hasNotify(r.effets, "buyer")).toBe(true);
    expect(hasNotify(r.effets, "seller")).toBe(true);
  });

  it("REFUSER from lab_analysis (with motif) -> rejected", () => {
    expect(ok("lab_analysis", "REFUSER", { motif: "Série non référencée" }).etatCible).toBe(
      "rejected",
    );
  });

  it("EXPEDIER: authenticated -> shipped (tunnel aval)", () => {
    expect(ok("authenticated", "EXPEDIER").etatCible).toBe("shipped");
  });

  it("LIVRER: shipped -> delivered + release escrow", () => {
    const r = ok("shipped", "LIVRER");
    expect(r.etatCible).toBe("delivered");
    expect(r.effets.some((e) => e.type === "RELEASE_ESCROW")).toBe(true);
  });
});

describe("guards", () => {
  it("RECEPTION_HUB without hubId is refused", () => {
    const r = transition("sold_awaiting_shipment", "RECEPTION_HUB", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("GARDE_NON_SATISFAITE");
  });

  it("START_EXPERTISE without expertId is refused", () => {
    const r = transition("received_at_hub", "START_EXPERTISE", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("GARDE_NON_SATISFAITE");
  });

  it("REFUSER WITHOUT motif is refused (guard)", () => {
    const r = transition("lab_analysis", "REFUSER", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("GARDE_NON_SATISFAITE");
  });

  it("REFUSER with a blank motif is refused", () => {
    const r = transition("lab_analysis", "REFUSER", { motif: "   " });
    expect(r.ok).toBe(false);
  });
});

describe("illegal transitions are TRANSITION_INTERDITE", () => {
  const illegal: [State, ExpertiseEvent][] = [
    ["sold_awaiting_shipment", "VALIDER"], // skip the whole flow
    ["sold_awaiting_shipment", "START_EXPERTISE"], // not received yet
    ["received_at_hub", "VALIDER"], // decide before expertise
    ["received_at_hub", "REFUSER"], // refuse not allowed from received_at_hub
    ["received_at_hub", "DEMANDE_LABO"], // lab before expertise started
    ["authenticated", "VALIDER"], // already terminal +
    ["authenticated", "REFUSER"], // cannot refuse an authenticated piece
    ["rejected", "VALIDER"], // terminal -
    ["rejected", "EXPEDIER"], // terminal -
    ["delivered", "LIVRER"], // already delivered
    ["lab_analysis", "RECEPTION_HUB"], // backwards
    ["authentication_in_progress", "START_EXPERTISE"], // re-start
  ];

  it.each(illegal)("%s + %s -> refused", (from, event) => {
    const r = transition(from, event);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("TRANSITION_INTERDITE");
  });
});

describe("coverage sanity", () => {
  it("every event appears in the table (no dead event)", () => {
    for (const event of EXPERTISE_EVENTS) {
      // At least one from-state yields a legal transition for each event.
      const anyLegal = (
        [
          "sold_awaiting_shipment",
          "received_at_hub",
          "authentication_in_progress",
          "lab_analysis",
          "authenticated",
          "shipped",
        ] as State[]
      ).some(
        (s) =>
          transition(s, event, { hubId: "h", expertId: "e", motif: "m" }).ok === true,
      );
      expect(anyLegal).toBe(true);
    }
  });
});
