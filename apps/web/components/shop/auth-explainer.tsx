import { PackageCheck, Microscope, BadgeCheck } from "lucide-react";

const STEPS = [
  {
    icon: PackageCheck,
    title: "Réception au hub",
    text: "Le vendeur expédie la pièce à notre hub d’authentification ÉCRIN.",
  },
  {
    icon: Microscope,
    title: "Expertise",
    text: "Nos experts, épaulés par des analyses laboratoire, examinent la pièce.",
  },
  {
    icon: BadgeCheck,
    title: "Validation",
    text: "Une fois authentifiée, la pièce vous est expédiée. Sinon, remboursement automatique.",
  },
];

export function AuthExplainer() {
  return (
    <section
      aria-labelledby="auth-explainer-title"
      className="rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/10"
    >
      <h2 id="auth-explainer-title" className="font-heading text-sm font-medium">
        Comment nous authentifions
      </h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
                <step.icon className="size-4" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Étape {i + 1}
              </span>
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-muted-foreground text-sm">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
