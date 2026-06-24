import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Démonte le DOM rendu entre chaque test (pas de globals → pas d'auto-cleanup).
afterEach(() => {
  cleanup();
});
