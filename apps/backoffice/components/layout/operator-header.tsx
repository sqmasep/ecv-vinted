import { Badge } from "@/components/ui/badge";
import { EcrinLogo } from "@/components/brand/ecrin-logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Operator } from "@/lib/access";

// Libellés FR des rôles métier (cf. @repo/schemas ROLES).
const ROLE_LABELS: Record<string, string> = {
  expert: "Expert",
  admin: "Admin",
  buyer: "Acheteur",
  seller: "Vendeur",
};

// En-tête serveur : l'opérateur est résolu par la garde (app)/layout, pas de
// re-fetch côté client. Seul le bouton déconnexion est interactif.
export function OperatorHeader({ operator }: { operator: Operator }) {
  return (
    <header className="border-t-2 border-t-vinted border-b border-b-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
        <EcrinLogo />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <span className="hidden truncate text-sm md:inline">
            <span className="text-muted-foreground">Opérateur&nbsp;: </span>
            <span className="font-medium">{operator.name}</span>
          </span>
          <Badge variant="outline">
            {ROLE_LABELS[operator.role] ?? operator.role}
          </Badge>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
