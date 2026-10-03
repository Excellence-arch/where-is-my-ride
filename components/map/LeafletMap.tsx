"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap, Marker, Polyline, Circle } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Point {
  lat: number;
  lng: number;
}

interface Props {
  rider?: (Point & { heading?: number | null; accuracyM?: number | null }) | null;
  dest: Point;
  /** Grey "last known" pin instead of the live blue one. */
  ghost?: boolean;
  /** Extra bottom padding (px) so overlays don't cover the route. */
  padBottom?: number;
  padTop?: number;
  className?: string;
}

const riderHtml = (ghost: boolean, heading?: number | null) => `
  <div class="relative flex h-12 w-12 items-center justify-center">
    ${ghost ? "" : '<span class="absolute inset-0 animate-ping rounded-full bg-blue-600 opacity-20"></span>'}
    <span class="relative flex h-8 w-8 items-center justify-center rounded-full border-4 border-white ${
      ghost ? "bg-slate-400" : "bg-blue-600"
    } shadow-[0_4px_14px_rgb(0,0,0,0.25)]">
      <svg viewBox="0 0 24 24" width="14" height="14" style="transform: rotate(${heading ?? 0}deg)">
        <path d="M12 3 L19 20 L12 16 L5 20 Z" fill="white"/>
      </svg>
    </span>
  </div>`;

const destHtml = `
  <div class="flex h-10 w-10 items-center justify-center">
    <span class="flex h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-slate-900 shadow-[0_4px_14px_rgb(0,0,0,0.25)]">
      <span class="h-2 w-2 rounded-full bg-white"></span>
    </span>
  </div>`;

/**
 * Flat, key-less live map (Leaflet + CARTO light tiles). Leaflet touches
 * `window`, so it is loaded lazily inside the effect.
 */
export default function LeafletMap({ rider, dest, ghost = false, padBottom = 0, padTop = 0, className }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<LMap | null>(null);
  const layers = useRef<{ rider?: Marker; dest?: Marker; line?: Polyline; acc?: Circle }>({});
  const L = useRef<typeof import("leaflet") | null>(null);
  const fitted = useRef(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, { zoomControl: false, attributionControl: true }).setView([dest.lat, dest.lng], 14);
      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        })
        .addTo(m);
      map.current = m;
      draw();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layers.current = {};
      fitted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers whenever the data changes.
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider?.lat, rider?.lng, rider?.heading, rider?.accuracyM, dest.lat, dest.lng, ghost]);

  function draw() {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m) return;
    const l = layers.current;

    const destIcon = leaflet.divIcon({ html: destHtml, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
    if (!l.dest) l.dest = leaflet.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(m);
    else l.dest.setLatLng([dest.lat, dest.lng]);

    if (rider) {
      const icon = leaflet.divIcon({ html: riderHtml(ghost, rider.heading), className: "", iconSize: [48, 48], iconAnchor: [24, 24] });
      if (!l.rider) l.rider = leaflet.marker([rider.lat, rider.lng], { icon, zIndexOffset: 1000 }).addTo(m);
      else l.rider.setLatLng([rider.lat, rider.lng]).setIcon(icon);

      const pts: [number, number][] = [
        [rider.lat, rider.lng],
        [dest.lat, dest.lng],
      ];
      const style = { color: ghost ? "#94a3b8" : "#2563eb", weight: 5, dashArray: "2 10", lineCap: "round" as const };
      if (!l.line) l.line = leaflet.polyline(pts, style).addTo(m);
      else l.line.setLatLngs(pts).setStyle(style);

      const acc = Math.min(rider.accuracyM ?? 0, 300);
      if (acc > 15 && !ghost) {
        if (!l.acc) l.acc = leaflet.circle([rider.lat, rider.lng], { radius: acc, color: "#2563eb", weight: 0, fillOpacity: 0.08 }).addTo(m);
        else l.acc.setLatLng([rider.lat, rider.lng]).setRadius(acc);
      } else if (l.acc) {
        l.acc.remove();
        l.acc = undefined;
      }

      const bounds = leaflet.latLngBounds(pts).pad(0.25);
      const opts = { paddingTopLeft: [24, padTop + 24] as [number, number], paddingBottomRight: [24, padBottom + 24] as [number, number], maxZoom: 17 };
      // Fit on first fix, then only when the rider drifts out of view.
      if (!fitted.current || !m.getBounds().contains([rider.lat, rider.lng])) {
        m.fitBounds(bounds, opts);
        fitted.current = true;
      }
    } else {
      for (const k of ["rider", "line", "acc"] as const) {
        l[k]?.remove();
        l[k] = undefined;
      }
      m.setView([dest.lat, dest.lng], 15);
    }
  }

  return <div ref={el} className={className ?? "absolute inset-0 z-0"} />;
}
