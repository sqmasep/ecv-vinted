// Actions opérateur légales depuis l'état courant — miroir FIDÈLE de la machine
// à états de l'API (apps/api/.../state-machine.ts). Le front ne décide jamais
// d'un statut : il propose les seules transitions autorisées et l'API tranche
// (un 409 signifie que l'état a changé entre-temps).

export type ActionKind = "reception" | "start" | "rapport" | "validate" | "reject";

export type DossierAction = {
  kind: ActionKind;
  label: string;
};

const RECEPTION: DossierAction = {
  kind: "reception",
  label: "Enregistrer la réception au hub",
};
const START: DossierAction = { kind: "start", label: "Démarrer l'expertise" };
const RAPPORT: DossierAction = { kind: "rapport", label: "Saisir un rapport" };
const VALIDATE: DossierAction = { kind: "validate", label: "Valider" };
const REJECT: DossierAction = { kind: "reject", label: "Refuser" };

export function allowedActions(state: string): DossierAction[] {
  switch (state) {
    case "sold_awaiting_shipment":
      return [RECEPTION];
    case "received_at_hub":
      return [START];
    case "authentication_in_progress":
      return [RAPPORT, VALIDATE, REJECT];
    case "lab_analysis":
      return [VALIDATE, REJECT];
    default:
      // authenticated, rejected, shipped, delivered, listed → lecture seule.
      return [];
  }
}
