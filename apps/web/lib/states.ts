import type { State } from "@repo/schemas";

export type Jalon = {
  state: State;
  numero: number;
  titre: string;
  description: string;
};

// Ordered milestones of the tracking timeline (dossier 2.2). lab_analysis is a
// sub-state of the authentication milestone and is not its own jalon.
export const JALONS: Jalon[] = [
  {
    state: "sold_awaiting_shipment",
    numero: 1,
    titre: "Achat confirmé",
    description: "Paiement validé, vos fonds sont sécurisés sous séquestre.",
  },
  {
    state: "received_at_hub",
    numero: 2,
    titre: "Reçue au hub",
    description: "Votre pièce est arrivée au hub d’authentification ÉCRIN.",
  },
  {
    state: "authentication_in_progress",
    numero: 3,
    titre: "Authentification en cours",
    description: "Nos experts authentifient votre pièce.",
  },
  {
    state: "authenticated",
    numero: 4,
    titre: "Pièce authentifiée",
    description: "Authenticité confirmée, expédition imminente.",
  },
  {
    state: "shipped",
    numero: 5,
    titre: "En route",
    description: "Votre commande a été expédiée.",
  },
  {
    state: "delivered",
    numero: 6,
    titre: "Livré",
    description: "Commande livrée, séquestre levé, transaction finalisée.",
  },
];

// Neutral sub-state labels shown without any alarming wording.
export const SUB_STATE_LABELS: Partial<Record<State, string>> = {
  lab_analysis: "Analyses complémentaires en cours",
};

export const STATE_LABELS: Record<State, string> = {
  listed: "En vente",
  sold_awaiting_shipment: "Achat confirmé",
  received_at_hub: "Reçue au hub",
  authentication_in_progress: "Authentification en cours",
  lab_analysis: "Analyses complémentaires",
  authenticated: "Pièce authentifiée",
  shipped: "Expédiée",
  delivered: "Livrée",
  rejected: "Authenticité non confirmée",
};

export const ESCROW_LABELS = {
  held: "Fonds sous séquestre",
  released: "Séquestre levé",
  refunded: "Remboursé",
} as const;

// Index of a state in the milestone order; lab_analysis maps onto the
// authentication milestone.
export function jalonIndexForState(state: State): number {
  if (state === "lab_analysis") {
    return JALONS.findIndex((j) => j.state === "authentication_in_progress");
  }
  return JALONS.findIndex((j) => j.state === state);
}

export const isRejected = (state: State) => state === "rejected";
export const isTerminal = (state: State) =>
  state === "delivered" || state === "rejected";
