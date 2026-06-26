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

// --- read endpoints (liste / détail / experts) -----------------------------

describe("GET /expertise (dossier list)", () => {
  it("lists expertise dossiers for an expert (oldest in state first)", async () => {
    const r = await get(`/expertise`);
    expect(r.status).toBe(200);
    const rows = await r.json();
    const row = rows.find(
      (x: { articleId: string }) => x.articleId === fx.articleId,
    );
    expect(row).toBeDefined();
    expect(row.brand).toBe("Hermès");
    // No expert assigned until /start.
    expect(row.inspectorId).toBeNull();
    expect(row.inspectorName).toBeNull();
  });

  it("exposes the assigned expert name once the expertise started", async () => {
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    await post(`/expertise/${id}/start`, { expertId: fx.expertId });

    const r = await get(`/expertise`);
    const row = (await r.json()).find(
      (x: { articleId: string }) => x.articleId === fx.articleId,
    );
    expect(row.inspectorId).toBe(fx.expertId);
    expect(row.inspectorName).toBe("Expert");
    expect(row.currentState).toBe("authentication_in_progress");
  });

  it("hides dossiers assigned to another expert (only mine + free pool)", async () => {
    // Un second expert récupère le dossier Hermès.
    db.insert(schema.user)
      .values({
        id: "u_expert_2",
        name: "Autre Expert",
        email: "expert2@test",
        role: "expert",
      })
      .run();
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    await post(`/expertise/${inspectionId()}/start`, {
      expertId: "u_expert_2",
    });

    // currentUser = EXPERT (u_expert) : le dossier d'un autre expert disparaît.
    const mine = await (await get(`/expertise`)).json();
    expect(
      mine.find((x: { articleId: string }) => x.articleId === fx.articleId),
    ).toBeUndefined();

    // L'admin, lui, voit tout.
    currentUser = ADMIN;
    const all = await (await get(`/expertise`)).json();
    expect(
      all.find((x: { articleId: string }) => x.articleId === fx.articleId),
    ).toBeDefined();
  });

  it("filters by statut", async () => {
    const empty = await get(`/expertise?statut=authenticated`);
    expect((await empty.json()).length).toBe(0);
    const sold = await get(`/expertise?statut=sold_awaiting_shipment`);
    expect((await sold.json()).length).toBe(1);
  });

  it("filters by free-text q on brand/title", async () => {
    expect((await (await get(`/expertise?q=Hermès`)).json()).length).toBe(1);
    expect((await (await get(`/expertise?q=Chanel`)).json()).length).toBe(0);
  });

  it("403 for a buyer, 401 without session", async () => {
    currentUser = BUYER;
    expect((await get(`/expertise`)).status).toBe(403);
    currentUser = null;
    expect((await get(`/expertise`)).status).toBe(401);
  });
});

describe("GET /expertise/:id (dossier detail)", () => {
  it("404 for an unknown article", async () => {
    expect((await get(`/expertise/nope`)).status).toBe(404);
  });

  it("returns the article with a null expertise before reception", async () => {
    const r = await get(`/expertise/${fx.articleId}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.article.id).toBe(fx.articleId);
    expect(b.expertise).toBeNull();
    expect(b.rapports).toEqual([]);
  });

  it("aggregates inspection, expert name and lab reports", async () => {
    await post(`/expertise/${fx.articleId}/reception`, { hubId: "hub-1" });
    const id = inspectionId();
    await post(`/expertise/${id}/start`, { expertId: fx.expertId });
    await post(`/expertise/${id}/rapport`, {
      laboratoire: "Lab Paris",
      resultat: "conforme",
      urlDocument: "https://x.test/r.pdf",
    });

    const r = await get(`/expertise/${fx.articleId}`);
    const b = await r.json();
    expect(b.expertise.status).toBe("in_progress");
    expect(b.inspectorName).toBe("Expert");
    expect(b.rapports.length).toBe(1);
    expect(b.rapports[0].laboratoire).toBe("Lab Paris");
    expect(b.rapports[0].resultat).toBe("conforme");
  });

  it("403 for a buyer", async () => {
    currentUser = BUYER;
    expect((await get(`/expertise/${fx.articleId}`)).status).toBe(403);
  });
});

describe("GET /experts", () => {
  it("returns the expert identities for the selector", async () => {
    const r = await get(`/experts`);
    expect(r.status).toBe(200);
    const experts = await r.json();
    expect(experts).toEqual([{ id: fx.expertId, name: "Expert" }]);
  });

  it("403 for a buyer", async () => {
    currentUser = BUYER;
    expect((await get(`/experts`)).status).toBe(403);
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
