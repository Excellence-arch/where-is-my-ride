import { NextResponse } from "next/server";
import { getServerFlags, setServerFlags, type DemoFlags } from "@/lib/demoState";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getServerFlags());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { flags?: Partial<DemoFlags>; lastSeenAt?: string };
    const flags: Partial<DemoFlags> = {};
    for (const key of ["networkDrop", "heavyTraffic", "geofenceBreached"] as const) {
      if (typeof body.flags?.[key] === "boolean") flags[key] = body.flags[key];
    }
    return NextResponse.json(setServerFlags(flags, body.lastSeenAt));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
