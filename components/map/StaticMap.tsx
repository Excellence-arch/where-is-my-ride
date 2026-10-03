"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Stylised flat vector map of the Ikeja corridor. Pure inline SVG: no API
 * keys, no tiles, nothing that can fail to load on stage.
 */
interface Props {
  riderVisible: boolean;
  /** 0 = start of route, 1 = at the customer */
  progress: number;
  ghost?: boolean;
}

// Route polyline in the 400x800 viewBox.
const ROUTE: [number, number][] = [
  [70, 690],
  [70, 560],
  [165, 470],
  [165, 360],
  [255, 300],
  [255, 190],
  [330, 140],
];

function pointAt(t: number): [number, number] {
  const segs = ROUTE.slice(1).map((p, i) => {
    const a = ROUTE[i];
    return { a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  let d = Math.min(Math.max(t, 0), 1) * total;
  for (const s of segs) {
    if (d <= s.len) {
      const k = d / s.len;
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k];
    }
    d -= s.len;
  }
  return ROUTE[ROUTE.length - 1];
}

const routePath = ROUTE.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export default function StaticMap({ riderVisible, progress, ghost }: Props) {
  const [rx, ry] = pointAt(progress);
  const dest = ROUTE[ROUTE.length - 1];

  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="400" height="800" fill="#eef2f6" />

      {/* Blocks */}
      {[
        [10, 20, 120, 110], [150, 20, 90, 70], [270, 10, 120, 80], [10, 160, 90, 120], [120, 120, 100, 110],
        [290, 200, 100, 120], [10, 320, 120, 100], [200, 360, 80, 120], [300, 360, 90, 140], [10, 450, 40, 80],
        [100, 520, 50, 120], [200, 520, 190, 100], [10, 720, 120, 70], [180, 660, 210, 130],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="10" fill="#e2e8f0" />
      ))}

      {/* Parks & lagoon */}
      <rect x="300" y="520" width="90" height="100" rx="14" fill="#d1fae5" />
      <rect x="130" y="250" width="70" height="60" rx="14" fill="#d1fae5" />
      <path d="M0 610 C 60 600 90 650 130 640 L 130 700 L 0 700 Z" fill="#dbeafe" />

      {/* Roads */}
      <g stroke="#ffffff" strokeLinecap="round" fill="none">
        <path d="M0 140 H400" strokeWidth="16" />
        <path d="M0 300 H400" strokeWidth="22" />
        <path d="M0 500 H400" strokeWidth="14" />
        <path d="M0 700 H400" strokeWidth="18" />
        <path d="M70 0 V800" strokeWidth="18" />
        <path d="M165 0 V800" strokeWidth="12" />
        <path d="M255 0 V800" strokeWidth="20" />
        <path d="M350 0 V800" strokeWidth="12" />
        <path d="M0 800 L400 380" strokeWidth="14" />
      </g>

      {/* Labels */}
      <g fill="#94a3b8" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif" letterSpacing="0.5">
        <text x="262" y="292">IKORODU RD</text>
        <text x="78" y="132">OBAFEMI AWOLOWO WAY</text>
        <text x="14" y="492">MOBOLAJI BANK ANTHONY</text>
        <text x="270" y="694">AGEGE MOTOR RD</text>
      </g>

      {/* Route */}
      <path d={routePath} stroke="#bfdbfe" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <motion.path
        d={routePath}
        stroke={ghost ? "#94a3b8" : "#2563eb"}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={ghost ? "2 10" : undefined}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />

      {/* Origin */}
      <circle cx={ROUTE[0][0]} cy={ROUTE[0][1]} r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

      {/* Destination */}
      <g transform={`translate(${dest[0]} ${dest[1]})`}>
        <circle r="18" fill="#2563eb" opacity="0.15" />
        <circle r="9" fill="#0f172a" />
        <circle r="3.5" fill="#ffffff" />
      </g>

      {/* Rider */}
      <AnimatePresence>
        {riderVisible && (
          <motion.g
            key="rider"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1, x: rx, y: ry }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          >
            <motion.circle
              r="26"
              fill="#2563eb"
              initial={{ opacity: 0.25, scale: 0.6 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <circle r="16" fill="#ffffff" />
            <circle r="12" fill="#2563eb" />
            <path d="M-5 2 L0 -6 L5 2 L0 0 Z" fill="#ffffff" />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Last-known ghost pin while offline */}
      {!riderVisible && (
        <g transform={`translate(${rx} ${ry})`}>
          <circle r="12" fill="none" stroke="#64748b" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle r="4" fill="#64748b" />
        </g>
      )}
    </svg>
  );
}
