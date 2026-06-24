import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import type { EvenementStatutDTO, ExpertiseListItem } from "@repo/schemas";

// --- Mocks (hooks Next / actions / auth / toasts) --------------------------
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@repo/auth/client", () => ({ signIn: { email: vi.fn() } }));
vi.mock("@/lib/expertise-actions", () => ({
  rapportAction: vi.fn(),
  decisionAction: vi.fn(),
  receptionAction: vi.fn(),
  startAction: vi.fn(),
}));

import { SignInForm } from "@/components/auth/sign-in-form";
import { DossierList } from "@/components/dossiers/dossier-list";
import { RapportForm } from "@/components/dossiers/rapport-form";
import { DecisionPanel } from "@/components/dossiers/decision-panel";
import { HistoryPanel } from "@/components/dossiers/history-panel";

// Règles désactivées : niveau document, non pertinentes pour un fragment isolé
// (jsdom n'applique pas le CSS → color-contrast est de toute façon non évalué).
async function violations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
      // Non évaluable sous jsdom (pas de CSS) — contrastes vérifiés via la palette.
      "color-contrast": { enabled: false },
    },
  });
  return results.violations;
}

const item: ExpertiseListItem = {
  articleId: "art_12345678",
  title: "Sac test",
  brand: "Hermès",
  price: 1_000_000,
  currentState: "authentication_in_progress",
  inspectorId: null,
  inspectorName: "Léa",
  inspectionStatus: "in_progress",
  stateSince: 1_700_000_000_000,
};

const event: EvenementStatutDTO = {
  id: "evt_1",
  articleId: "art_1",
  orderId: null,
  previousState: "received_at_hub",
  newState: "authentication_in_progress",
  occurredAt: 1_700_000_000_000,
  notificationSent: true,
  actorId: "u_expert",
  source: "operateur",
  notificationMessage: "Notification de test.",
  eventKey: null,
};

describe("Accessibilité (axe) des écrans clés", () => {
  it("formulaire de connexion sans violation", async () => {
    const { container } = render(<SignInForm />);
    expect(await violations(container)).toEqual([]);
  });

  it("liste des dossiers sans violation", async () => {
    const { container } = render(
      <DossierList result={{ status: "ok", items: [item] }} />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("formulaire rapport sans violation", async () => {
    const { container } = render(
      <RapportForm inspectionId="insp_1" onClose={() => {}} />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("panneau décision (refus) sans violation", async () => {
    const { container } = render(
      <DecisionPanel
        inspectionId="insp_1"
        decision="rejected"
        onClose={() => {}}
      />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("journal des transitions (admin) sans violation", async () => {
    const { container } = render(
      <HistoryPanel events={[event]} isAdmin />,
    );
    expect(await violations(container)).toEqual([]);
  });
});
