import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const rapportAction = vi.fn();
vi.mock("@/lib/expertise-actions", () => ({
  rapportAction: (...args: unknown[]) => rapportAction(...args),
}));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { RapportForm } from "@/components/dossiers/rapport-form";

beforeEach(() => {
  rapportAction.mockReset();
  refresh.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("RapportForm", () => {
  it("bloque une soumission invalide et n'appelle pas l'API", async () => {
    const user = userEvent.setup();
    render(<RapportForm inspectionId="insp_1" onClose={() => {}} />);
    await user.click(
      screen.getByRole("button", { name: /enregistrer le rapport/i }),
    );
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(rapportAction).not.toHaveBeenCalled();
  });

  it("soumet des données valides et notifie le succès", async () => {
    rapportAction.mockResolvedValue({ ok: true, newState: "lab_analysis" });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RapportForm inspectionId="insp_1" onClose={onClose} />);
    await user.type(screen.getByLabelText(/laboratoire/i), "Lab Paris");
    await user.selectOptions(screen.getByLabelText(/résultat/i), "conforme");
    await user.type(
      screen.getByLabelText(/url du document/i),
      "https://x.test/r.pdf",
    );
    await user.click(
      screen.getByRole("button", { name: /enregistrer le rapport/i }),
    );
    await waitFor(() =>
      expect(rapportAction).toHaveBeenCalledWith("insp_1", {
        laboratoire: "Lab Paris",
        resultat: "conforme",
        urlDocument: "https://x.test/r.pdf",
      }),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("affiche l'erreur API (409)", async () => {
    rapportAction.mockResolvedValue({
      ok: false,
      status: 409,
      message: "L'état a changé.",
    });
    const user = userEvent.setup();
    render(<RapportForm inspectionId="insp_1" onClose={() => {}} />);
    await user.type(screen.getByLabelText(/laboratoire/i), "Lab");
    await user.selectOptions(screen.getByLabelText(/résultat/i), "conforme");
    await user.type(
      screen.getByLabelText(/url du document/i),
      "https://x.test/r.pdf",
    );
    await user.click(
      screen.getByRole("button", { name: /enregistrer le rapport/i }),
    );
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
