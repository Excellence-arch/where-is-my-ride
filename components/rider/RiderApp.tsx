"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  Loader2,
  User,
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

const RIDER_KEY = "wimr-rider-session";
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

interface RiderProfile {
  phone: string;
  name: string;
  vehicleType: string;
  plate: string;
  waybillId: string | null;
}

const VEHICLES = ["Motorbike", "Bicycle", "Car", "Tricycle", "Van"] as const;

function readSaved(): string | null {
  try {
    return localStorage.getItem(RIDER_KEY);
  } catch {
    return null;
  }
}

function save(phone: string | null) {
  try {
    if (phone) localStorage.setItem(RIDER_KEY, phone);
    else localStorage.removeItem(RIDER_KEY);
  } catch {
    /* private mode */
  }
}

async function fetchRider(phone: string) {
  const res = await fetch(`/api/riders?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Could not load your profile.");
  return json as { rider: RiderProfile | null; assignments: Record<string, string> };
}

export default function RiderApp() {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const phone = readSaved();
    if (!phone) {
      setReady(true);
      return;
    }
    setSavedPhone(phone);
    fetchRider(phone)
      .then(({ rider }) => setRider(rider))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="min-h-dvh bg-slate-50" />;

  const signOut = () => {
    save(null);
    setRider(null);
    setSavedPhone(null);
  };

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-slate-50">
      <AnimatePresence mode="wait">
        {rider?.waybillId && activeDeliveries[rider.waybillId] ? (
          <motion.div key={`trip-${rider.waybillId}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RiderTrip
              delivery={activeDeliveries[rider.waybillId]}
              rider={rider}
              onSignOut={signOut}
              onSwitchJob={() => setRider({ ...rider, waybillId: null })}
            />
          </motion.div>
        ) : rider ? (
          <motion.div key="jobs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <JobPicker rider={rider} onAssigned={setRider} onSignOut={signOut} />
          </motion.div>
        ) : (
          <motion.div key="auth" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RiderAuth
              initialPhone={savedPhone ?? ""}
              onReady={(r) => {
                save(r.phone);
                setRider(r);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

const card = "rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]";
const field =
  "mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white";
const input = "h-full w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400";
const primary =
  "mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400";

/** Phone → mock OTP → (new riders) name, vehicle, plate. */
function RiderAuth({ initialPhone, onReady }: { initialPhone: string; onReady: (r: RiderProfile) => void }) {
  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
  const [phone, setPhone] = useState(initialPhone.replace(/^234/, "0"));
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLES)[number]>("Motorbike");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "");
  const e164 = `+234${digits.replace(/^(234|0)/, "")}`;

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const { rider } = await fetchRider(e164);
      if (rider) onReady(rider);
      else setStep("register");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164, name, vehicleType, plate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not register.");
      onReady(json.rider);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-14">
      <a href="/app" className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500">
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
      <h1 className="mt-10 text-[28px] font-bold leading-tight tracking-tight text-slate-900">
        {step === "phone" ? "Rider sign in" : step === "otp" ? "Enter your code" : "Register as a rider"}
      </h1>
      <p className="mt-2 text-slate-500">
        {step === "phone"
          ? "Use your phone number to sign in or register."
          : step === "otp"
            ? `We sent a 4-digit code to ${e164}.`
            : "Tell us who you are and what you ride."}
      </p>

      <div className="mt-8">
        {step === "phone" && (
          <form
            className={card}
            onSubmit={(e) => {
              e.preventDefault();
              if (digits.length >= 10) setStep("otp");
            }}
          >
            <label htmlFor="rphone" className="text-sm font-medium text-slate-500">
              Phone number
            </label>
            <div className={field}>
              <Phone className="h-5 w-5 text-slate-400" />
              <input
                id="rphone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0802 555 0177"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s+]/g, "").slice(0, 16))}
                className={input}
                autoFocus
              />
            </div>
            <button type="submit" disabled={digits.length < 10} className={primary}>
              Send code
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            className={card}
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length === 4) verify();
            }}
          >
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="4-digit code"
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setOtp(v);
                if (v.length === 4) setTimeout(verify, 200);
              }}
              placeholder="• • • •"
              className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl font-bold tracking-[0.6em] text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
              autoFocus
            />
            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setOtp(""); setStep("phone"); }} className="flex items-center gap-1.5 font-medium text-slate-500">
                <ArrowLeft className="h-4 w-4" /> Change number
              </button>
              <span className="flex items-center gap-1.5 text-slate-400">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Demo: any 4 digits
              </span>
            </div>
          </form>
        )}

        {step === "register" && (
          <form
            className={card}
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) register();
            }}
          >
            <label htmlFor="rname" className="text-sm font-medium text-slate-500">
              Full name
            </label>
            <div className={field}>
              <User className="h-5 w-5 text-slate-400" />
              <input
                id="rname"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="e.g. Segun Adebayo"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                className={input}
                autoFocus
              />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">Vehicle</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VEHICLES.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVehicleType(v)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    vehicleType === v ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <label htmlFor="rplate" className="mt-5 block text-sm font-medium text-slate-500">
              Plate number
            </label>
            <div className={field}>
              <Bike className="h-5 w-5 text-slate-400" />
              <input
                id="rplate"
                autoCapitalize="characters"
                placeholder="e.g. KJA-482QB"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 12))}
                className={`${input} uppercase`}
              />
            </div>
            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
            <button type="submit" disabled={busy || name.trim().length < 2 || plate.trim().length < 3} className={primary}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Registered rider claims one of the open deliveries. */
