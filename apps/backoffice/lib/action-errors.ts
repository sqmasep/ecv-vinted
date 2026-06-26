// Mapping pur des codes HTTP de l'API d'expertise vers des messages FR
// accessibles. Isolé de expertise-actions ("use server", exports = async only)
// pour rester importable et testable unitairement.
export function actionErrorMessage(status: number, fallback: string): string {
  switch (status) {
    case 409:
      return "L'état du dossier a changé entre-temps. La page va se rafraîchir.";
    case 403:
      return "Action non autorisée pour votre rôle.";
    case 422:
      return "Données invalides : vérifiez la saisie.";
    case 404:
      return "Dossier introuvable.";
    default:
      return fallback;
  }
}
