import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExpertiseListItem } from "@repo/schemas";

import { DossierList } from "@/components/dossiers/dossier-list";

// next/link a besoin du contexte routeur en App Router : on le remplace par une
// ancre simple pour tester le rendu en isolation.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const item = (over: Partial<ExpertiseListItem> = {}): ExpertiseListItem => ({
  articleId: "art_12345678",
  title: "Sac test",
  brand: "Hermès",
  price: 1_000_000,
  currentState: "authentication_in_progress",
  inspectorId: null,
  inspectorName: null,
  inspectionStatus: null,
  stateSince: 1_700_000_000_000,
  ...over,
});

describe("DossierList", () => {
  it("affiche un message d'erreur accessible", () => {
    render(<DossierList result={{ status: "error", message: "Boom" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
  });

  it("affiche l'état vide", () => {
    render(<DossierList result={{ status: "empty", filtered: false }} />);
    expect(screen.getByText(/aucun dossier/i)).toBeInTheDocument();
  });

  it("distingue l'état vide filtré", () => {
    render(<DossierList result={{ status: "empty", filtered: true }} />);
    expect(screen.getByText(/correspond à ces filtres/i)).toBeInTheDocument();
  });

  it("affiche un tableau avec une ligne par dossier", () => {
    render(
      <DossierList
        result={{
          status: "ok",
          items: [
            item(),
            item({ articleId: "art_87654321", brand: "Chanel", inspectorName: "Léa" }),
          ],
        }}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Chanel")).toBeInTheDocument();
    expect(screen.getByText("Léa")).toBeInTheDocument();
    // en-tête + 2 lignes de données
    expect(screen.getAllByRole("row")).toHaveLength(3);
    // état lisible sans couleur (libellé présent)
    expect(screen.getAllByText("Expertise en cours")).toHaveLength(2);
  });
});
