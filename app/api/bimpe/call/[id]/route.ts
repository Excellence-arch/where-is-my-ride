import { NextResponse } from "next/server";
import { getCall } from "@/lib/bimpe";
import { PRIMARY_WAYBILL } from "@/lib/deliveries";
import { liveDelivery, spokenStatus } from "@/lib/demoState";

export const dynamic = "force-dynamic";

/** Simulated call timeline for demo mode (no BimpeAI key). */
function simulated(id: string) {
  const startedAt = Number(id.slice(4)) || Date.now();
  const t = (Date.now() - startedAt) / 1000;
  const d = liveDelivery(PRIMARY_WAYBILL)!;
  const script = [
    { at: 6, role: "assistant", message: "Good afternoon! This is Tolu from WhereIsMyRider. How far, abeg what's your waybill number?" },
    { at: 10, role: "user", message: "It's L G nine oh two one oh. Where my rider dey?" },
    { at: 13, role: "assistant", message: spokenStatus(d) },
    { at: 18, role: "user", message: "Wetin I order sef, and have I paid?" },
    { at: 21, role: "assistant", message: "You ordered two Refuel Max meals, one chicken wings and two Chapman from Chicken Republic. Total na sixteen thousand, seven hundred naira, and you don pay with card already." },
    { at: 25, role: "user", message: "Okay, thank you o." },
    { at: 27, role: "assistant", message: "No wahala at all! Enjoy your food, and thank you for choosing WhereIsMyRider." },
  ];
  const status = t < 4 ? "ringing" : t < 30 ? "answered" : "ended";
  return {
    id,
    simulated: true,
    status,
    duration_seconds: status === "ended" ? 26 : Math.max(0, Math.round(t - 4)),
    conversation_logs: script
      .filter((m) => m.at <= t)
      .map((m, i) => ({ id: `${id}-${i}`, role: m.role, message: m.message, created_at: new Date(startedAt + m.at * 1000).toISOString() })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.startsWith("sim-")) return NextResponse.json(simulated(id));
  try {
    const call = await getCall(id, new URL(request.url).origin);
    return NextResponse.json({
      id: call.id,
      status: call.status,
      duration_seconds: call.duration_seconds ?? null,
      error_reason: call.error_reason ?? null,
      end_reason: call.end_reason ?? null,
      conversation_logs: (call.conversation_logs ?? []).filter((m) => m.message),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
