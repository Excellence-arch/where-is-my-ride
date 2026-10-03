import { NextResponse } from "next/server";
import { activeDeliveries } from "@/lib/deliveries";
import { assignRider } from "@/lib/server/store";
import { cleanPhone } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** A registered rider picks up a delivery. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = cleanPhone(body.phone);
  const waybillId = typeof body.waybillId === "string" ? body.waybillId : "";
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!activeDeliveries[waybillId]) return NextResponse.json({ error: "Unknown waybill" }, { status: 404 });
  try {
    return NextResponse.json({ rider: await assignRider(phone, waybillId) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
