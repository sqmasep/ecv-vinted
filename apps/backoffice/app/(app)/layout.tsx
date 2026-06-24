import { redirect } from "next/navigation";

import { OperatorHeader } from "@/components/layout/operator-header";
import { ForbiddenScreen } from "@/components/auth/forbidden-screen";
import { resolveAccess } from "@/lib/access";
import { getOperator } from "@/lib/session";

// Garde de session serveur du back-office. L'API reste la garde finale (403) ;
// ici on bloque l'entrée du shell : non connecté → login, mauvais rôle → refus.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const operator = await getOperator();
  const access = resolveAccess(operator);

  if (access === "sign-in") redirect("/sign-in");
  if (access === "forbidden") return <ForbiddenScreen operator={operator!} />;

  return (
    <div className="min-h-dvh bg-background">
      <OperatorHeader operator={operator!} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
