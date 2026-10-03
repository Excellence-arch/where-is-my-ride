import { NextResponse } from "next/server";
import { getCall } from "@/lib/bimpe";
import { PRIMARY_WAYBILL } from "@/lib/deliveries";
import { spokenStatus, type LiveDelivery } from "@/lib/demoState";
import { getLiveDelivery } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Simulated call timeline for demo mode (no BimpeAI key). */
function simulated(id: string, d: LiveDelivery) {
  const startedAt = Number(id.slice(4)) || Date.now();
  const t = (Date.now() - startedAt) / 1000;
  const script = [
    { at: 6, role: "assistant", message: "Good afternoon, this is Tolu from WhereIsMyRider. How may I help you today? May I have your waybill number, please?" },
    { at: 10, role: "user", message: "It's L G nine oh two one oh. Where is my rider?" },
    { at: 13, role: "assistant", message: spokenStatus(d) },
    { at: 18, role: "user", message: "What did I order, and have I paid?" },
    { at: 21, role: "assistant", message: "You ordered two Refuel Max meals, one portion of chicken wings and two Chapmans from Chicken Republic. The total is sixteen thousand, seven hundred naira, and it has already been paid by card." },
    { at: 25, role: "user", message: "Okay, thank you." },
    { at: 27, role: "assistant", message: "You're welcome. Enjoy your meal, and thank you for choosing WhereIsMyRider." },
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
  if (id.startsWith("sim-")) return NextResponse.json(simulated(id, (await getLiveDelivery(PRIMARY_WAYBILL))!));
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
