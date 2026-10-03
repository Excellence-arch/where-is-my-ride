"use client";

import { create } from "zustand";
import { DEFAULT_FLAGS, type DemoFlags, type DemoState, type TripSnapshot } from "./demoState";
import { PRIMARY_WAYBILL } from "./deliveries";

export type Screen = "auth" | "dashboard" | "map";

export interface AuditEntry {
  id: string;
  text: string;
  time: string;
  kind: "ai" | "network" | "traffic" | "geofence" | "call";
}

export interface Toast {
  id: number;
  title: string;
  body: string;
}

interface AppState {
  screen: Screen;
  phone: string;
  name: string;
  selectedWaybill: string;
  voiceOpen: boolean;
  callOpen: boolean;
  godModeUnlocked: boolean;
  godModeOpen: boolean;
  flags: DemoFlags;
  lastSeenAt?: string;
  audit: AuditEntry[];
  toast: Toast | null;
  /** Live rider trips from the server, keyed by waybill. */
  trips: Record<string, TripSnapshot>;
  /** When God Mode was last changed locally (server sync waits a moment after). */
  flagsChangedAt: number;

  login: (phone: string, name: string) => void;
  logout: () => void;
  go: (screen: Screen) => void;
  openTracker: (waybillId: string) => void;
  setVoiceOpen: (open: boolean) => void;
  /** Open the "BimpeAI calls me" sheet, optionally for a specific waybill. */
  openCall: (waybillId?: string) => void;
  closeCall: () => void;
  unlockGodMode: () => void;
  setGodModeOpen: (open: boolean) => void;
  toggleNetworkDrop: () => void;
  toggleTraffic: () => void;
  triggerGeofence: () => void;
  resetDemo: () => void;
  addAudit: (text: string, kind: AuditEntry["kind"]) => void;
  showToast: (title: string, body: string) => void;
  dismissToast: () => void;
  /** Apply a /api/live poll result. */
  applyServer: (trips: Record<string, TripSnapshot>, state: DemoState) => void;
}

export const nowLabel = () =>
  new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });

const SEED_AUDIT: AuditEntry[] = [
  { id: "s1", text: "AI intercepted rider call — confirmed gate code with Segun", time: "2:05 PM", kind: "ai" },
  { id: "s2", text: "AI rerouted Chinedu around Lekki–Epe traffic", time: "1:48 PM", kind: "traffic" },
  { id: "s3", text: "AI answered customer voice query for AB-11873", time: "1:32 PM", kind: "call" },
  { id: "s4", text: "Rider Musa reconnected after Glo network drop", time: "1:10 PM", kind: "network" },
];

const SESSION_KEY = "wimr-session";

export interface Session {
  phone: string;
  name: string;
}

function persistSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) — session just won't persist */
  }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    // Sessions from before names were collected must register again.
    return s && typeof s.phone === "string" && typeof s.name === "string" && s.name ? (s as Session) : null;
  } catch {
    return null;
  }
}

/** Mirror God Mode to the server so the BimpeAI agent's answers match the screen. */
function syncFlags(flags: DemoFlags, lastSeenAt?: string) {
  fetch("/api/demo-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flags, lastSeenAt }),
  }).catch(() => {});
}

/** Name of whoever is riding the hero order (a registered rider, or the demo "Segun"). */
const heroRider = (trips: Record<string, TripSnapshot>) => trips[PRIMARY_WAYBILL]?.riderName?.split(" ")[0] ?? "Segun";

export const useApp = create<AppState>((set, get) => ({
  screen: "auth",
  phone: "",
  name: "",
  selectedWaybill: PRIMARY_WAYBILL,
  voiceOpen: false,
  callOpen: false,
  godModeUnlocked: false,
  godModeOpen: false,
  flags: { ...DEFAULT_FLAGS },
  audit: SEED_AUDIT,
  toast: null,
  trips: {},
  flagsChangedAt: 0,

  login: (phone, name) => {
    persistSession({ phone, name });
    set({ phone, name, screen: "dashboard" });
  },
  logout: () => {
    persistSession(null);
    set({ phone: "", name: "", screen: "auth", voiceOpen: false, callOpen: false });
  },
  go: (screen) => set({ screen }),
  openTracker: (waybillId) => set({ selectedWaybill: waybillId, screen: "map" }),
  setVoiceOpen: (voiceOpen) => set({ voiceOpen }),
  openCall: (waybillId) =>
    set((s) => ({ callOpen: true, voiceOpen: false, selectedWaybill: waybillId ?? s.selectedWaybill })),
  closeCall: () => set({ callOpen: false }),
  unlockGodMode: () => set({ godModeUnlocked: true, godModeOpen: true }),
  setGodModeOpen: (godModeOpen) => set({ godModeOpen }),

  toggleNetworkDrop: () => {
    const on = !get().flags.networkDrop;
    const lastSeenAt = on ? nowLabel() : get().lastSeenAt;
    const flags = { ...get().flags, networkDrop: on };
    set({ flags, lastSeenAt, flagsChangedAt: Date.now() });
    syncFlags(flags, lastSeenAt);
    get().addAudit(
      on
        ? `MTN signal lost on ${heroRider(get().trips)}'s device — holding last known location`
        : `${heroRider(get().trips)} back online — live tracking restored`,
      "network",
    );
  },
  toggleTraffic: () => {
    const on = !get().flags.heavyTraffic;
    const flags = { ...get().flags, heavyTraffic: on };
    set({ flags, flagsChangedAt: Date.now() });
    syncFlags(flags);
    get().addAudit(
      on ? "AI recalibrated ETA: heavy traffic on Ikorodu Road (+20 mins)" : "Traffic cleared — ETA restored to 15 mins",
      "traffic",
    );
  },
  triggerGeofence: () => {
    const flags = { ...get().flags, geofenceBreached: true };
    set({ flags, flagsChangedAt: Date.now() });
    syncFlags(flags);
    get().showToast("Rider Approaching", `${heroRider(get().trips)} is 2 minutes away.`);
    get().addAudit("Geofence breached — customer auto-notified (2km radius)", "geofence");
  },
  resetDemo: () => {
    const flags = { ...DEFAULT_FLAGS };
    set({ flags, lastSeenAt: undefined, toast: null, flagsChangedAt: Date.now() });
    syncFlags(flags, "");
  },
  addAudit: (text, kind) =>
    set((s) => ({ audit: [{ id: `${Date.now()}-${Math.random()}`, text, time: nowLabel(), kind }, ...s.audit].slice(0, 12) })),
  showToast: (title, body) => set({ toast: { id: Date.now(), title, body } }),
  dismissToast: () => set({ toast: null }),
  applyServer: (trips, state) =>
    set((s) =>
      // Don't let a poll that started before a local toggle undo it.
      Date.now() - s.flagsChangedAt < 4000
        ? { trips }
        : { trips, flags: state.flags, lastSeenAt: state.lastSeenAt },
    ),
}));
