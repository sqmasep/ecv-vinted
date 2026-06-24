// ===========================================================================
// Expertise routes (back brick) — ElysiaJS module plugged into the main app.
//
// Built as a FACTORY so the HTTP layer is testable in isolation: production
// injects the real ExpertiseService + better-auth session reader + the real db,
// while tests inject an in-memory service and a fake `getUser`. No purchase
// route is touched; this only ADDS routes.
//
// Role policy (default, see étape 5 notes): the four action routes accept
// `expert` OR `admin` (admin is a superuser); the read-only history is `admin`
// only. Error mapping: NOT_FOUND -> 404, TRANSITION_INTERDITE -> 409,
// GARDE_NON_SATISFAITE -> 422, Zod validation -> 422 (Elysia default),
// missing session -> 401, wrong role -> 403.
// ===========================================================================

import { Elysia } from "elysia";
import { and, asc, eq, inArray, like, or } from "@repo/db";
import {
  article,
  inspection,
  statusEvent,
  labReport,
  user as userTable,
} from "@repo/db/schema";
import {
  receptionInputSchema,
  startInputSchema,
  rapportInputSchema,
  decisionInputSchema,
  expertiseListFiltersSchema,
  EXPERTISE_STATES,
  type Role,
  type ExpertiseDTO,
  type EvenementStatutDTO,
  type LabReportDTO,
  type ExpertiseListItem,
  type ExpertiseDetail,
  type ExpertSummary,
} from "@repo/schemas";
import {
  ExpertiseService,
  ExpertiseError,
  type AppDb,
  type TransitionOutcome,
} from "./expertise-service.js";

// Minimal shape the routes need from the authenticated session.
export type AuthUser = { id: string; role: string };

export type ExpertiseRouteDeps = {
  service: ExpertiseService;
  getUser: (request: Request) => Promise<AuthUser | null>;
  db: AppDb;
};

const ACTION_ROLES: readonly Role[] = ["expert", "admin"];
const HISTORY_ROLES: readonly Role[] = ["admin"];

function hasRole(user: AuthUser, roles: readonly Role[]): boolean {
  return (roles as readonly string[]).includes(user.role);
}

// --- Row -> DTO mappers (epoch ms, mirrors the purchase-tunnel contract) ----

type InspectionRow = typeof inspection.$inferSelect;
type StatusEventRow = typeof statusEvent.$inferSelect;
type ArticleRow = typeof article.$inferSelect;
type LabReportRow = typeof labReport.$inferSelect;

