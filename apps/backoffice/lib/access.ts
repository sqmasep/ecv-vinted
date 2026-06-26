import type { Role } from "@repo/schemas";

// Rôles autorisés à entrer dans le back-office (cf. routes API expertise).
export const BACKOFFICE_ROLES: readonly Role[] = ["expert", "admin"];

export type Operator = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Décision d'accès au shell back-office, dérivée de l'opérateur résolu côté
// serveur. L'API reste la garde finale (403) ; ceci pilote l'UI.
export type AccessDecision = "sign-in" | "forbidden" | "ok";

export function resolveAccess(operator: Operator | null): AccessDecision {
  if (!operator) return "sign-in";
  return canAccessBackoffice(operator.role) ? "ok" : "forbidden";
}

export function canAccessBackoffice(role: string | null | undefined): boolean {
  return role === "expert" || role === "admin";
}

// L'audit (journal des transitions) est réservé à l'admin.
export function canAudit(role: string | null | undefined): boolean {
  return role === "admin";
}

// Les actions d'expertise (réception, start, rapport, décision) : expert | admin.
export function canExpertise(role: string | null | undefined): boolean {
  return canAccessBackoffice(role);
}
