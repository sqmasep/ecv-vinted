import { z } from "zod";

// ---------------------------------------------------------------------------
// Canonical enum tuples — single source of truth for the whole monorepo.
// @repo/db imports these for its column `enum` definitions, so the database,
// the API and the front can never drift on the state-machine vocabulary.
// ---------------------------------------------------------------------------

// Article / order lifecycle, mapped to the tracking timeline (dossier 2.2).
export const STATES = [
  "listed", // on sale, purchasable
  "sold_awaiting_shipment", // paid, funds in escrow
  "received_at_hub", // received at the authentication hub
  "authentication_in_progress", // experts working on it
  "lab_analysis", // neutral sub-state of the authentication step
  "authenticated", // terminal +
  "shipped", // terminal +
  "delivered", // terminal +, escrow released
  "rejected", // terminal -, refund
] as const;

export const ESCROW_STATUSES = ["held", "released", "refunded"] as const;

export const INSPECTION_STATUSES = [
  "pending",
  "in_progress",
  "completed",
] as const;

export const INSPECTION_DECISIONS = ["authenticated", "rejected"] as const;

// Origin of a status-machine event — who/what triggered the transition.
// `operateur` = expert/admin via back-office, `webhook` = external lab feed,
// `systeme` = automatic effect.
export const EVENT_SOURCES = ["operateur", "webhook", "systeme"] as const;

export const ROLES = ["buyer", "seller", "expert", "admin"] as const;

// ---------------------------------------------------------------------------
// Enum schemas + types
// ---------------------------------------------------------------------------

export const stateSchema = z.enum(STATES);
export type State = z.infer<typeof stateSchema>;

export const escrowStatusSchema = z.enum(ESCROW_STATUSES);
export type EscrowStatus = z.infer<typeof escrowStatusSchema>;

export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const eventSourceSchema = z.enum(EVENT_SOURCES);
export type EventSource = z.infer<typeof eventSourceSchema>;

// ---------------------------------------------------------------------------
// Entity schemas (API output) — timestamps are epoch ms numbers; the API maps
// Drizzle Date columns to getTime() so the contract stays JSON-friendly.
// Money is in integer cents.
// ---------------------------------------------------------------------------

export const articleSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number().int().nonnegative(),
  authenticationFee: z.number().int().nonnegative(),
  currentState: stateSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Article = z.infer<typeof articleSchema>;

export const orderSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  buyerId: z.string(),
  status: escrowStatusSchema,
  amount: z.number().int().nonnegative(),
  date: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Order = z.infer<typeof orderSchema>;

export const statusEventSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  orderId: z.string().nullable(),
  previousState: stateSchema.nullable(),
  newState: stateSchema,
  occurredAt: z.number().int(),
  notificationSent: z.boolean(),
});
export type StatusEvent = z.infer<typeof statusEventSchema>;

// Order joined with its article — what the tracking screen consumes.
export const orderWithArticleSchema = orderSchema.extend({
  article: articleSchema,
});
export type OrderWithArticle = z.infer<typeof orderWithArticleSchema>;

// ---------------------------------------------------------------------------
// Cart (client/session only — no cart entity in the ERD).
// ---------------------------------------------------------------------------

