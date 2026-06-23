import { notFound, redirect } from "next/navigation";

import { serverApi } from "@/lib/api";
import { TrackingTimeline } from "@/components/shop/tracking-timeline";

export const dynamic = "force-dynamic";

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const api = await serverApi();

  const orderRes = await api.orders({ id: orderId }).get();
  if (orderRes.error) {
    if (orderRes.error.status === 401) redirect("/sign-in");
    notFound();
  }
  const eventsRes = await api.orders({ id: orderId }).events.get();

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-xl font-semibold">Suivi de commande</h1>
      <TrackingTimeline
        orderId={orderId}
        initial={{ order: orderRes.data, events: eventsRes.data ?? [] }}
      />
    </div>
  );
}
