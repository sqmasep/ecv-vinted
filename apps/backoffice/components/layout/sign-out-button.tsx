"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@repo/auth/client";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Déconnecté");
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      aria-label="Déconnexion"
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">Déconnexion</span>
    </Button>
  );
}
