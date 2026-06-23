import { treaty, type Treaty } from "@elysiajs/eden";
import type { App } from "api";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

// Explicit annotations: Eden's inferred client type references internal module
// paths that TS can't name portably (TS2742).
type ApiClient = Treaty.Create<App>;

// Public catalogue reads (no session needed): listing & product page.
export const publicApi: ApiClient = treaty<App>(API_URL);

// Server-side Treaty client that forwards the caller's session cookie so the
// API's better-auth can resolve the buyer. Build per request (cookies vary).
// Use inside Server Components and Route Handlers (BFF) for protected calls.
export async function serverApi(): Promise<ApiClient> {
  const cookie = (await cookies()).toString();
  return treaty<App>(API_URL, {
    headers: cookie ? { cookie } : {},
  });
}
