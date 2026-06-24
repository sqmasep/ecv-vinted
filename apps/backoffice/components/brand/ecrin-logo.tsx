import Link from "next/link";

import { cn } from "@/lib/utils";

// Discreet ÉCRIN wordmark for the back-office (DA projet, distincte de
// l'expérience acheteur). Petit losange or comme seul accent.
export function EcrinLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="ÉCRIN — Back-office, accueil"
      className={cn(
        "flex items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden className="inline-block size-2 rotate-45 bg-gold" />
      <span className="font-heading text-base font-semibold tracking-[0.18em] text-foreground">
        ÉCRIN
      </span>
      <span className="hidden border-l border-border pl-2 text-xs text-muted-foreground sm:inline">
        Back-office
      </span>
    </Link>
  );
}
