import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api";

// BFF poll endpoint: returns the order (with article) + its event journal in one
// round-trip, for the tracking timeline.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const api = await serverApi();

  const [orderRes, eventsRes] = await Promise.all([
    api.orders({ id }).get(),
    api.orders({ id }).events.get(),
  ]);

  if (orderRes.error) {
    return NextResponse.json(
      { error: "order_unavailable" },
      { status: orderRes.error.status },
    );
  }
  return NextResponse.json({
    order: orderRes.data,
    events: eventsRes.data ?? [],
  });
}
