import { NextResponse } from "next/server";
import { bimpeConfig, ensureAgent, makeCall } from "@/lib/bimpe";
import { PRIMARY_WAYBILL } from "@/lib/deliveries";
import { liveDelivery, setCallContext } from "@/lib/demoState";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Normalise Nigerian local (0803…) or international input to E.164. */
function toE164(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

/**
 * Start a phone call from the BimpeAI agent to the customer. The agent
 * answers questions about their order, looking it up via /api/track.
 */
export async function POST(request: Request) {
  let body: { phone?: string; waybillId?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "failed", detail: "Invalid payload" }, { status: 400 });
  }

  const destination = toE164(body.phone ?? "");
  if (destination.replace(/\D/g, "").length < 11) {
    return NextResponse.json({ status: "failed", detail: "Enter a valid phone number." }, { status: 400 });
  }
  const waybillId = liveDelivery(body.waybillId ?? "") ? body.waybillId! : PRIMARY_WAYBILL;
  // Lets the agent's tool resolve "my order" from the number it is calling.
  setCallContext(destination, waybillId);

  if (!bimpeConfig().enabled) {
    return NextResponse.json({
      status: "initiated",
      call_id: `sim-${Date.now()}`,
      simulated: true,
      destination,
      waybillId,
      detail: "BimpeAI key not configured — simulated call for the demo.",
    });
  }

  try {
    const setup = await ensureAgent(new URL(request.url).origin);
    // Test calls: no phone number is linked to the agent yet.
    const result = await makeCall(setup.agentId, destination, body.test ?? true);
    return NextResponse.json(
      { ...result, destination, waybillId, agentName: setup.agentName },
      { status: result.status === "failed" ? 502 : 200 },
    );
  } catch (err) {
    return NextResponse.json({ status: "failed", destination, detail: (err as Error).message }, { status: 502 });
  }
}
