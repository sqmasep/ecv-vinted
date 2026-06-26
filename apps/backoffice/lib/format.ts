// Helpers de formatage FR du back-office. Les montants sont en centimes
// (contrat API). `now` est injectable pour rendre `formatAge` déterministe.

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

// Ancienneté compacte ("5 min" / "3 h" / "2 j"), jamais négative.
export function formatAge(sinceMs: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - sinceMs);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

// Référence courte et lisible dérivée de l'id article (pas de champ ref en base).
export function shortRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
