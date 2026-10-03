import { NextResponse } from "next/server";
import { bimpeConfig, ensureAgent } from "@/lib/bimpe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Idempotently provisions the BimpeAI agent + track_delivery tool and reports
 * the result. Safe to call repeatedly; never returns the API key.
 */
export async function GET(request: Request) {
  if (!bimpeConfig().enabled) return NextResponse.json({ configured: false });
  try {
    return NextResponse.json({ configured: true, ...(await ensureAgent(new URL(request.url).origin)) });
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    return NextResponse.json({ configured: true, error: e.message, status: e.status ?? null, body: e.body ?? null }, { status: 502 });
  }
}
