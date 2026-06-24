import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const decisionAction = vi.fn();
vi.mock("@/lib/expertise-actions", () => ({
  decisionAction: (...args: unknown[]) => decisionAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DecisionPanel } from "@/components/dossiers/decision-panel";

beforeEach(() => {
  decisionAction.mockReset();
});

describe("DecisionPanel", () => {
  it("bloque un refus sans motif (côté front)", async () => {
    const user = userEvent.setup();
    render(
      <DecisionPanel inspectionId="insp_1" decision="rejected" onClose={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: /refuser/i }));
    expect(
      await screen.findByText(/motif est obligatoire/i),
    ).toBeInTheDocument();
    expect(decisionAction).not.toHaveBeenCalled();
  });

  it("refus avec motif : garde-fou puis appel API", async () => {
    decisionAction.mockResolvedValue({ ok: true, newState: "rejected" });
    const user = userEvent.setup();
    render(
      <DecisionPanel inspectionId="insp_1" decision="rejected" onClose={vi.fn()} />,
    );
    await user.type(
      screen.getByLabelText(/motif du refus/i),
      "Coutures non conformes",
    );
    await user.click(screen.getByRole("button", { name: /refuser/i }));
    // étape de confirmation (garde-fou) — l'API n'est pas encore appelée
    expect(await screen.findByText(/irréversible/i)).toBeInTheDocument();
    expect(decisionAction).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: /confirmer définitivement/i }),
    );
    await waitFor(() =>
      expect(decisionAction).toHaveBeenCalledWith("insp_1", {
        decision: "rejected",
        motif: "Coutures non conformes",
      }),
    );
  });

  it("validation : aperçu notif + confirmation", async () => {
    decisionAction.mockResolvedValue({ ok: true, newState: "authenticated" });
    const user = userEvent.setup();
    render(
      <DecisionPanel
        inspectionId="insp_1"
        decision="authenticated"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/aperçu des notifications/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /valider/i }));
    expect(await screen.findByText(/irréversible/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /confirmer définitivement/i }),
    );
    await waitFor(() =>
      expect(decisionAction).toHaveBeenCalledWith("insp_1", {
        decision: "authenticated",
        motif: undefined,
      }),
    );
  });
});
