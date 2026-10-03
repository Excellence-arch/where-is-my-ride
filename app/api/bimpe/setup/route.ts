import { NextResponse } from "next/server";
import { bimpeConfig, ensureAgent, listTrackTools } from "@/lib/bimpe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Can the outside world (i.e. BimpeAI) reach /api/track, or is it behind Vercel protection? */
async function probeWebhook(baseUrl?: string) {
  if (!baseUrl) return { ok: false, detail: "no public URL" };
  try {
    const res = await fetch(`${baseUrl}/api/track?waybill_id=LG-90210`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const json = await res.json().catch(() => null);
    return { ok: res.ok && json?.success === true, status: res.status };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

/**
 * Idempotently provisions the BimpeAI agent + track_delivery tool and reports
 * the result. Safe to call repeatedly; never returns the API key.
 */
export async function GET(request: Request) {
  if (!bimpeConfig().enabled) return NextResponse.json({ configured: false });
  try {
    const setup = await ensureAgent(new URL(request.url).origin);
    const tools = await listTrackTools(setup.agentId).catch((e: Error) => e.message);
    return NextResponse.json({ configured: true, ...setup, tools, webhookReachable: await probeWebhook(setup.toolBaseUrl) });
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    return NextResponse.json({ configured: true, error: e.message, status: e.status ?? null, body: e.body ?? null }, { status: 502 });
  }
}
