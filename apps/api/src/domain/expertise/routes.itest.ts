// Route tests (HTTP layer) — run under `bun test` (bun:sqlite in-memory).
//
// The routes are built via the factory with an in-memory ExpertiseService and a
// fake `getUser`, so we exercise the real Elysia stack (validation, status
// mapping, role guards) without better-auth or the production db.

import { describe, it, expect, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "@repo/db/schema";
import { makeTestDb, seedFixtures } from "../../test/db.js";
import { ExpertiseService } from "./expertise-service.js";
import { RecordingNotifier } from "./notifier.js";
import { createExpertiseRoutes, type AuthUser } from "./routes.js";

let db: ReturnType<typeof makeTestDb>;
let fx: ReturnType<typeof seedFixtures>;
let app: ReturnType<typeof createExpertiseRoutes>;
let currentUser: AuthUser | null;

// Stand-in roles for the guard tests.
const EXPERT: AuthUser = { id: "u_expert", role: "expert" };
const ADMIN: AuthUser = { id: "u_admin", role: "admin" };
const BUYER: AuthUser = { id: "u_buyer", role: "buyer" };

beforeEach(() => {
  db = makeTestDb();
  fx = seedFixtures(db);
  const service = new ExpertiseService(db, new RecordingNotifier());
  currentUser = EXPERT;
  app = createExpertiseRoutes({
    service,
    db,
    getUser: async () => currentUser,
  });
});

// --- helpers ---------------------------------------------------------------

function post(path: string, body: unknown) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function get(path: string) {
  return app.handle(new Request(`http://localhost${path}`));
}

function inspectionId() {
  const insp = db
    .select({ id: schema.inspection.id })
    .from(schema.inspection)
    .where(eq(schema.inspection.articleId, fx.articleId))
    .get();
  if (!insp) throw new Error("no inspection");
  return insp.id;
}

// --- nominal flow ----------------------------------------------------------

describe("nominal flow reception -> start -> rapport -> decision(authenticated)", () => {
  it("walks the whole expertise and returns each new state", async () => {
    const r1 = await post(`/expertise/${fx.articleId}/reception`, {
      hubId: "hub-1",
    });
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.newState).toBe("received_at_hub");
    expect(b1.expertise.status).toBe("pending");

    const id = inspectionId();

    const r2 = await post(`/expertise/${id}/start`, { expertId: fx.expertId });
    expect(r2.status).toBe(200);
    expect((await r2.json()).newState).toBe("authentication_in_progress");

    const r3 = await post(`/expertise/${id}/rapport`, {
      laboratoire: "Lab Paris",
      resultat: "conforme",
      urlDocument: "https://x.test/r.pdf",
    });
    expect(r3.status).toBe(200);
    expect((await r3.json()).newState).toBe("lab_analysis");

    const r4 = await post(`/expertise/${id}/decision`, {
      decision: "authenticated",
    });
    expect(r4.status).toBe(200);
    const b4 = await r4.json();
    expect(b4.newState).toBe("authenticated");
    expect(b4.expertise.decision).toBe("authenticated");
  });
});

describe("refusal flow", () => {
  it("decision(rejected) with motif moves to rejected", async () => {
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    await post(`/expertise/${id}/start`, { expertId: fx.expertId });

    const r = await post(`/expertise/${id}/decision`, {
      decision: "rejected",
      motif: "Coutures non conformes",
    });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.newState).toBe("rejected");
    expect(b.expertise.rejectionReason).toBe("Coutures non conformes");
  });
});

// --- error mapping ---------------------------------------------------------

describe("error mapping", () => {
  it("401 when no session", async () => {
    currentUser = null;
    const r = await post(`/expertise/${fx.articleId}/reception`, {
      hubId: "hub-1",
    });
    expect(r.status).toBe(401);
  });

  it("403 when role is not expert/admin", async () => {
    currentUser = BUYER;
    const r = await post(`/expertise/${fx.articleId}/reception`, {
      hubId: "hub-1",
    });
    expect(r.status).toBe(403);
  });

  it("422 when body is invalid (missing hubId)", async () => {
    const r = await post(`/expertise/${fx.articleId}/reception`, {});
    expect(r.status).toBe(422);
  });

  it("422 when refusing without a motif (superRefine guard)", async () => {
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    await post(`/expertise/${id}/start`, { expertId: fx.expertId });

    const r = await post(`/expertise/${id}/decision`, { decision: "rejected" });
    expect(r.status).toBe(422);
  });

  it("409 on an illegal transition (decision before start)", async () => {
    // reception only -> still received_at_hub; a decision is not allowed yet.
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    const r = await post(`/expertise/${id}/decision`, {
      decision: "authenticated",
    });
    expect(r.status).toBe(409);
  });

  it("404 when the inspection does not exist", async () => {
    const r = await post(`/expertise/does-not-exist/start`, {
      expertId: fx.expertId,
    });
    expect(r.status).toBe(404);
  });
});

// --- history (admin only) --------------------------------------------------

describe("GET /articles/:id/historique", () => {
  it("returns the journal in chronological order for an admin", async () => {
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    await post(`/expertise/${id}/start`, { expertId: fx.expertId });

    currentUser = ADMIN;
    const r = await get(`/articles/${fx.articleId}/historique`);
    expect(r.status).toBe(200);
    const rows = await r.json();
    expect(rows.map((e: { newState: string }) => e.newState)).toEqual([
      "received_at_hub",
      "authentication_in_progress",
    ]);
  });

  it("403 for an expert (history is admin only)", async () => {
    currentUser = EXPERT;
    const r = await get(`/articles/${fx.articleId}/historique`);
    expect(r.status).toBe(403);
  });

  it("404 for an unknown article", async () => {
    currentUser = ADMIN;
    const r = await get(`/articles/nope/historique`);
    expect(r.status).toBe(404);
  });
});
