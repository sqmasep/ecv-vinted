// Notification abstraction. The state machine emits NOTIFY effects; the service
// turns them into Notification records and hands them to a Notifier. The POC
// ships a ConsoleNotifier (structured log, no real channel).

import type { Effect } from "./state-machine.js";

export type Notification = {
  audience: "buyer" | "seller";
  message: string;
  articleId: string;
  orderId: string | null;
};

export interface Notifier {
  send(notification: Notification): void | Promise<void>;
}

// POC implementation: structured stdout log. Swappable for email/push later.
export class ConsoleNotifier implements Notifier {
  send(n: Notification): void {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        kind: "notification",
        audience: n.audience,
        articleId: n.articleId,
        orderId: n.orderId,
        message: n.message,
      }),
    );
  }
}

// Test double: records notifications instead of logging them.
export class RecordingNotifier implements Notifier {
  readonly sent: Notification[] = [];
  send(n: Notification): void {
    this.sent.push(n);
  }
}

// Extract NOTIFY effects into Notification records for a given article/order.
export function notificationsFromEffects(
  effects: Effect[],
  ctx: { articleId: string; orderId: string | null },
): Notification[] {
  return effects
    .filter((e): e is Extract<Effect, { type: "NOTIFY" }> => e.type === "NOTIFY")
    .map((e) => ({
      audience: e.audience,
      message: e.message,
      articleId: ctx.articleId,
      orderId: ctx.orderId,
    }));
}
