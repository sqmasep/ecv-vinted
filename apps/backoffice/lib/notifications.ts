// Aperçu des notifications affichées à l'opérateur AVANT confirmation d'une
// décision (transparence). C'est l'API (state-machine MSG) qui émet réellement
// les notifications ; cette copie en est le miroir.
//
// HYPOTHÈSE : le texte est dupliqué depuis apps/api/.../state-machine.ts. Pour
// éviter toute dérive à terme, l'API pourrait exposer l'aperçu (ex. champ
// `notificationPreview` sur une route dry-run) — non fait à ce stade.

export type NotificationPreview = { audience: string; message: string };

export const VALIDATE_PREVIEW: NotificationPreview[] = [
  {
    audience: "Acheteur",
    message:
      "Bonne nouvelle : votre pièce a été authentifiée par nos experts ÉCRIN.",
  },
];

export const REJECT_PREVIEW: NotificationPreview[] = [
  {
    audience: "Acheteur",
    message:
      "Après expertise, votre article n'a pas pu être authentifié. Vous serez intégralement remboursé(e).",
  },
  {
    audience: "Vendeur",
    message:
      "L'article vendu n'a pas passé l'expertise ÉCRIN : la transaction est annulée.",
  },
];
