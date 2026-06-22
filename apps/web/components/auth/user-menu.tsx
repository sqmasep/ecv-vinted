"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "@repo/auth/client";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Signed out");
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
    <div className="flex items-center gap-3">
      <span className="text-sm">
        <span className="text-muted-foreground">Hi, </span>
        {data.user.name || data.user.email}
      </span>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
