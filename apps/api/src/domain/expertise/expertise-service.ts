// ===========================================================================
// ExpertiseService — orchestrates the state machine and the database.
//
// Rule of thumb (règle d'or): no status is ever written outside transition().
// Every successful transition writes, IN THE SAME SQL TRANSACTION, the state
// update + a `status_event` journal row (+ the entity-specific writes such as
// the lab report). Notifications fire only AFTER the transaction commits.
// ===========================================================================

import { eq, desc } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "@repo/db/schema";
import type { State, EventSource, ResultatLabo, Decision } from "@repo/schemas";
import {
  transition,
  type ExpertiseEvent,
  type TransitionPayload,
  type Effect,
} from "./state-machine.js";
import {
  notificationsFromEffects,
  type Notification,
  type Notifier,
} from "./notifier.js";

const { article, inspection, labReport, order, statusEvent } = schema;

// Accepts any synchronous Drizzle SQLite database bound to our schema — the
// bun:sqlite client in prod, better-sqlite3 (:memory:) in tests.
export type AppDb = BunSQLiteDatabase<typeof schema>;
type Tx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

// --- Typed errors (no thrown strings) --------------------------------------

export type ExpertiseErrorCode =
  | "NOT_FOUND"
  | "TRANSITION_INTERDITE"
  | "GARDE_NON_SATISFAITE";

export class ExpertiseError extends Error {
  constructor(
    readonly code: ExpertiseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExpertiseError";
  }
}

// --- Result ----------------------------------------------------------------

export type TransitionOutcome = {
  articleId: string;
  inspectionId: string | null;
  etatPrecedent: State;
  etatNouveau: State;
  statusEventId: string;
  notifications: Notification[];
  idempotentReplay: boolean;
};

type InspectionRow = typeof inspection.$inferSelect;

export class ExpertiseService {
  constructor(
    private readonly db: AppDb,
    private readonly notifier: Notifier,
  ) {}

  // --- Public API (one method per back-office action) ----------------------

  /** Article scanned in at the hub: opens the inspection, vendue -> recue_hub. */
  reception(
    articleId: string,
    input: { hubId: string },
    opts: { actorId: string | null; source?: EventSource; eventKey?: string } = {
      actorId: null,
    },
  ): TransitionOutcome {
    return this.apply({
      articleId,
      event: "RECEPTION_HUB",
      payload: { hubId: input.hubId },
      actorId: opts.actorId,
      source: opts.source ?? "operateur",
      eventKey: opts.eventKey,
      writes: (tx) => {
        const existing = tx
          .select({ id: inspection.id })
          .from(inspection)
          .where(eq(inspection.articleId, articleId))
          .get();
        if (!existing) {
          tx.insert(inspection)
            .values({ id: crypto.randomUUID(), articleId, status: "pending" })
            .run();
        }
      },
    });
  }

  /** Assign an expert and begin: recue_hub -> expertise_en_cours. */
  start(
    inspectionId: string,
    input: { expertId: string },
    opts: { actorId: string | null; source?: EventSource; eventKey?: string } = {
      actorId: null,
    },
  ): TransitionOutcome {
    const insp = this.requireInspection(inspectionId);
    return this.apply({
      articleId: insp.articleId,
      inspectionId: insp.id,
      event: "START_EXPERTISE",
      payload: { expertId: input.expertId },
      actorId: opts.actorId,
      source: opts.source ?? "operateur",
      eventKey: opts.eventKey,
      writes: (tx) => {
        tx.update(inspection)
          .set({ inspectorId: input.expertId, status: "in_progress" })
          .where(eq(inspection.id, insp.id))
          .run();
      },
    });
  }

  /** Attach a lab report and move expertise_en_cours -> analyse_labo. */
  rapport(
    inspectionId: string,
    input: { laboratoire: string; resultat: ResultatLabo; urlDocument: string },
    opts: { actorId: string | null; source?: EventSource; eventKey?: string } = {
      actorId: null,
    },
  ): TransitionOutcome {
    const insp = this.requireInspection(inspectionId);
    return this.apply({
      articleId: insp.articleId,
      inspectionId: insp.id,
      event: "DEMANDE_LABO",
      payload: {},
      actorId: opts.actorId,
      source: opts.source ?? "operateur",
      eventKey: opts.eventKey,
      writes: (tx) => {
        tx.insert(labReport)
          .values({
            id: crypto.randomUUID(),
            inspectionId: insp.id,
            laboratory: input.laboratoire,
            result: input.resultat,
            documentUrl: input.urlDocument,
          })
          .run();
      },
    });
  }