const toArticleDTO = (r: ArticleRow) => ({
  id: r.id,
  sellerId: r.sellerId,
  title: r.title,
  brand: r.brand,
  price: r.price,
  authenticationFee: r.authenticationFee,
  currentState: r.currentState,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

// `result`/`document_url` are plain text/nullable columns; the input route
// validates `resultat` against LAB_RESULTS so stored values stay in the enum.
const toLabReportDTO = (r: LabReportRow): LabReportDTO => ({
  id: r.id,
  inspectionId: r.inspectionId,
  laboratoire: r.laboratory,
  resultat: r.result as LabReportDTO["resultat"],
  urlDocument: r.documentUrl,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

const toExpertiseDTO = (r: InspectionRow): ExpertiseDTO => ({
  id: r.id,
  articleId: r.articleId,
  inspectorId: r.inspectorId,
  status: r.status,
  decision: r.decision,
  rejectionReason: r.rejectionReason,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
});

const toEvenementDTO = (r: StatusEventRow): EvenementStatutDTO => ({
  id: r.id,
  articleId: r.articleId,
  orderId: r.orderId,
  previousState: r.previousState,
  newState: r.newState,
  occurredAt: r.occurredAt.getTime(),
  notificationSent: r.notificationSent,
  actorId: r.actorId,
  source: r.source,
  notificationMessage: r.notificationMessage,
  eventKey: r.eventKey,
});

// Response envelope for the four action routes: the transition summary + the
// resulting expertise (inspection) projection.
export type TransitionResponse = {
  articleId: string;
  previousState: TransitionOutcome["etatPrecedent"];
  newState: TransitionOutcome["etatNouveau"];
  idempotentReplay: boolean;
  expertise: ExpertiseDTO | null;
};

export function createExpertiseRoutes(deps: ExpertiseRouteDeps) {
  const { service, getUser, db } = deps;

  // Map a typed domain error to the right HTTP status. Unknown errors bubble up
  // (Elysia answers 500) so they are never silently swallowed.
  const fail = (
    e: unknown,
    status: (code: number, body: unknown) => unknown,
  ) => {
    if (e instanceof ExpertiseError) {
      switch (e.code) {
        case "NOT_FOUND":
          return status(404, { error: "not_found", message: e.message });
        case "TRANSITION_INTERDITE":
          return status(409, {
            error: "transition_forbidden",
            message: e.message,
          });
        case "GARDE_NON_SATISFAITE":
          return status(422, { error: "guard_failed", message: e.message });
      }
    }
    throw e;
  };

  // Load the inspection projection by article (reception creates it, later
  // routes already know its id — both resolve through the article).
  const expertiseByArticle = (articleId: string): ExpertiseDTO | null => {
    const row = db
      .select()
      .from(inspection)
      .where(eq(inspection.articleId, articleId))
      .get();
    return row ? toExpertiseDTO(row) : null;
  };

  const respond = (outcome: TransitionOutcome): TransitionResponse => ({
    articleId: outcome.articleId,
    previousState: outcome.etatPrecedent,
    newState: outcome.etatNouveau,
    idempotentReplay: outcome.idempotentReplay,
    expertise: expertiseByArticle(outcome.articleId),
  });

  return (
    new Elysia({ name: "expertise" })
      // POST /expertise/:id/reception — hub scan-in (vendue -> recue_hub).
      // Here `:id` is the ARTICLE id (the inspection does not exist yet); the
      // segment name is shared with the routes below (Elysia router constraint).
      .post(
        "/expertise/:id/reception",
        async ({ params, body, request, status }) => {
          const user = await getUser(request);
          if (!user) return status(401, { error: "unauthorized" });
          if (!hasRole(user, ACTION_ROLES))
            return status(403, { error: "forbidden" });
          try {
            const outcome = service.reception(params.id, body, {
              actorId: user.id,
            });
            return respond(outcome);
          } catch (e) {
            return fail(e, status);
          }
        },
        { body: receptionInputSchema },
      )

      // POST /expertise/:id/start — assign expert (recue_hub -> en_cours)
      .post(
        "/expertise/:id/start",
        async ({ params, body, request, status }) => {
          const user = await getUser(request);
          if (!user) return status(401, { error: "unauthorized" });
          if (!hasRole(user, ACTION_ROLES))
            return status(403, { error: "forbidden" });
          try {
            const outcome = service.start(params.id, body, {
              actorId: user.id,
            });
            return respond(outcome);
          } catch (e) {
            return fail(e, status);
          }
        },
        { body: startInputSchema },
      )

      // POST /expertise/:id/rapport — attach lab report (en_cours -> analyse_labo)
      .post(
        "/expertise/:id/rapport",
        async ({ params, body, request, status }) => {
          const user = await getUser(request);
          if (!user) return status(401, { error: "unauthorized" });
          if (!hasRole(user, ACTION_ROLES))
            return status(403, { error: "forbidden" });
          try {
            const outcome = service.rapport(params.id, body, {
              actorId: user.id,
            });
            return respond(outcome);
          } catch (e) {
            return fail(e, status);
          }
        },
        { body: rapportInputSchema },
      )

      // POST /expertise/:id/decision — close (VALIDER/REFUSER, motif si refus)
      .post(
        "/expertise/:id/decision",
        async ({ params, body, request, status }) => {
          const user = await getUser(request);
          if (!user) return status(401, { error: "unauthorized" });
          if (!hasRole(user, ACTION_ROLES))
            return status(403, { error: "forbidden" });
          try {
            const outcome = service.decision(params.id, body, {
              actorId: user.id,
            });
            return respond(outcome);
          } catch (e) {
            return fail(e, status);
          }
        },
        { body: decisionInputSchema },
      )

      // GET /expertise — list of dossiers (wireframe 1). expert | admin.
      // `statut` narrows to one state; otherwise every EXPERTISE_STATES dossier
      // is returned. `stateSince` (article.updatedAt) drives the "ancienneté
      // dans l'état" column — the article row is only touched on a transition,
      // so its updatedAt is the time it entered its current state.
      .get(
        "/expertise",
        async ({ query, request, status }) => {
          const user = await getUser(request);
          if (!user) return status(401, { error: "unauthorized" });
          if (!hasRole(user, ACTION_ROLES))
            return status(403, { error: "forbidden" });

          const conditions = [
            query.statut
              ? eq(article.currentState, query.statut)
              : inArray(article.currentState, [...EXPERTISE_STATES]),
          ];
          if (query.q) {
            const needle = `%${query.q}%`;
            conditions.push(
              or(like(article.brand, needle), like(article.title, needle))!,
            );
          }

          const rows = db
            .select({
              articleId: article.id,
              title: article.title,
              brand: article.brand,
              price: article.price,
              currentState: article.currentState,
              updatedAt: article.updatedAt,
              inspectorId: inspection.inspectorId,
              inspectionStatus: inspection.status,
              inspectorName: userTable.name,
            })
            .from(article)
            .leftJoin(inspection, eq(inspection.articleId, article.id))
            .leftJoin(userTable, eq(userTable.id, inspection.inspectorId))
            .where(and(...conditions))
            // Oldest in state first: the longest-waiting dossiers float up.
            .orderBy(asc(article.updatedAt))
            .all();

          const items: ExpertiseListItem[] = rows.map((r) => ({
            articleId: r.articleId,
            title: r.title,
            brand: r.brand,
            price: r.price,
            currentState: r.currentState,
            inspectorId: r.inspectorId,
            inspectorName: r.inspectorName ?? null,
            inspectionStatus: r.inspectionStatus ?? null,
            stateSince: r.updatedAt.getTime(),
          }));
          return items;
        },
        { query: expertiseListFiltersSchema },
      )

      // GET /expertise/:id — aggregated dossier detail (wireframe 2). expert |
      // admin. `:id` is the ARTICLE id (shared segment name, Elysia constraint).
      .get("/expertise/:id", async ({ params, request, status }) => {
        const user = await getUser(request);
        if (!user) return status(401, { error: "unauthorized" });
        if (!hasRole(user, ACTION_ROLES))
          return status(403, { error: "forbidden" });

        const art = db
          .select()
          .from(article)
          .where(eq(article.id, params.id))
          .get();
        if (!art) return status(404, { error: "article_not_found" });

        const insp = db
          .select()
          .from(inspection)
          .where(eq(inspection.articleId, params.id))
          .get();

        let inspectorName: string | null = null;
        let rapports: LabReportDTO[] = [];
        if (insp) {
          if (insp.inspectorId) {
            const u = db
              .select({ name: userTable.name })
              .from(userTable)
              .where(eq(userTable.id, insp.inspectorId))
              .get();
            inspectorName = u?.name ?? null;
          }
          rapports = db
            .select()
            .from(labReport)
            .where(eq(labReport.inspectionId, insp.id))
            .orderBy(asc(labReport.createdAt))
            .all()
            .map(toLabReportDTO);
        }

        const detail: ExpertiseDetail = {
          article: toArticleDTO(art),
          expertise: insp ? toExpertiseDTO(insp) : null,
          inspectorName,
          rapports,
        };
        return detail;
      })

      // GET /experts — expert identities for the "assign expert" selector.
      .get("/experts", async ({ request, status }) => {
        const user = await getUser(request);
        if (!user) return status(401, { error: "unauthorized" });
        if (!hasRole(user, ACTION_ROLES))
          return status(403, { error: "forbidden" });

        const experts: ExpertSummary[] = db
          .select({ id: userTable.id, name: userTable.name })
          .from(userTable)
          .where(eq(userTable.role, "expert"))
          .orderBy(asc(userTable.name))
          .all();
        return experts;
      })

      // GET /articles/:id/historique — read-only status-event journal (admin)
      .get("/articles/:id/historique", async ({ params, request, status }) => {
        const user = await getUser(request);
        if (!user) return status(401, { error: "unauthorized" });
        if (!hasRole(user, HISTORY_ROLES))
          return status(403, { error: "forbidden" });

        const art = db
          .select({ id: article.id })
          .from(article)
          .where(eq(article.id, params.id))
          .get();
        if (!art) return status(404, { error: "article_not_found" });

        const rows = db
          .select()
          .from(statusEvent)
          .where(eq(statusEvent.articleId, params.id))
          .orderBy(asc(statusEvent.occurredAt))
          .all();
        return rows.map(toEvenementDTO);
      })
  );
}

export type ExpertiseApp = ReturnType<typeof createExpertiseRoutes>;
