import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
// Enum vocabulary lives in @repo/schemas (single source of truth shared with
// the API and the front). Money is stored as integer cents to avoid float drift.
import {
  STATES,
  ESCROW_STATUSES,
  INSPECTION_STATUSES,
  INSPECTION_DECISIONS,
  ROLES,
} from "@repo/schemas";

export type {
  State,
  EscrowStatus,
  Role,
} from "@repo/schemas";

// ---------------------------------------------------------------------------
// Auth tables (better-auth) — do not rename columns; adapter relies on them.
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  // Domain role. Default buyer so sign-up works.
  role: text("role", { enum: ROLES }).default("buyer").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Domain tables — ÉCRIN purchase tunnel.
// ---------------------------------------------------------------------------

// Premium article. Feeds listing + product page; purchasable if state=listed.
export const article = sqliteTable(
  "article",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    brand: text("brand").notNull(),
    price: integer("price").notNull(), // cents
    authenticationFee: integer("authentication_fee").default(0).notNull(), // cents
    currentState: text("current_state", { enum: STATES })
      .default("listed")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("article_sellerId_idx").on(table.sellerId)],
);

// Order. Created at payment; pivot of the tracking flow.
export const order = sqliteTable(
  "order",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "restrict" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ESCROW_STATUSES })
      .default("held")
      .notNull(),
    amount: integer("amount").notNull(), // cents, escrowed total
    date: integer("date", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("order_articleId_idx").on(table.articleId),
    index("order_buyerId_idx").on(table.buyerId),
  ],
);

// Inspection (authentication, back brick). One per article (ERD 1-to-1).
export const inspection = sqliteTable(
  "inspection",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .unique()
      .references(() => article.id, { onDelete: "cascade" }),
    inspectorId: text("inspector_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status", { enum: INSPECTION_STATUSES })
      .default("pending")
      .notNull(),
    decision: text("decision", { enum: INSPECTION_DECISIONS }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("inspection_inspectorId_idx").on(table.inspectorId)],
);

// Lab report. 0..n per inspection.
export const labReport = sqliteTable(
  "lab_report",
  {
    id: text("id").primaryKey(),
    inspectionId: text("inspection_id")
      .notNull()
      .references(() => inspection.id, { onDelete: "cascade" }),
    laboratory: text("laboratory").notNull(),
    result: text("result").notNull(),
    documentUrl: text("document_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("labReport_inspectionId_idx").on(table.inspectionId)],
);

// Status event. Journal of state-machine transitions; single source of the
// tracking timeline (read-only on the front). Always tied to an article, and
// to an order once one exists.
export const statusEvent = sqliteTable(
  "status_event",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => order.id, {
      onDelete: "cascade",
    }),
    previousState: text("previous_state", { enum: STATES }),
    newState: text("new_state", { enum: STATES }).notNull(),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    notificationSent: integer("notification_sent", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (table) => [
    index("statusEvent_articleId_idx").on(table.articleId),
    index("statusEvent_orderId_idx").on(table.orderId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  articlesForSale: many(article),
  orders: many(order),
  inspections: many(inspection),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const articleRelations = relations(article, ({ one, many }) => ({
  seller: one(user, {
    fields: [article.sellerId],
    references: [user.id],
  }),
  orders: many(order),
  inspection: one(inspection),
  statusEvents: many(statusEvent),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  article: one(article, {
    fields: [order.articleId],
    references: [article.id],
  }),
  buyer: one(user, {
    fields: [order.buyerId],
    references: [user.id],
  }),
  statusEvents: many(statusEvent),
}));

export const inspectionRelations = relations(inspection, ({ one, many }) => ({
  article: one(article, {
    fields: [inspection.articleId],
    references: [article.id],
  }),
  inspector: one(user, {
    fields: [inspection.inspectorId],
    references: [user.id],
  }),
  labReports: many(labReport),
}));

export const labReportRelations = relations(labReport, ({ one }) => ({
  inspection: one(inspection, {
    fields: [labReport.inspectionId],
    references: [inspection.id],
  }),
}));

export const statusEventRelations = relations(statusEvent, ({ one }) => ({
  article: one(article, {
    fields: [statusEvent.articleId],
    references: [article.id],
  }),
  order: one(order, {
    fields: [statusEvent.orderId],
    references: [order.id],
  }),
}));