  /** Close the expertise: VALIDER -> authentifie or REFUSER (+motif) -> refuse. */
  decision(
    inspectionId: string,
    input: { decision: Decision; motif?: string },
    opts: { actorId: string | null; source?: EventSource; eventKey?: string } = {
      actorId: null,
    },
  ): TransitionOutcome {
    const insp = this.requireInspection(inspectionId);
    const event: ExpertiseEvent =
      input.decision === "authenticated" ? "VALIDER" : "REFUSER";
    return this.apply({
      articleId: insp.articleId,
      inspectionId: insp.id,
      event,
      payload: { motif: input.motif },
      actorId: opts.actorId,
      source: opts.source ?? "operateur",
      eventKey: opts.eventKey,
      writes: (tx) => {
        tx.update(inspection)
          .set({
            status: "completed",
            decision: input.decision,
            rejectionReason: input.decision === "rejected" ? (input.motif ?? null) : null,
          })
          .where(eq(inspection.id, insp.id))
          .run();
      },
    });
  }

  // --- Core (atomic) -------------------------------------------------------

  private apply(params: {
    articleId: string;
    inspectionId?: string;
    event: ExpertiseEvent;
    payload: TransitionPayload;
    actorId: string | null;
    source: EventSource;
    eventKey?: string;
    writes: (tx: Tx) => void;
  }): TransitionOutcome {
    const outcome = this.db.transaction((tx): TransitionOutcome => {
      // 1. Idempotency: a replayed external event must not re-apply anything.
      if (params.eventKey) {
        const prior = tx
          .select()
          .from(statusEvent)
          .where(eq(statusEvent.eventKey, params.eventKey))
          .get();
        if (prior) {
          return {
            articleId: prior.articleId,
            inspectionId: params.inspectionId ?? null,
            etatPrecedent: prior.previousState as State,
            etatNouveau: prior.newState,
            statusEventId: prior.id,
            notifications: [],
            idempotentReplay: true,
          };
        }
      }

      // 2. Load current state.
      const art = tx
        .select()
        .from(article)
        .where(eq(article.id, params.articleId))
        .get();
      if (!art) throw new ExpertiseError("NOT_FOUND", `article ${params.articleId} not found`);

      // 3. The state machine is the sole authority (throws => full rollback).
      const result = transition(art.currentState, params.event, params.payload);
      if (!result.ok) {
        if (result.error.kind === "TRANSITION_INTERDITE") {
          throw new ExpertiseError(
            "TRANSITION_INTERDITE",
            `${params.event} not allowed from ${art.currentState}`,
          );
        }
        throw new ExpertiseError("GARDE_NON_SATISFAITE", result.error.reason);
      }

      const etatPrecedent = art.currentState;
      const etatNouveau = result.etatCible;

      // 4. Entity-specific writes (inspection, lab report…).
      params.writes(tx);

      // 5. State change.
      tx.update(article)
        .set({ currentState: etatNouveau })
        .where(eq(article.id, params.articleId))
        .run();

      // 6. Escrow effects (settled from effects, never from the state name).
      const ord = tx
        .select({ id: order.id })
        .from(order)
        .where(eq(order.articleId, params.articleId))
        .orderBy(desc(order.date))
        .get();
      if (ord) {
        if (result.effets.some((e) => e.type === "REFUND")) {
          tx.update(order).set({ status: "refunded" }).where(eq(order.id, ord.id)).run();
        }
        if (result.effets.some((e) => e.type === "RELEASE_ESCROW")) {
          tx.update(order).set({ status: "released" }).where(eq(order.id, ord.id)).run();
        }
      }

      // 7. Journal row (same transaction). notificationMessage = buyer copy.
      const notifications = notificationsFromEffects(result.effets, {
        articleId: params.articleId,
        orderId: ord?.id ?? null,
      });
      const buyerMsg = notifications.find((n) => n.audience === "buyer")?.message ?? null;
      const statusEventId = crypto.randomUUID();
      tx.insert(statusEvent)
        .values({
          id: statusEventId,
          articleId: params.articleId,
          orderId: ord?.id ?? null,
          previousState: etatPrecedent,
          newState: etatNouveau,
          actorId: params.actorId,
          source: params.source,
          notificationSent: notifications.length > 0,
          notificationMessage: buyerMsg,
          eventKey: params.eventKey ?? null,
        })
        .run();

      return {
        articleId: params.articleId,
        inspectionId: params.inspectionId ?? null,
        etatPrecedent,
        etatNouveau,
        statusEventId,
        notifications,
        idempotentReplay: false,
      };
    });

    // 8. Fire side-effects AFTER commit (never inside the transaction).
    if (!outcome.idempotentReplay) {
      for (const n of outcome.notifications) void this.notifier.send(n);
    }
    return outcome;
  }

  private requireInspection(inspectionId: string): InspectionRow {
    const insp = this.db
      .select()
      .from(inspection)
      .where(eq(inspection.id, inspectionId))
      .get();
    if (!insp) {
      throw new ExpertiseError("NOT_FOUND", `inspection ${inspectionId} not found`);
    }
    return insp;
  }
}

export type { Effect };
