import { NextResponse } from "next/server";
import { getCustomer, upsertCustomer } from "@/lib/server/store";
import { cleanName, cleanPhone } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Is this phone already registered? Returns the saved name if so. */
export async function GET(request: Request) {
  const phone = cleanPhone(new URL(request.url).searchParams.get("phone"));
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  return NextResponse.json({ customer: (await getCustomer(phone)) ?? null });
}

/** Register (or sign in) a customer by phone + name. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = cleanPhone(body.phone);
  const name = cleanName(body.name);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Enter your name (letters only, 2–60 characters)." }, { status: 400 });
  return NextResponse.json({ customer: await upsertCustomer(phone, name) });
}
