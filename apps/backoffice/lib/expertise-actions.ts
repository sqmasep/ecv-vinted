"use server";

import { serverApi } from "@/lib/api";

// Résultat sérialisable renvoyé aux composants client. L'API reste la garde
// finale : on mappe ses codes (409 état modifié, 403 rôle, 422 validation) en
// messages FR accessibles, le client gère le rafraîchissement.
export type ActionResult =
  | { ok: true; newState: string }
  | { ok: false; status: number; message: string };

function mapError(status: number, fallback: string): string {
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

export async function receptionAction(
  articleId: string,
  hubId: string,
): Promise<ActionResult> {
  const api = await serverApi();
  const res = await api.expertise({ id: articleId }).reception.post({ hubId });
  if (res.error || res.status !== 200 || !res.data) {
    const status = res.status ?? 500;
    return { ok: false, status, message: mapError(status, "Échec de la réception.") };
  }
  const data = res.data as { newState: string };
  return { ok: true, newState: data.newState };
}

export async function startAction(
  articleId: string,
  expertId: string,
): Promise<ActionResult> {
  const api = await serverApi();
  const res = await api.expertise({ id: articleId }).start.post({ expertId });
  if (res.error || res.status !== 200 || !res.data) {
    const status = res.status ?? 500;
    return { ok: false, status, message: mapError(status, "Échec du démarrage.") };
  }
  const data = res.data as { newState: string };
  return { ok: true, newState: data.newState };
}
