import { describe, it, expect } from "vitest";
import {
  receptionInputSchema,
  startInputSchema,
  rapportInputSchema,
  decisionInputSchema,
  resultatLaboSchema,
  decisionSchema,
  statutExpertiseSchema,
  expertiseDTO,
  evenementStatutDTO,
} from "./index.js";

describe("enum schemas", () => {
  it("accepts canonical expertise states", () => {
    expect(statutExpertiseSchema.parse("received_at_hub")).toBe("received_at_hub");
    expect(statutExpertiseSchema.parse("authenticated")).toBe("authenticated");
  });

  it("rejects tunnel-only states outside the brick", () => {
    expect(statutExpertiseSchema.safeParse("listed").success).toBe(false);
    expect(statutExpertiseSchema.safeParse("delivered").success).toBe(false);
  });

  it("decision is authenticated | rejected", () => {
    expect(decisionSchema.safeParse("authenticated").success).toBe(true);
    expect(decisionSchema.safeParse("rejected").success).toBe(true);
    expect(decisionSchema.safeParse("authentifie").success).toBe(false);
  });

  it("lab result is conforme | non_conforme | non_concluant", () => {
    expect(resultatLaboSchema.safeParse("conforme").success).toBe(true);
    expect(resultatLaboSchema.safeParse("non_conforme").success).toBe(true);
    expect(resultatLaboSchema.safeParse("non_concluant").success).toBe(true);
    expect(resultatLaboSchema.safeParse("ok").success).toBe(false);
  });
});

describe("receptionInputSchema / startInputSchema", () => {
  it("accepts valid ids", () => {
    expect(receptionInputSchema.safeParse({ hubId: "hub-1" }).success).toBe(true);
    expect(startInputSchema.safeParse({ expertId: "u_1" }).success).toBe(true);
  });

  it("rejects empty ids", () => {
    expect(receptionInputSchema.safeParse({ hubId: "" }).success).toBe(false);
    expect(startInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("rapportInputSchema", () => {
  it("accepts a valid report", () => {
    const res = rapportInputSchema.safeParse({
      laboratoire: "LabExpert Paris",
      resultat: "conforme",
      urlDocument: "https://docs.ecrin.test/report-1.pdf",
    });
    expect(res.success).toBe(true);
  });

  it("rejects an invalid result enum", () => {
    const res = rapportInputSchema.safeParse({
      laboratoire: "LabExpert Paris",
      resultat: "great",
      urlDocument: "https://docs.ecrin.test/report-1.pdf",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a non-url document", () => {
    const res = rapportInputSchema.safeParse({
      laboratoire: "LabExpert Paris",
      resultat: "conforme",
      urlDocument: "not-a-url",
    });
    expect(res.success).toBe(false);
  });
});

describe("decisionInputSchema (superRefine)", () => {
  it("accepts an authentication without motif", () => {
    expect(decisionInputSchema.safeParse({ decision: "authenticated" }).success).toBe(true);
  });

  it("accepts a rejection with a motif", () => {
    const res = decisionInputSchema.safeParse({
      decision: "rejected",
      motif: "Couture non conforme à la maison",
    });
    expect(res.success).toBe(true);
  });

  it("REJECTS a rejection without motif", () => {
    const res = decisionInputSchema.safeParse({ decision: "rejected" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("motif"))).toBe(true);
    }
  });

  it("rejects a rejection with an empty motif", () => {
    const res = decisionInputSchema.safeParse({ decision: "rejected", motif: "" });
    expect(res.success).toBe(false);
  });
});

describe("output DTOs", () => {
  it("validates an expertiseDTO with null expert/decision", () => {
    const res = expertiseDTO.safeParse({
      id: "insp_1",
      articleId: "art_1",
      inspectorId: null,
      status: "pending",
      decision: null,
      rejectionReason: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
    expect(res.success).toBe(true);
  });

  it("validates an evenementStatutDTO audit row", () => {
    const res = evenementStatutDTO.safeParse({
      id: "evt_1",
      articleId: "art_1",
      orderId: "ord_1",
      previousState: "received_at_hub",
      newState: "authentication_in_progress",
      occurredAt: 1_700_000_000_000,
      notificationSent: false,
      actorId: "u_1",
      source: "operateur",
      notificationMessage: null,
      eventKey: null,
    });
    expect(res.success).toBe(true);
  });

  it("rejects an evenementStatutDTO with an unknown source", () => {
    const res = evenementStatutDTO.safeParse({
      id: "evt_1",
      articleId: "art_1",
      orderId: null,
      previousState: null,
      newState: "received_at_hub",
      occurredAt: 1_700_000_000_000,
      notificationSent: false,
      actorId: null,
      source: "robot",
      notificationMessage: null,
      eventKey: null,
    });
    expect(res.success).toBe(false);
  });
});
