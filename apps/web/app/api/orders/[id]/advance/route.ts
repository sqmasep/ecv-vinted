import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api";

// BFF for the dev-only state-machine advance (demo of the live timeline).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reject?: boolean };

  const api = await serverApi();
  const { data, error } = await api
    .orders({ id })
    .advance.post({ reject: Boolean(body.reject) });

  if (error) {
    const value = error.value as { error?: string } | null;
    return NextResponse.json(
      { error: value?.error ?? "advance_failed" },
      { status: error.status },
    );
  }
  return NextResponse.json(data);
}
