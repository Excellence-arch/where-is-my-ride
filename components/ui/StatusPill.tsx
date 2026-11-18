import type { DeliveryStatus } from "@/lib/deliveries";

const STYLES: Record<DeliveryStatus, { label: string; className: string }> = {
  in_transit: { label: "On time", className: "bg-ok-wash text-ok" },
  arriving: { label: "Arriving", className: "bg-brand-wash text-brand" },
  delayed: { label: "Running late", className: "bg-[#fff1d6] text-[#9a5b00]" },
  offline: { label: "Offline", className: "bg-sunken text-muted" },
  delivered: { label: "Delivered", className: "bg-ink text-white" },
};

export default function StatusPill({ status }: { status: DeliveryStatus }) {
  const s = STYLES[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[12px] font-semibold ${s.className}`}>{s.label}</span>;
}
