"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "@repo/auth/client";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/button";

export function UserMenu() {
  const router = useRouter();
  const { data, isPending } = useSession();

  if (isPending) {
    return <Loader2 className="text-muted-foreground size-4 animate-spin" />;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Se connecter</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/sign-up">Créer un compte</Link>
        </Button>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Déconnexion réussie");
          router.push("/sign-in");
          router.refresh();
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span className="hidden max-w-40 truncate text-sm sm:inline-block">
        <span className="text-muted-foreground">Bonjour, </span>
        {data.user.name || data.user.email}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        aria-label="Se déconnecter"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  );
}
