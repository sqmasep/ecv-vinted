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
      {/* Lien d'évitement (RGAA) : visible uniquement au focus clavier. */}
      <a
        href="#contenu"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-medium ring-2 ring-ring focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
      >
        Aller au contenu principal
      </a>
      <OperatorHeader operator={operator!} />
      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6 outline-none"
      >
        {children}
      </main>
    </div>
  );
}
