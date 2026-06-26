import { EcrinLogo } from "@/components/brand/ecrin-logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import type { Operator } from "@/lib/access";

// Affiché quand un utilisateur authentifié mais sans rôle expert/admin atteint
// le back-office. Pas de redirection (évite une boucle avec /sign-in).
export function ForbiddenScreen({ operator }: { operator: Operator }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6">
      <EcrinLogo />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>
            Le back-office est réservé aux experts et administrateurs ÉCRIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous êtes connecté en tant que{" "}
            <span className="font-medium text-foreground">{operator.email}</span>{" "}
            (rôle&nbsp;: {operator.role}). Connectez-vous avec un compte autorisé.
          </p>
        </CardContent>
        <CardFooter>
          <SignOutButton />
        </CardFooter>
      </Card>
    </main>
  );
}
