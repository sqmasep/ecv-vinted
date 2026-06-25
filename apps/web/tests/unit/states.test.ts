import { describe, expect, test } from "bun:test";
import { ESCROW_STATUSES, STATES } from "@repo/schemas";
import {
  JALONS,
  STATE_LABELS,
  ESCROW_LABELS,
  SUB_STATE_LABELS,
  jalonIndexForState,
  isRejected,
  isTerminal,
} from "../../lib/states";

describe("tracking states", () => {
  test("six ordered milestones, numbered 1..6", () => {
    expect(JALONS).toHaveLength(6);
    expect(JALONS.map((j) => j.numero)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("jalonIndexForState maps known states to their position", () => {
    expect(jalonIndexForState("sold_awaiting_shipment")).toBe(0);
    expect(jalonIndexForState("received_at_hub")).toBe(1);
    expect(jalonIndexForState("delivered")).toBe(5);
  });

  test("lab_analysis folds into the authentication milestone", () => {
    expect(jalonIndexForState("lab_analysis")).toBe(
      jalonIndexForState("authentication_in_progress"),
    );
    expect(jalonIndexForState("lab_analysis")).toBe(2);
  });

  test("states outside the timeline return -1", () => {
    expect(jalonIndexForState("listed")).toBe(-1);
    expect(jalonIndexForState("rejected")).toBe(-1);
  });

  test("isRejected / isTerminal", () => {
    expect(isRejected("rejected")).toBe(true);
    expect(isRejected("delivered")).toBe(false);
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("rejected")).toBe(true);
    expect(isTerminal("shipped")).toBe(false);
  });

  test("every state and escrow status has a French label", () => {
    for (const s of STATES) expect(STATE_LABELS[s]).toBeTruthy();
    for (const e of ESCROW_STATUSES) expect(ESCROW_LABELS[e]).toBeTruthy();
    expect(SUB_STATE_LABELS.lab_analysis).toBeTruthy();
  });
});
