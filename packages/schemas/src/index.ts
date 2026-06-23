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
