import { NextResponse } from "next/server";
import { findByPhone, normalizeWaybill, orderSummary } from "@/lib/deliveries";
import { liveDelivery, spokenStatus, waybillForPhone } from "@/lib/demoState";

// BimpeAI voice-agent webhook (the agent's `track_delivery` tool). Pure
// in-memory lookup so it answers in milliseconds, well inside the agent's
// 2-second tool budget.
export const dynamic = "force-dynamic";

function resolveWaybill(rawId: unknown, rawPhone: unknown): string {
  const byId = normalizeWaybill(rawId);
  if (liveDelivery(byId)) return byId;
  if (typeof rawPhone === "string" && rawPhone.trim()) {
    return waybillForPhone(rawPhone) ?? findByPhone(rawPhone)?.waybillId ?? byId;
  }
  return byId;
}

function lookup(rawId: unknown, rawPhone?: unknown) {
  const delivery = liveDelivery(resolveWaybill(rawId, rawPhone));

  if (delivery) {
    return NextResponse.json({
      success: true,
      data: {
        waybillId: delivery.waybillId,
        orderId: delivery.orderId,
        riderName: delivery.riderName,
        riderPhone: delivery.riderPhone,
        currentLocation: delivery.currentLocation,
        destination: delivery.destination,
        etaMinutes: delivery.etaMinutes,
        status: delivery.status,
        offline: delivery.offline,
        lastSeenAt: delivery.lastSeenAt ?? null,
        merchant: delivery.merchant,
        items: delivery.items,
        payment: delivery.payment,
      },
      message: spokenStatus(delivery),
      order_summary: orderSummary(delivery),
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
    // Accept the documented fields plus the shapes agents commonly send.
    const args = body?.args ?? body?.parameters ?? body?.arguments ?? body;
    return lookup(args?.waybill_id ?? args?.waybillId, args?.phone_number ?? args?.phoneNumber);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request payload." }, { status: 400 });
  }
}

// GET /api/track?waybill_id=LG-90210 (or ?phone_number=...) — curl tests and GET-style tools.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return lookup(searchParams.get("waybill_id") ?? searchParams.get("id"), searchParams.get("phone_number"));
}