export const cartItemSchema = z.object({
  articleId: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number().int().nonnegative(),
  authenticationFee: z.number().int().nonnegative(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

// ---------------------------------------------------------------------------
// Input payloads (API / BFF validation)
// ---------------------------------------------------------------------------

// Listing filters. Query params arrive as strings → coerce numbers.
export const articleFiltersSchema = z.object({
  brand: z.string().optional(),
  state: stateSchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  q: z.string().optional(),
});
export type ArticleFilters = z.infer<typeof articleFiltersSchema>;

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  address: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

// Create-order input. `paymentToken` is the tokenised stand-in for the payment
// provider — no raw card data ever reaches the API (RGPD minimisation).
export const createOrderSchema = z.object({
  articleId: z.string().min(1),
  shipping: shippingAddressSchema,
  paymentToken: z.string().min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Dev-only: advance an order along the state machine (demo of the timeline).
export const advanceOrderSchema = z.object({
  reject: z.boolean().optional(),
});
export type AdvanceOrderInput = z.infer<typeof advanceOrderSchema>;

// ===========================================================================
// Back brick — expertise / authentication (single source of truth shared by
// the API and the future back-office).
// ===========================================================================

// Lifecycle states the back brick pilots, expressed in the canonical STATES
// vocabulary (`recue_hub` → `authentifie`/`refuse`). It is the subset of STATES
// the expertise domain reads/writes; `listed`/`delivered` stay tunnel-only.
export const EXPERTISE_STATES = [
  "sold_awaiting_shipment", // vendue
  "received_at_hub", // recue_hub
  "authentication_in_progress", // expertise_en_cours
  "lab_analysis", // analyse_labo
  "authenticated", // authentifie
  "rejected", // refuse
  "shipped", // expedie (handed back to the tunnel)
] as const;

export const statutExpertiseSchema = z.enum(EXPERTISE_STATES);
export type StatutExpertise = z.infer<typeof statutExpertiseSchema>;

// Final decision of an expertise. Reuses INSPECTION_DECISIONS so the API input,
// the `inspection.decision` column and the DTO never drift.
export const decisionSchema = z.enum(INSPECTION_DECISIONS);
export type Decision = z.infer<typeof decisionSchema>;

// Result classification of a lab report.
export const LAB_RESULTS = ["conforme", "non_conforme", "non_concluant"] as const;
export const resultatLaboSchema = z.enum(LAB_RESULTS);
export type ResultatLabo = z.infer<typeof resultatLaboSchema>;

// --- Route input payloads (étape 5) ---------------------------------------

// POST /expertise/:articleId/reception — article scanned in at the hub.
export const receptionInputSchema = z.object({
  hubId: z.string().min(1),
});
export type ReceptionInput = z.infer<typeof receptionInputSchema>;

// POST /expertise/:id/start — assign an expert and begin the expertise.
export const startInputSchema = z.object({
  expertId: z.string().min(1),
});
export type StartInput = z.infer<typeof startInputSchema>;

// POST /expertise/:id/rapport — attach a lab report.
export const rapportInputSchema = z.object({
  laboratoire: z.string().min(1),
  resultat: resultatLaboSchema,
  urlDocument: z.string().url(),
});
export type RapportInput = z.infer<typeof rapportInputSchema>;

// POST /expertise/:id/decision — close the expertise. `motif` is mandatory and
// non-empty when refusing (state-machine guard for REFUSER).
export const decisionInputSchema = z
  .object({
    decision: decisionSchema,
    motif: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "rejected" && !val.motif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motif"],
        message: "motif is required when decision is 'rejected'",
      });
    }
  });
export type DecisionInput = z.infer<typeof decisionInputSchema>;

// --- Output DTOs -----------------------------------------------------------

// Expertise (inspection) projection. Timestamps are epoch ms (API contract).
export const expertiseDTO = z.object({
  id: z.string(),
  articleId: z.string(),
  inspectorId: z.string().nullable(),
  status: z.enum(INSPECTION_STATUSES),
  decision: decisionSchema.nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type ExpertiseDTO = z.infer<typeof expertiseDTO>;

// Status-event journal row (audit trail). Extends the buyer-timeline shape with
// the back-brick audit fields (actor, source, message body, idempotency key).
export const evenementStatutDTO = statusEventSchema.extend({
  actorId: z.string().nullable(),
  source: eventSourceSchema,
  notificationMessage: z.string().nullable(),
  eventKey: z.string().nullable(),
});
export type EvenementStatutDTO = z.infer<typeof evenementStatutDTO>;

// Lab report projection (one expertise can hold several). `resultat`/`laboratoire`
// /`urlDocument` mirror the French rapportInput vocabulary; `urlDocument` is
// nullable because the `lab_report.document_url` column allows it.
export const labReportDTO = z.object({
  id: z.string(),
  inspectionId: z.string(),
  laboratoire: z.string(),
  resultat: resultatLaboSchema,
  urlDocument: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type LabReportDTO = z.infer<typeof labReportDTO>;

// --- Back-office read endpoints (liste + détail dossiers) -------------------

// Query filters for GET /expertise (list of expertise dossiers).
export const expertiseListFiltersSchema = z.object({
  // Restrict to a single state; omitted => all EXPERTISE_STATES.
  statut: statutExpertiseSchema.optional(),
  // Free-text search on brand/title.
  q: z.string().optional(),
});
export type ExpertiseListFilters = z.infer<typeof expertiseListFiltersSchema>;

// One row of the dossier list (wireframe 1). `stateSince` is the epoch ms when
// the article entered its current state (drives "ancienneté dans l'état").
export const expertiseListItemDTO = z.object({
  articleId: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number().int().nonnegative(),
  currentState: stateSchema,
  inspectorId: z.string().nullable(),
  inspectorName: z.string().nullable(),
  inspectionStatus: z.enum(INSPECTION_STATUSES).nullable(),
  stateSince: z.number().int(),
});
export type ExpertiseListItem = z.infer<typeof expertiseListItemDTO>;

// Aggregated dossier detail (wireframe 2): article + inspection + lab reports.
export const expertiseDetailDTO = z.object({
  article: articleSchema,
  expertise: expertiseDTO.nullable(),
  inspectorName: z.string().nullable(),
  rapports: z.array(labReportDTO),
});
export type ExpertiseDetail = z.infer<typeof expertiseDetailDTO>;

// Minimal expert identity for the "assign expert" selector (GET /experts).
export const expertSummaryDTO = z.object({
  id: z.string(),
  name: z.string(),
});
export type ExpertSummary = z.infer<typeof expertSummaryDTO>;
