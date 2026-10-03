import { NextResponse } from "next/server";
import { normalizeWaybill } from "@/lib/deliveries";
import { liveDelivery, spokenStatus } from "@/lib/demoState";

// BimpeAI voice-agent webhook. Pure in-memory lookup so it answers in
// milliseconds, well inside the agent's 2-second tool budget.
export const dynamic = "force-dynamic";

function lookup(rawId: unknown) {
  const cleanId = normalizeWaybill(rawId);
  const delivery = liveDelivery(cleanId);

  if (delivery) {
    return NextResponse.json({
      success: true,
      data: {
        waybillId: delivery.waybillId,
        riderName: delivery.riderName,
        currentLocation: delivery.currentLocation,
        etaMinutes: delivery.etaMinutes,
        status: delivery.status,
        offline: delivery.offline,
        lastSeenAt: delivery.lastSeenAt ?? null,
      },
      message: spokenStatus(delivery),
    });
  }

  return NextResponse.json({
    success: false,
    message: "I could not find a delivery for that waybill number. Please check and try again.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Accept the documented field plus the shapes agents commonly send.
    const raw = body?.waybill_id ?? body?.waybillId ?? body?.args?.waybill_id ?? body?.parameters?.waybill_id;
    return lookup(raw);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request payload." }, { status: 400 });
  }
}

// GET /api/track?waybill_id=LG-90210 — handy for curl tests and GET-style tools.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return lookup(searchParams.get("waybill_id") ?? searchParams.get("id"));
}
