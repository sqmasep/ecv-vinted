"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/expertise-actions";

// Centralise le traitement d'une server action d'expertise : état "pending",
// toast de succès/erreur, et rafraîchissement serveur (toujours sur succès, et
// sur 409 pour réafficher les actions valides après un changement d'état).
export function useExpertiseAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionResult>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.message);
        if (res.status === 409) router.refresh();
      }
    });
  }

  return { pending, run };
}
