import { NextResponse } from "next/server";
import { getDemoState, getTrips } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Customer app poll: live rider trips + God Mode state. */
export async function GET() {
  const [trips, state] = await Promise.all([getTrips().catch(() => []), getDemoState()]);
  return NextResponse.json(
    { state, trips: Object.fromEntries(trips.filter((t) => t.status !== "idle").map((t) => [t.waybillId, t])) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
