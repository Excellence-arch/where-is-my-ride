import { NextResponse } from "next/server";
import { askAgent, bimpeConfig } from "@/lib/bimpe";
import { normalizeWaybill, PRIMARY_WAYBILL } from "@/lib/deliveries";
import { liveDelivery, spokenStatus } from "@/lib/demoState";

export const dynamic = "force-dynamic";

/**
 * Voice sheet backend. Forwards the customer's transcribed question to the
 * BimpeAI agent (which calls /api/track as its tool). If BimpeAI is not
 * configured, slow, or down, answers locally so the demo never stalls.
 */
export async function POST(request: Request) {
  let body: { query?: string; sessionId?: string; waybillId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const query = (body.query ?? "").toString().slice(0, 500).trim();
  if (!query) return NextResponse.json({ error: "Empty query" }, { status: 400 });

  const heard = normalizeWaybill(query);
  const waybillId = liveDelivery(heard) ? heard : body.waybillId || PRIMARY_WAYBILL;
  const delivery = liveDelivery(waybillId);
  const localAnswer = delivery
    ? spokenStatus(delivery)
    : "I could not find a delivery for that waybill number. Please check and try again.";

  const cfg = bimpeConfig();
  if (cfg.enabled) {
    const sessionId = (body.sessionId || "wimr-anon").replace(/[^\w-]/g, "").slice(0, 64);
    // Give the agent the waybill context explicitly so it can call its tool.
    const prompt = /[A-Z]{2}-\d{5}/.test(heard) ? query : `${query} (waybill ${waybillId})`;
    try {
      const reply = await askAgent(sessionId, prompt);
      if (reply) {
        return NextResponse.json({ answer: reply, source: "bimpeai", waybillId, delivery });
      }
      return NextResponse.json({ answer: localAnswer, source: "local", note: "BimpeAI timed out", waybillId, delivery });
    } catch (err) {
      return NextResponse.json({
        answer: localAnswer,
        source: "local",
        note: `BimpeAI unavailable: ${(err as Error).message}`,
        waybillId,
        delivery,
      });
    }
  }

  return NextResponse.json({ answer: localAnswer, source: "local", waybillId, delivery });
}
