import { NextResponse } from "next/server";
import { createOrderSchema } from "@repo/schemas";

import { serverApi } from "@/lib/api";

// BFF: validates the buyer payload, mints the (mock) payment token so no card
// data ever reaches the API, then relays to Elysia with the session cookie.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse({
    ...(body ?? {}),
    paymentToken: `tok_mock_${crypto.randomUUID()}`,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const api = await serverApi();
  const { data, error } = await api.orders.post(parsed.data);
  if (error) {
    const value = error.value as { error?: string } | null;
    return NextResponse.json(
      { error: value?.error ?? "order_failed" },
      { status: error.status },
    );
  }
  return NextResponse.json(data);
}
