"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Gauge,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  Play,
  Radio,
  Square,
  Wand2,
} from "lucide-react";
import { activeDeliveries, orderTotal, type Delivery } from "@/lib/deliveries";
import type { TripSnapshot } from "@/lib/demoState";
import { bearing, etaMinutes, haversine, stepTowards, type LatLng } from "@/lib/geo";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });

const RIDER_KEY = "wimr-rider-waybill";
const SEND_EVERY_MS = 4000;
const SEND_EVERY_M = 15;
const SIM_TICK_MS = 2000;
const SIM_SPEED_MPS = 12; // ~43 km/h: quick enough to watch the 2 km alert fire on stage

type Phase = "idle" | "starting" | "sharing" | "delivered";

interface Fix extends LatLng {
  accuracyM?: number | null;
  speedMps?: number | null;
  heading?: number | null;
  simulated?: boolean;
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function readSaved() {
  try {
    return localStorage.getItem(RIDER_KEY);
  } catch {
    return null;
  }
}

function save(v: string | null) {
  try {
    if (v) localStorage.setItem(RIDER_KEY, v);
    else localStorage.removeItem(RIDER_KEY);
  } catch {
    /* private mode */
  }
}

export default function RiderApp() {
  const [waybillId, setWaybillId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readSaved();
    if (saved && activeDeliveries[saved]) setWaybillId(saved);
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-dvh bg-slate-50" />;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-slate-50">
      <AnimatePresence mode="wait">
        {waybillId ? (
          <motion.div key="trip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RiderTrip
              delivery={activeDeliveries[waybillId]}
              onSignOut={() => {
                save(null);
                setWaybillId(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RiderSignIn
              onPick={(id) => {
                save(id);
                setWaybillId(id);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function RiderSignIn({ onPick }: { onPick: (waybillId: string) => void }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-14">
      <a href="/" className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Customer app
      </a>
      <div className="mt-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
          <Bike className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">WhereIsMyRider · Rider</p>
          <p className="text-sm text-slate-500">Share your live location with customers.</p>
        </div>
      </div>
      <h1 className="mt-10 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Who&apos;s riding today?</h1>
      <p className="mt-2 text-slate-500">Pick your profile to see your assigned delivery.</p>

      <div className="mt-6 space-y-3">
        {Object.values(activeDeliveries).map((d) => (
          <motion.button
            key={d.waybillId}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPick(d.waybillId)}
            className="flex w-full items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
              {d.riderName[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900">{d.riderName}</span>
              <span className="block truncate text-sm text-slate-500">{d.vehicle}</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-500">{d.waybillId}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function RiderTrip({ delivery: d, onSignOut }: { delivery: Delivery; onSignOut: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [trip, setTrip] = useState<TripSnapshot | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [, setNow] = useState(0);

  const watchId = useRef<number | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const lastSent = useRef<{ at: number; pos: LatLng } | null>(null);
  const tripRef = useRef<TripSnapshot | null>(null);
  tripRef.current = trip;

  const dest: LatLng = { lat: trip?.destLat ?? d.destLat, lng: trip?.destLng ?? d.destLng };
  const distM = fix ? haversine(fix, dest) : null;

  // Re-render every second so "last synced" stays fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Restore an in-progress trip after a reload.
  useEffect(() => {
    fetch(`/api/rider/trip?waybillId=${d.waybillId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { trip: TripSnapshot | null }) => {
        if (!j.trip) return;
        setTrip(j.trip);
        if (j.trip.lat != null && j.trip.lng != null) setFix({ lat: j.trip.lat, lng: j.trip.lng, heading: j.trip.heading });
        if (j.trip.status === "delivered") setPhase("delivered");
      })
      .catch(() => {});
  }, [d.waybillId]);

  const stopWatching = useCallback(() => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    if (simTimer.current) clearInterval(simTimer.current);
    simTimer.current = null;
    setSimulating(false);
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const keepAwake = async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      /* not supported — the rider must keep the screen on */
    }
  };

  const send = useCallback(
    async (f: Fix, force = false) => {
      const now = Date.now();
      const prev = lastSent.current;
      if (!force && prev && now - prev.at < SEND_EVERY_MS && haversine(prev.pos, f) < SEND_EVERY_M) return;
      lastSent.current = { at: now, pos: { lat: f.lat, lng: f.lng } };
      try {
        const res = await fetch("/api/rider/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybillId: d.waybillId, ...f }),
        });
        if (res.status === 409) {
          setError("This trip was ended elsewhere. Start it again to keep sharing.");
          stopWatching();
          setPhase("idle");
          return;
        }
        const j = await res.json();
        if (j.trip) setTrip(j.trip);
        setLastSentAt(Date.now());
        setError(null);
      } catch {
        setError("No network. Your location will sync when you're back online.");
      }
    },
    [d.waybillId, stopWatching],
  );

  const onPosition = useCallback(
    (p: GeolocationPosition) => {
      const f: Fix = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracyM: p.coords.accuracy,
        speedMps: p.coords.speed,
        heading: p.coords.heading,
      };
      setFix(f);
      send(f);
    },
    [send],
  );

  const beginTrip = async (first: Fix) => {
    const res = await fetch("/api/rider/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waybillId: d.waybillId, action: "start", ...first }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Could not start trip");
    setTrip(j.trip);
    setFix(first);
    lastSent.current = { at: Date.now(), pos: first };
    setLastSentAt(Date.now());
    setPhase("sharing");
    keepAwake();
    return j.trip as TripSnapshot;
  };

  const startGps = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This device can't share GPS. Use Demo drive instead.");
      return;
    }
    setPhase("starting");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await beginTrip({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy, speedMps: p.coords.speed, heading: p.coords.heading });
          watchId.current = navigator.geolocation.watchPosition(onPosition, (e) => setError(gpsError(e)), {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 20000,
          });
        } catch (e) {
          setError((e as Error).message);
          setPhase("idle");
        }
      },
      (e) => {
        setError(gpsError(e));
        setPhase("idle");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Demo drive: glide toward the drop-off so the customer map moves on stage.
  const startSimulation = async () => {
    setError(null);
    stopWatching();
    let current: Fix = fix ?? { lat: d.startLat, lng: d.startLng };
    try {
      if (phase !== "sharing") await beginTrip({ ...current, simulated: true });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setSimulating(true);
    keepAwake();
    simTimer.current = setInterval(() => {
      const t = tripRef.current;
      const target = { lat: t?.destLat ?? d.destLat, lng: t?.destLng ?? d.destLng };
      const next = stepTowards(current, target, (SIM_SPEED_MPS * SIM_TICK_MS) / 1000);
      const f: Fix = { ...next, heading: bearing(current, target), speedMps: SIM_SPEED_MPS, accuracyM: 8, simulated: true };
      current = f;
      setFix(f);
      send(f, true);
      if (haversine(next, target) < 25 && simTimer.current) {
        clearInterval(simTimer.current);
        simTimer.current = null;
        setSimulating(false);
      }
    }, SIM_TICK_MS);
  };

  const finish = async (action: "delivered" | "stop") => {
    stopWatching();
    try {
      const res = await fetch("/api/rider/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waybillId: d.waybillId, action }),
      });
      const j = await res.json();
      setTrip(j.trip ?? null);
    } catch {
      /* best effort */
    }
    setPhase(action === "delivered" ? "delivered" : "idle");
    setConfirmDeliver(false);
  };

  const sharing = phase === "sharing";
  const secondsAgo = lastSentAt ? Math.round((Date.now() - lastSentAt) / 1000) : null;
  const total = orderTotal(d);
  const payOnDelivery = /on delivery/i.test(d.payment);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Map */}
      <div className="relative h-[42dvh] w-full bg-slate-100">
        <LeafletMap rider={fix} dest={dest} padTop={72} padBottom={24} />
        <div className="absolute inset-x-4 top-4 z-[500] flex items-center gap-3 rounded-[24px] border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700">
            {d.riderName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Hi {d.riderName}</p>
            <p className="truncate text-xs text-slate-500">{d.vehicle}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              sharing ? "bg-emerald-100 text-emerald-800" : phase === "delivered" ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-white"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sharing ? "animate-pulse bg-emerald-600" : phase === "delivered" ? "bg-slate-500" : "bg-white"}`} />
            {sharing ? (simulating ? "Demo drive" : "Sharing live") : phase === "delivered" ? "Delivered" : "Not sharing"}
          </span>
          <button onClick={onSignOut} aria-label="Switch rider" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="-mt-6 flex-1 space-y-3 rounded-t-[28px] bg-slate-50 px-4 pb-10 pt-5">
        {/* Live stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Navigation} label="To drop-off" value={distM != null ? `${(distM / 1000).toFixed(1)} km` : "—"} />
          <Stat icon={Gauge} label="ETA" value={distM != null ? `${etaMinutes(distM, fix?.speedMps)} min` : "—"} />
          <Stat
            icon={LocateFixed}
            label={sharing ? "Last sync" : "GPS"}
            value={sharing ? (secondsAgo != null ? `${secondsAgo}s ago` : "…") : fix?.accuracyM ? `±${Math.round(fix.accuracyM)} m` : "Off"}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-800"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        {trip?.demoDest && phase !== "delivered" && (
          <p className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
            You&apos;re far from {d.destination}, so a demo drop-off 3 km from your start point is used for ETA and the 2 km alert.
          </p>
        )}

        {/* Delivery */}
        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Deliver to</p>
              <p className="font-semibold text-slate-900">{d.customerName}</p>
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {d.destination}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-500">{d.waybillId}</span>
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
            {d.items.map((i) => (
              <p key={i.name} className="flex justify-between text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-400" /> {i.qty} × {i.name}
                </span>
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">{payOnDelivery ? "Collect on delivery" : "Already paid"}</span>
            <span className={`font-bold ${payOnDelivery ? "text-amber-700" : "text-slate-900"}`}>{naira(total)}</span>
          </div>
          <a
            href={`tel:${d.customerPhone}`}
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900"
          >
            <Phone className="h-4 w-4" /> Call customer
          </a>
        </div>

        {/* Actions */}
        {phase === "delivered" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[24px] bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-sm font-semibold">Delivered. The customer has been notified.</p>
            </div>
            <button onClick={startGps} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900">
              <Play className="h-4 w-4" /> Start this trip again
            </button>
          </div>
        ) : sharing ? (
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setConfirmDeliver(true)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white"
            >
              <CheckCircle2 className="h-5 w-5" /> Mark as delivered
            </motion.button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={simulating ? () => { stopWatching(); setPhase("sharing"); } : startSimulation}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900"
              >
                <Wand2 className="h-4 w-4" /> {simulating ? "Pause demo" : "Demo drive"}
              </button>
              <button
                onClick={() => finish("stop")}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900"
              >
                <Square className="h-4 w-4" /> Stop sharing
              </button>
            </div>
            {!simulating && watchId.current == null && (
              <button onClick={startGps} className="w-full text-center text-sm font-medium text-blue-600">
                Resume real GPS
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={startGps}
              disabled={phase === "starting"}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white disabled:bg-blue-400"
            >
              <Radio className="h-5 w-5" /> {phase === "starting" ? "Getting your location…" : "Start trip & share live location"}
            </motion.button>
            <button
              onClick={startSimulation}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900"
            >
              <Wand2 className="h-4 w-4" /> Demo drive (simulated GPS)
            </button>
            <p className="text-center text-xs text-slate-400">Keep this screen open while riding so your location keeps updating.</p>
          </div>
        )}
      </div>

      {/* Confirm delivered */}
      <AnimatePresence>
        {confirmDeliver && (
          <>
            <motion.div className="fixed inset-0 z-[1000] bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeliver(false)} />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[1001] mx-auto max-w-md rounded-t-[32px] bg-white p-6 pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <p className="text-lg font-bold text-slate-900">Confirm delivery</p>
              <p className="mt-1 text-sm text-slate-500">
                {payOnDelivery ? `Make sure you've collected ${naira(total)} from ${d.customerName}.` : `Hand the package to ${d.customerName}.`}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => setConfirmDeliver(false)} className="h-12 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900">
                  Cancel
                </button>
                <button onClick={() => finish("delivered")} className="h-12 rounded-2xl bg-emerald-600 text-sm font-semibold text-white">
                  Yes, delivered
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function gpsError(e: GeolocationPositionError) {
  if (e.code === e.PERMISSION_DENIED) return "Location permission is blocked. Allow location for this site in your browser settings, or use Demo drive.";
  if (e.code === e.POSITION_UNAVAILABLE) return "Can't get a GPS fix here. Move to an open area, or use Demo drive.";
  return "GPS is taking too long. Try again, or use Demo drive.";
}
