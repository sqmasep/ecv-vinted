import { headers } from "next/headers";

import type { Operator } from "@/lib/access";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

// Résout l'opérateur connecté côté serveur en interrogeant better-auth via
// l'API (server-to-server, cookie transféré). On ne touche jamais @repo/auth /
// @repo/db ici : ils dépendent de bun:sqlite, indisponible sous le runtime Node
// de Next. L'API reste la source de vérité de la session et des rôles.
export async function getOperator(): Promise<Operator | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user?: { id: string; name?: string; email: string; role?: string };
    } | null;
    const u = data?.user;
    if (!u) return null;
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      role: u.role ?? "buyer",
    };
  } catch {
    // API injoignable → traité comme non authentifié (redirection login).
    return null;
  }
}
