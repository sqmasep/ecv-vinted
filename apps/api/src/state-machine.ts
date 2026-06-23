import type { State } from "@repo/schemas";

// The happy-path transitions of the authentication state machine. The front is
// a read-only consumer; only the back brick (and this dev advance endpoint)
// ever moves an order forward.
export const NEXT_STATE: Partial<Record<State, State>> = {
  listed: "sold_awaiting_shipment",
  sold_awaiting_shipment: "received_at_hub",
  received_at_hub: "authentication_in_progress",
  authentication_in_progress: "lab_analysis",
  lab_analysis: "authenticated",
  authenticated: "shipped",
  shipped: "delivered",
};

// States from which authentication can still fail.
export const REJECTABLE_STATES: State[] = [
  "received_at_hub",
  "authentication_in_progress",
  "lab_analysis",
];

// Terminal states — no further transition.
export const TERMINAL_STATES: State[] = ["delivered", "rejected"];

// The lab_analysis sub-state is intentionally silent (dossier 2.2: no anxious
// alert), every other transition is notifiable.
export const SILENT_STATES: State[] = ["lab_analysis"];
