/** Shared input checks for registration routes. */
export function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 60 && /^[\p{L}\p{M}' .-]+$/u.test(name) ? name : null;
}

export function cleanPhone(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function cleanPlate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const plate = v.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return plate.length >= 3 && plate.length <= 12 ? plate : null;
}

export const VEHICLE_TYPES = ["Motorbike", "Bicycle", "Car", "Tricycle", "Van"] as const;
