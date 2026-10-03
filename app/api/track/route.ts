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

/** Parse whatever the agent sends: JSON, form-encoded, or nothing (query string only). */
async function readArgs(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  const query = Object.fromEntries(new URL(request.url).searchParams);
  // Logged (truncated) so tool-call shapes are visible in Vercel runtime logs.
  console.log("[track] content-type=%s body=%s query=%j", request.headers.get("content-type"), raw.slice(0, 500), query);
  let body: unknown = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = Object.fromEntries(new URLSearchParams(raw));
    }
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const nested = (b.args ?? b.parameters ?? b.arguments ?? b.input ?? b.body) as unknown;
  const inner = typeof nested === "string" ? safeJson(nested) : (nested as Record<string, unknown> | undefined);
  const merged: Record<string, unknown> = { ...query, ...b, ...(inner ?? {}) };
  // Drop unfilled template placeholders such as "{{phone_number}}".
  for (const [k, v] of Object.entries(merged)) {
    if (typeof v === "string" && /^\s*\{+\s*\w+\s*\}+\s*$/.test(v)) delete merged[k];
  }
  return merged;
}

function safeJson(s: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const args = await readArgs(request);
  return lookup(
    args.waybill_id ?? args.waybillId ?? args.waybill,
    args.phone_number ?? args.phoneNumber ?? args.phone,
  );
}

// GET /api/track?waybill_id=LG-90210 (or ?phone_number=...) — curl tests and GET-style tools.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return lookup(searchParams.get("waybill_id") ?? searchParams.get("id"), searchParams.get("phone_number"));
}
