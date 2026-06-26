// Integration tests — run under `bun test` (bun:sqlite in-memory). See test/db.ts
// for why these are not Vitest tests in this environment.

import { describe, it, expect, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "@repo/db/schema";
import { makeTestDb, seedFixtures } from "../../test/db.js";
import { ExpertiseService, ExpertiseError, type AppDb } from "./expertise-service.js";
import { RecordingNotifier } from "./notifier.js";

let db: AppDb;
let notifier: RecordingNotifier;
let service: ExpertiseService;
let fx: ReturnType<typeof seedFixtures>;

function inspectionId() {
  const insp = db
    .select({ id: schema.inspection.id })
    .from(schema.inspection)
    .where(eq(schema.inspection.articleId, fx.articleId))
    .get();
  if (!insp) throw new Error("no inspection");
  return insp.id;
}

function articleState() {
  return db
    .select({ s: schema.article.currentState })
    .from(schema.article)
    .where(eq(schema.article.id, fx.articleId))
    .get()!.s;
}

function events() {
  return db
    .select()
    .from(schema.statusEvent)
    .where(eq(schema.statusEvent.articleId, fx.articleId))
    .all();
}

beforeEach(() => {
  db = makeTestDb();
  notifier = new RecordingNotifier();
  service = new ExpertiseService(db, notifier);
  fx = seedFixtures(db);
});

describe("nominal flow reception -> start -> rapport -> decision(authenticated)", () => {
  it("walks every state and journals each transition", () => {
    const r1 = service.reception(fx.articleId, { hubId: "hub-1" }, { actorId: fx.expertId });
    expect(r1.etatNouveau).toBe("received_at_hub");
    expect(articleState()).toBe("received_at_hub");

    const id = inspectionId();
    const r2 = service.start(id, { expertId: fx.expertId }, { actorId: fx.expertId });
    expect(r2.etatNouveau).toBe("authentication_in_progress");

    const r3 = service.rapport(
      id,
      { laboratoire: "Lab Paris", resultat: "conforme", urlDocument: "https://x.test/r.pdf" },
      { actorId: fx.expertId },
    );
    expect(r3.etatNouveau).toBe("lab_analysis");

    const r4 = service.decision(id, { decision: "authenticated" }, { actorId: fx.expertId });
    expect(r4.etatNouveau).toBe("authenticated");

    const evs = events().sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    expect(evs.map((e) => e.newState)).toEqual([
      "received_at_hub",
      "authentication_in_progress",
      "lab_analysis",
      "authenticated",
    ]);

    const insp = db.select().from(schema.inspection).where(eq(schema.inspection.id, id)).get()!;
    expect(insp.status).toBe("completed");
    expect(insp.decision).toBe("authenticated");
    expect(insp.inspectorId).toBe(fx.expertId);

    const reports = db.select().from(schema.labReport).all();
    expect(reports).toHaveLength(1);
    expect(reports[0]!.result).toBe("conforme");

    expect(notifier.sent.filter((n) => n.audience === "buyer")).toHaveLength(2);
  });
});

describe("refusal flow", () => {
  it("decision(rejected) sets refuse, refunds the order and notifies buyer + seller", () => {
    service.reception(fx.articleId, { hubId: "hub-1" }, { actorId: fx.expertId });
    const id = inspectionId();
    service.start(id, { expertId: fx.expertId }, { actorId: fx.expertId });

    const r = service.decision(
      id,
      { decision: "rejected", motif: "Coutures non conformes" },
      { actorId: fx.expertId },
    );
    expect(r.etatNouveau).toBe("rejected");
    expect(articleState()).toBe("rejected");

    const ord = db.select().from(schema.order).where(eq(schema.order.id, fx.orderId)).get()!;
    expect(ord.status).toBe("refunded");

    const insp = db.select().from(schema.inspection).where(eq(schema.inspection.id, id)).get()!;
    expect(insp.decision).toBe("rejected");
    expect(insp.rejectionReason).toBe("Coutures non conformes");

    const audiences = r.notifications.map((n) => n.audience).sort();
    expect(audiences).toEqual(["buyer", "seller"]);
  });
});

describe("illegal transition => full rollback (no write)", () => {
  it("decision before reception throws TRANSITION_INTERDITE and writes nothing", () => {
    const id = crypto.randomUUID();
    db.insert(schema.inspection)
      .values({ id, articleId: fx.articleId, status: "pending" })
      .run();

    expect(() => service.decision(id, { decision: "authenticated" })).toThrow(ExpertiseError);

    expect(articleState()).toBe("sold_awaiting_shipment");
    expect(events()).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });

  it("rejection without motif fails the guard and rolls back", () => {
    service.reception(fx.articleId, { hubId: "hub-1" }, { actorId: fx.expertId });
    const id = inspectionId();
    service.start(id, { expertId: fx.expertId }, { actorId: fx.expertId });
    const before = articleState();

    let err: unknown;
    try {
      service.decision(id, { decision: "rejected" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ExpertiseError);
    expect((err as ExpertiseError).code).toBe("GARDE_NON_SATISFAITE");
    expect(articleState()).toBe(before);
  });
});

describe("idempotency (replayed external event)", () => {
  it("the same eventKey applies the transition once", () => {
    const key = "evt-key-123";
    const r1 = service.reception(
      fx.articleId,
      { hubId: "hub-1" },
      { actorId: null, source: "webhook", eventKey: key },
    );
    expect(r1.idempotentReplay).toBe(false);
    expect(articleState()).toBe("received_at_hub");

    const r2 = service.reception(
      fx.articleId,
      { hubId: "hub-1" },
      { actorId: null, source: "webhook", eventKey: key },
    );
    expect(r2.idempotentReplay).toBe(true);
    expect(events()).toHaveLength(1);
    expect(notifier.sent).toHaveLength(1);
  });
});
