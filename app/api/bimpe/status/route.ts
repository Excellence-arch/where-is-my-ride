import { NextResponse } from "next/server";
import { bimpeConfig, listAgents } from "@/lib/bimpe";

export const dynamic = "force-dynamic";

/** Health check for the BimpeAI connection. Never returns the key. */
export async function GET() {
  const cfg = bimpeConfig();
  if (!cfg.enabled) return NextResponse.json({ configured: false });
  const started = Date.now();
  try {
    const agents = await listAgents();
    return NextResponse.json({
      configured: true,
      reachable: true,
      latencyMs: Date.now() - started,
      agentIdFromEnv: cfg.agentId ?? null,
      agents,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ configured: true, reachable: false, status: e.status ?? null, error: e.message });
  }
}