function JobPicker({
  rider,
  onAssigned,
  onSignOut,
}: {
  rider: RiderProfile;
  onAssigned: (r: RiderProfile) => void;
  onSignOut: () => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRider(rider.phone)
      .then((j) => setAssignments(j.assignments))
      .catch(() => {});
  }, [rider.phone]);

  const claim = async (waybillId: string) => {
    setBusy(waybillId);
    setError("");
    try {
      const res = await fetch("/api/riders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: rider.phone, waybillId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not pick up this delivery.");
      onAssigned(json.rider);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-14">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
          {rider.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Welcome, {rider.name.split(" ")[0]}</p>
          <p className="truncate text-sm text-slate-500">
            {rider.vehicleType} · {rider.plate}
          </p>
        </div>
        <button onClick={onSignOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <h1 className="mt-10 text-[28px] font-bold leading-tight tracking-tight text-slate-900">Pick up a delivery</h1>
      <p className="mt-2 text-slate-500">Choose the order you&apos;re carrying. The customer will see your name and live location.</p>
      {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      <div className="mt-6 space-y-3">
        {Object.values(activeDeliveries).map((d) => {
          const holder = assignments[d.waybillId];
          const mine = holder === rider.name;
          return (
            <motion.button
              key={d.waybillId}
              whileTap={{ scale: 0.98 }}
              disabled={busy !== null}
              onClick={() => claim(d.waybillId)}
              className="w-full rounded-[24px] border border-slate-100 bg-white p-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-900">{d.waybillId}</span>
                {busy === d.waybillId ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : holder ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${mine ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {mine ? "Yours" : `With ${holder.split(" ")[0]}`}
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Open</span>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {d.destination}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {d.merchant} · {d.items.reduce((n, i) => n + i.qty, 0)} item{d.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RiderTrip({
  delivery: d,
  rider,
  onSignOut,
  onSwitchJob,
}: {
  delivery: Delivery;
  rider: RiderProfile;
  onSignOut: () => void;
  onSwitchJob: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [trip, setTrip] = useState<TripSnapshot | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [customer, setCustomer] = useState<{ name: string; phone: string } | null>(null);
  const customerName = customer?.name ?? d.customerName;
  const customerPhone = customer?.phone ?? d.customerPhone;
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
      .then((j: { trip: TripSnapshot | null; customer: { name: string; phone: string } | null }) => {
        if (j.customer) setCustomer(j.customer);
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
            {rider.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">Hi {rider.name.split(" ")[0]}</p>
            <p className="truncate text-xs text-slate-500">
              {rider.vehicleType} · {rider.plate}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              sharing ? "bg-emerald-100 text-emerald-800" : phase === "delivered" ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-white"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sharing ? "animate-pulse bg-emerald-600" : phase === "delivered" ? "bg-slate-500" : "bg-white"}`} />
            {sharing ? (simulating ? "Demo drive" : "Sharing live") : phase === "delivered" ? "Delivered" : "Not sharing"}
          </span>
          <button onClick={onSignOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
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
              <p className="font-semibold text-slate-900">{customerName}</p>
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {d.destination}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-500">{d.waybillId}</span>
              {!sharing && (
                <button onClick={onSwitchJob} className="block text-xs font-semibold text-blue-600">
                  Change job
                </button>
              )}
            </div>
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
            href={`tel:${customerPhone}`}
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
                {payOnDelivery ? `Make sure you've collected ${naira(total)} from ${customerName}.` : `Hand the package to ${customerName}.`}
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
