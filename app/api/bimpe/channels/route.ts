import { NextResponse } from "next/server";
import { bimpeConfig, getTestCode, listChannels } from "@/lib/bimpe";

export const dynamic = "force-dynamic";

/** Read-only: which channels (WhatsApp, Instagram, telephony…) the agent can be reached on. */
export async function GET(request: Request) {
  if (!bimpeConfig().enabled) return NextResponse.json({ configured: false });
  const origin = new URL(request.url).origin;
  const [testCode, channels] = await Promise.all([
    getTestCode(origin).catch((e: Error) => ({ error: e.message })),
    listChannels(origin).catch((e: Error) => ({ error: e.message })),
  ]);
  return NextResponse.json({ configured: true, testCode, channels });
}
