import Link from "next/link";

import { VintedByline } from "@repo/ui/vinted-byline";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-muted/30 flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link
        href="/"
        aria-label="ÉCRIN by Vinted — Accueil"
        className="inline-flex items-center gap-2 text-2xl"
      >
        <span className="font-heading font-semibold tracking-tight">ÉCRIN</span>
        <VintedByline />
      </Link>
      {children}
    </main>
  );
}
