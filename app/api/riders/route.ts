import { NextResponse } from "next/server";
import { getRider, listAssignments, upsertRider } from "@/lib/server/store";
import { cleanName, cleanPhone, cleanPlate, VEHICLE_TYPES } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Rider profile for a phone (null if not registered) + who holds each delivery. */
export async function GET(request: Request) {
  const phone = cleanPhone(new URL(request.url).searchParams.get("phone"));
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const [rider, assignments] = await Promise.all([getRider(phone), listAssignments()]);
  return NextResponse.json({ rider: rider ?? null, assignments });
}

/** Register a rider: name, vehicle type and plate number. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = cleanPhone(body.phone);
  const name = cleanName(body.name);
  const plate = cleanPlate(body.plate);
  const vehicleType = VEHICLE_TYPES.find((v) => v === body.vehicleType);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Enter your full name (letters only)." }, { status: 400 });
  if (!vehicleType) return NextResponse.json({ error: "Choose your vehicle type." }, { status: 400 });
  if (!plate) return NextResponse.json({ error: "Enter a valid plate number, e.g. KJA-482QB." }, { status: 400 });
  return NextResponse.json({ rider: await upsertRider({ phone, name, vehicleType, plate }) });
}
