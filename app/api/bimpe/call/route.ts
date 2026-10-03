import { NextResponse } from "next/server";
import { bimpeConfig, makeCall } from "@/lib/bimpe";

export const dynamic = "force-dynamic";

/** Ask the BimpeAI agent to phone the customer with a live delivery update. */
export async function POST(request: Request) {
  let body: { phone?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const digits = (body.phone ?? "").replace(/[^\d+]/g, "");
  // Accept Nigerian local format (0803...) and convert to E.164.
  const destination = digits.startsWith("+") ? digits : digits.startsWith("0") ? `+234${digits.slice(1)}` : `+${digits}`;
  if (destination.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ status: "failed", detail: "Enter a valid phone number." }, { status: 400 });
  }

  const cfg = bimpeConfig();
  if (!cfg.enabled) {
    return NextResponse.json({
      status: "simulated",
      destination,
      detail: "BimpeAI keys not configured — simulated call for the demo.",
    });
  }

  try {
    const result = await makeCall(cfg.agentId!, destination, Boolean(body.test));
    return NextResponse.json({ ...result, destination });
  } catch (err) {
    return NextResponse.json({ status: "failed", destination, detail: (err as Error).message }, { status: 502 });
  }
}
