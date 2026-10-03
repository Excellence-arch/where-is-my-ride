import { NextResponse } from "next/server";
import { activeDeliveries } from "@/lib/deliveries";
import { updateLocation } from "@/lib/server/store";
import { parseFix } from "@/lib/server/fix";

export const dynamic = "force-dynamic";

/** Rider app: a GPS fix while the trip is en route. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const waybillId = String(body.waybillId ?? "");
  if (!activeDeliveries[waybillId]) return NextResponse.json({ error: "Unknown waybill" }, { status: 404 });
  const fix = parseFix(body);
  if (!fix) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  const trip = await updateLocation(waybillId, fix);
  if (!trip) return NextResponse.json({ error: "No active trip. Start the trip first." }, { status: 409 });
  return NextResponse.json({ trip });
}
