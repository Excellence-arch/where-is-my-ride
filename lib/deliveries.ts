// Hardcoded delivery data shared by the UI and the BimpeAI webhook.
// No database on purpose: demo reliability beats realism.

export type DeliveryStatus = "in_transit" | "delayed" | "arriving" | "offline" | "delivered";

export interface OrderItem {
  name: string;
  qty: number;
  priceNaira: number;
}

export interface Delivery {
  waybillId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  merchant: string;
  items: OrderItem[];
  deliveryFeeNaira: number;
  payment: string;
  orderedAt: string;
  pickupFrom: string;
  riderName: string;
  riderPhone: string;
  vehicle: string;
  currentLocation: string;
  destination: string;
  /** Drop-off coordinates. */
  destLat: number;
  destLng: number;
  /** Where the rider is in the static (no-GPS) demo. */
  startLat: number;
  startLng: number;
  etaMinutes: number;
  status: DeliveryStatus;
}

export const activeDeliveries: Record<string, Delivery> = {
  "LG-90210": {
    waybillId: "LG-90210",
    orderId: "ORD-58213",
    customerName: "Adaeze Okafor",
    customerPhone: "+2348035550142",
    merchant: "Jumia Food · Chicken Republic Ikeja",
    items: [
      { name: "Refuel Max meal", qty: 2, priceNaira: 4500 },
      { name: "Chicken wings (6 pcs)", qty: 1, priceNaira: 3800 },
      { name: "Chapman (large)", qty: 2, priceNaira: 1200 },
    ],
    deliveryFeeNaira: 1500,
    payment: "Paid online with card",
    orderedAt: "1:52 PM",
    pickupFrom: "Chicken Republic, Obafemi Awolowo Way",
    riderName: "Segun",
    riderPhone: "+234 802 555 0177",
    vehicle: "Bajaj Boxer · KJA-482QB",
    currentLocation: "Ikeja Underbridge",
    destination: "Allen Avenue, Ikeja",
    destLat: 6.6018,
    destLng: 3.3515,
    startLat: 6.5793,
    startLng: 3.3658,
    etaMinutes: 15,
    status: "in_transit",
  },
  "LG-44021": {
    waybillId: "LG-44021",
    orderId: "ORD-58190",
    customerName: "Adaeze Okafor",
    customerPhone: "+2348035550142",
    merchant: "Konga · Slot Lekki",
    items: [{ name: "Tecno Spark 30 (128GB)", qty: 1, priceNaira: 189000 }],
    deliveryFeeNaira: 3000,
    payment: "Pay on delivery (transfer or POS)",
    orderedAt: "11:20 AM",
    pickupFrom: "Slot, Lekki Phase 1",
    riderName: "Chinedu",
    riderPhone: "+234 806 555 0199",
    vehicle: "TVS Apache · LND-210XA",
    currentLocation: "Lekki Toll Gate",
    destination: "Admiralty Way, Lekki Phase 1",
    destLat: 6.4474,
    destLng: 3.4723,
    startLat: 6.4386,
    startLng: 3.4519,
    etaMinutes: 28,
    status: "in_transit",
  },
  "AB-11873": {
    waybillId: "AB-11873",
    orderId: "ORD-58177",
    customerName: "Adaeze Okafor",
    customerPhone: "+2348035550142",
    merchant: "Glovo · HealthPlus Pharmacy Wuse",
    items: [
      { name: "Vitamin C 1000mg", qty: 2, priceNaira: 6500 },
      { name: "Paracetamol (pack)", qty: 1, priceNaira: 900 },
    ],
    deliveryFeeNaira: 1200,
    payment: "Paid online with transfer",
    orderedAt: "12:45 PM",
    pickupFrom: "HealthPlus, Wuse 2",
    riderName: "Musa",
    riderPhone: "+234 809 555 0117",
    vehicle: "Honda CG125 · ABJ-771KD",
    currentLocation: "Wuse Market",
    destination: "Maitama District, Abuja",
    destLat: 9.0882,
    destLng: 7.4934,
    startLat: 9.0643,
    startLng: 7.4728,
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

export function orderTotal(d: Delivery) {
  return d.items.reduce((sum, i) => sum + i.qty * i.priceNaira, 0) + d.deliveryFeeNaira;
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** One-paragraph order summary the voice agent can read from. */
export function orderSummary(d: Delivery) {
  const items = d.items.map((i) => `${i.qty} × ${i.name} (${naira(i.priceNaira)} each)`).join(", ");
  return `Order ${d.orderId} from ${d.merchant}, placed at ${d.orderedAt}: ${items}. Delivery fee ${naira(
    d.deliveryFeeNaira,
  )}, total ${naira(orderTotal(d))}. Payment: ${d.payment}. Picked up from ${d.pickupFrom}, delivering to ${
    d.destination
  }. Rider ${d.riderName} (${d.vehicle}), phone ${d.riderPhone}.`;
}

/** Most recent active order for a phone number (demo: falls back to the hero order). */
export function findByPhone(raw: unknown): Delivery | undefined {
  const digits = typeof raw === "string" ? raw.replace(/\D/g, "").replace(/^0/, "234") : "";
  if (digits.length < 10) return undefined;
  const tail = digits.slice(-10);
  return (
    Object.values(activeDeliveries).find((d) => d.customerPhone.replace(/\D/g, "").endsWith(tail)) ??
    activeDeliveries[PRIMARY_WAYBILL]
  );
}

export function findDelivery(raw: unknown): Delivery | undefined {
  return activeDeliveries[normalizeWaybill(raw)];
}
