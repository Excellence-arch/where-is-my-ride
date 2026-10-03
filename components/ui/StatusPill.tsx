import type { DeliveryStatus } from "@/lib/deliveries";

const STYLES: Record<DeliveryStatus, { label: string; className: string; dot: string }> = {
  in_transit: { label: "On the way", className: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  arriving: { label: "Arriving", className: "bg-blue-100 text-blue-800", dot: "bg-blue-600" },
  delayed: { label: "Traffic delay", className: "bg-amber-100 text-amber-800", dot: "bg-amber-600" },
  offline: { label: "Signal lost", className: "bg-slate-800 text-white", dot: "bg-white" },
};

export default function StatusPill({ status }: { status: DeliveryStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
