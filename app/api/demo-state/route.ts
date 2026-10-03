import { NextResponse } from "next/server";
import type { DemoFlags } from "@/lib/demoState";
import { getDemoState, setDemoState } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDemoState());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { flags?: Partial<DemoFlags>; lastSeenAt?: string };
    const flags: Partial<DemoFlags> = {};
    for (const key of ["networkDrop", "heavyTraffic", "geofenceBreached"] as const) {
      if (typeof body.flags?.[key] === "boolean") flags[key] = body.flags[key];
    }
    return NextResponse.json(await setDemoState(flags, body.lastSeenAt));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
