const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// Prices are stored as integer cents.
export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(ms: number): string {
  return dateTime.format(new Date(ms));
}
