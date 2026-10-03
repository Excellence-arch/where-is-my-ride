import { NextResponse } from "next/server";
import { activeDeliveries } from "@/lib/deliveries";
import { parseFix } from "@/lib/server/fix";
import { finishTrip, getTrip, startTrip } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Rider app: current trip for a waybill (to restore after reload). */
export async function GET(request: Request) {
  const waybillId = new URL(request.url).searchParams.get("waybillId") ?? "";
  if (!activeDeliveries[waybillId]) return NextResponse.json({ error: "Unknown waybill" }, { status: 404 });
  const trip = await getTrip(waybillId);
  return NextResponse.json({ trip: trip ?? null });
}

/** Rider app: start (with first GPS fix), mark delivered, or stop sharing. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const waybillId = String(body.waybillId ?? "");
  if (!activeDeliveries[waybillId]) return NextResponse.json({ error: "Unknown waybill" }, { status: 404 });

  if (body.action === "start") {
    const fix = parseFix(body);
    if (!fix) return NextResponse.json({ error: "A valid location is required" }, { status: 400 });
    return NextResponse.json({ trip: await startTrip(waybillId, fix) });
  }
  if (body.action === "delivered" || body.action === "stop") {
    await finishTrip(waybillId, body.action === "delivered" ? "delivered" : "idle");
    return NextResponse.json({ trip: (await getTrip(waybillId)) ?? null });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
