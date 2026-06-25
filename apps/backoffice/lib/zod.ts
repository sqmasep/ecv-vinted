import type { ZodError } from "zod";

// Champs en échec de validation (premier segment du path de chaque issue).
// On n'utilise pas les messages Zod (anglais) : l'UI affiche des libellés FR.
export function failedFields(error: ZodError): Set<string> {
  const fields = new Set<string>();
  for (const issue of error.issues) {
    fields.add(String(issue.path[0] ?? "_"));
  }
  return fields;
}
