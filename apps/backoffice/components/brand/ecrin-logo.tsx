import Link from "next/link";

import { VintedByline } from "@repo/ui/vinted-byline";
import { cn } from "@/lib/utils";

// Discreet ÉCRIN wordmark for the back-office (DA projet, distincte de
// l'expérience acheteur). Petit losange or comme seul accent, suivi du
// verrou « by Vinted ».
export function EcrinLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="ÉCRIN by Vinted — Back-office, accueil"
      className={cn(
        "flex items-center gap-2 rounded-sm text-base outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden className="inline-block size-2 rotate-45 bg-gold" />
      <span className="font-heading font-semibold tracking-[0.18em] text-foreground">
        ÉCRIN
      </span>
      <VintedByline />
      <span className="hidden border-l border-border pl-2 text-xs text-muted-foreground sm:inline">
        Back-office
      </span>
    </Link>
  );
}
