// Hardcoded delivery data shared by the UI and the BimpeAI webhook.
// No database on purpose: demo reliability beats realism.

export type DeliveryStatus = "in_transit" | "delayed" | "arriving" | "offline";

export interface Delivery {
  waybillId: string;
  riderName: string;
  riderPhone: string;
  vehicle: string;
  currentLocation: string;
  destination: string;
  etaMinutes: number;
  status: DeliveryStatus;
}

export const activeDeliveries: Record<string, Delivery> = {
  "LG-90210": {
    waybillId: "LG-90210",
    riderName: "Segun",
    riderPhone: "+234 803 555 0142",
    vehicle: "Bajaj Boxer · KJA-482QB",
    currentLocation: "Ikeja Underbridge",
    destination: "Allen Avenue, Ikeja",
    etaMinutes: 15,
    status: "in_transit",
  },
  "LG-44021": {
    waybillId: "LG-44021",
    riderName: "Chinedu",
    riderPhone: "+234 806 555 0199",
    vehicle: "TVS Apache · LND-210XA",
    currentLocation: "Lekki Toll Gate",
    destination: "Admiralty Way, Lekki Phase 1",
    etaMinutes: 28,
    status: "in_transit",
  },
  "AB-11873": {
    waybillId: "AB-11873",
    riderName: "Musa",
    riderPhone: "+234 809 555 0117",
    vehicle: "Honda CG125 · ABJ-771KD",
    currentLocation: "Wuse Market",
    destination: "Maitama District, Abuja",
    etaMinutes: 9,
    status: "arriving",
  },
};

export const PRIMARY_WAYBILL = "LG-90210";

const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", to: "2", too: "2", three: "3",
  four: "4", for: "4", five: "5", six: "6", seven: "7", eight: "8", ate: "8", nine: "9",
};

/**
 * Turn whatever the speech-to-text produced ("l g nine oh two one oh",
 * "LG dash 90210", "lg90210") into a canonical waybill like "LG-90210".
 */
export function normalizeWaybill(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tokens = raw.toLowerCase().split(/[\s,.\-_/]+/).filter(Boolean);
  const joined = tokens
    .map((t) => (t === "dash" || t === "hyphen" ? "" : DIGIT_WORDS[t] ?? t))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = joined.match(/([A-Z]{2})(\d{5})/);
  return match ? `${match[1]}-${match[2]}` : joined;
}

export function findDelivery(raw: unknown): Delivery | undefined {
  return activeDeliveries[normalizeWaybill(raw)];
}
