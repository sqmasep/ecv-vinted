// ===========================================================================
// Expertise state machine — the SINGLE authority on status changes.
//
// Pure & DB-free: `transition()` takes the current state + an event (+ payload)
// and returns either the target state with its side-effects, or a typed error.
// No status is ever written outside the state produced here (règle d'or).
// ===========================================================================

import type { State } from "@repo/schemas";

// --- Events ----------------------------------------------------------------

export const EXPERTISE_EVENTS = [
  "RECEPTION_HUB", // article scanned in at the hub
  "START_EXPERTISE", // an expert is assigned, expertise begins
  "DEMANDE_LABO", // a lab report is requested
  "VALIDER", // positive decision
  "REFUSER", // negative decision (requires a motive)
  "EXPEDIER", // tunnel aval: authenticated piece shipped back
  "LIVRER", // tunnel aval: delivered, escrow released
] as const;
export type ExpertiseEvent = (typeof EXPERTISE_EVENTS)[number];

// --- Side-effects ----------------------------------------------------------
// Descriptors only: the service (étape 4) interprets them (notify, escrow…).
// The machine never performs I/O itself.

export type Effect =
  | { type: "NOTIFY"; audience: "buyer" | "seller"; message: string }
  | { type: "UNLOCK_SHIPMENT" } // déblocage expédition
  | { type: "RELEASE_ESCROW" } // funds released to the seller
  | { type: "REFUND" } // funds returned to the buyer
  | { type: "TRACKING_ONLY" }; // silent tracking update, no notification

// --- Payload & result ------------------------------------------------------

export type TransitionPayload = {
  hubId?: string;
  expertId?: string;
  motif?: string;
};

export type TransitionError =
  | { kind: "TRANSITION_INTERDITE"; from: State; event: ExpertiseEvent }
  | { kind: "GARDE_NON_SATISFAITE"; event: ExpertiseEvent; reason: string };

export type TransitionResult =
  | { ok: true; etatCible: State; effets: Effect[] }
  | { ok: false; error: TransitionError };

// POC notification copy (acheteur/vendeur). Real channel is abstracted away in
// étape 4 behind the `Notifier` interface.
const MSG = {
  receptionBuyer:
    "Votre article a bien été reçu à notre hub d'authentification ÉCRIN.",
  validatedBuyer:
    "Bonne nouvelle : votre pièce a été authentifiée par nos experts ÉCRIN.",
  refusedBuyer:
    "Après expertise, votre article n'a pas pu être authentifié. Vous serez intégralement remboursé(e).",
  refusedSeller:
    "L'article vendu n'a pas passé l'expertise ÉCRIN : la transaction est annulée.",
  shippedBuyer: "Votre pièce authentifiée a été expédiée.",
  deliveredBuyer: "Votre commande a été livrée. Merci d'avoir choisi ÉCRIN.",
} as const;

// --- Transition table ------------------------------------------------------
// Each rule: which states it applies from, the event, the target state, an
// optional guard (returns a reason string when NOT satisfied), and the effects.

type Rule = {
  from: State[];
  event: ExpertiseEvent;
  to: State;
  guard?: (p: TransitionPayload) => string | undefined;
  effects: (p: TransitionPayload) => Effect[];
};

const TRANSITIONS: Rule[] = [
  {
    from: ["sold_awaiting_shipment"],
    event: "RECEPTION_HUB",
    to: "received_at_hub",
    guard: (p) => (p.hubId ? undefined : "hubId is required (article must be scanned in)"),
    effects: () => [{ type: "NOTIFY", audience: "buyer", message: MSG.receptionBuyer }],
  },
  {
    from: ["received_at_hub"],
    event: "START_EXPERTISE",
    to: "authentication_in_progress",
    guard: (p) => (p.expertId ? undefined : "expertId is required (an expert must be assigned)"),
    effects: () => [{ type: "TRACKING_ONLY" }],
  },
  {
    from: ["authentication_in_progress"],
    event: "DEMANDE_LABO",
    to: "lab_analysis",
    effects: () => [{ type: "TRACKING_ONLY" }],
  },
  {
    from: ["authentication_in_progress", "lab_analysis"],
    event: "VALIDER",
    to: "authenticated",
    effects: () => [
      { type: "NOTIFY", audience: "buyer", message: MSG.validatedBuyer },
      { type: "UNLOCK_SHIPMENT" },
    ],
  },
  {
    from: ["authentication_in_progress", "lab_analysis"],
    event: "REFUSER",
    to: "rejected",
    guard: (p) =>
      p.motif && p.motif.trim().length > 0
        ? undefined
        : "motif is required to refuse an article",
    effects: () => [
      { type: "REFUND" },
      { type: "NOTIFY", audience: "buyer", message: MSG.refusedBuyer },
      { type: "NOTIFY", audience: "seller", message: MSG.refusedSeller },
    ],
  },
  // Tunnel aval — kept so the demo timeline can walk all the way through.
  {
    from: ["authenticated"],
    event: "EXPEDIER",
    to: "shipped",
    effects: () => [{ type: "NOTIFY", audience: "buyer", message: MSG.shippedBuyer }],
  },
  {
    from: ["shipped"],
    event: "LIVRER",
    to: "delivered",
    effects: () => [
      { type: "NOTIFY", audience: "buyer", message: MSG.deliveredBuyer },
      { type: "RELEASE_ESCROW" },
    ],
  },
];

/**
 * The only function allowed to decide a status change. Pure: same inputs →
 * same result, no I/O. Any (state, event) combination absent from the table is
 * refused as TRANSITION_INTERDITE (mapped to 409 by the API).
 */
export function transition(
  from: State,
  event: ExpertiseEvent,
  payload: TransitionPayload = {},
): TransitionResult {
  const rule = TRANSITIONS.find((r) => r.event === event && r.from.includes(from));
  if (!rule) {
    return { ok: false, error: { kind: "TRANSITION_INTERDITE", from, event } };
  }
  const reason = rule.guard?.(payload);
  if (reason) {
    return { ok: false, error: { kind: "GARDE_NON_SATISFAITE", event, reason } };
  }
  return { ok: true, etatCible: rule.to, effets: rule.effects(payload) };
}

// --- Helpers for the dev-only /orders/:id/advance walk ---------------------
// Maps a state to the single "forward" event, so the demo endpoint can step
// through the chain while still going through transition() (no status written
// outside the machine).

export const FORWARD_EVENT: Partial<Record<State, ExpertiseEvent>> = {
  sold_awaiting_shipment: "RECEPTION_HUB",
  received_at_hub: "START_EXPERTISE",
  authentication_in_progress: "DEMANDE_LABO",
  lab_analysis: "VALIDER",
  authenticated: "EXPEDIER",
  shipped: "LIVRER",
};

// A status that produces no NOTIFY effect must not flag notificationSent.
export function effectsNotify(effects: Effect[]): boolean {
  return effects.some((e) => e.type === "NOTIFY");
}
