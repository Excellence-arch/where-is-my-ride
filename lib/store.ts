"use client";

import { create } from "zustand";
import { DEFAULT_FLAGS, type DemoFlags } from "./demoState";
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
  selectedWaybill: string;
  voiceOpen: boolean;
  callOpen: boolean;
  godModeUnlocked: boolean;
  godModeOpen: boolean;
  flags: DemoFlags;
  lastSeenAt?: string;
  audit: AuditEntry[];
  toast: Toast | null;

  login: (phone: string) => void;
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

function persistSession(phone: string | null) {
  try {
    if (phone) localStorage.setItem(SESSION_KEY, phone);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) — session just won't persist */
  }
}

export function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
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

export const useApp = create<AppState>((set, get) => ({
  screen: "auth",
  phone: "",
  selectedWaybill: PRIMARY_WAYBILL,
  voiceOpen: false,
  callOpen: false,
  godModeUnlocked: false,
  godModeOpen: false,
  flags: { ...DEFAULT_FLAGS },
  audit: SEED_AUDIT,
  toast: null,

  login: (phone) => {
    persistSession(phone);
    set({ phone, screen: "dashboard" });
  },
  logout: () => {
    persistSession(null);
    set({ phone: "", screen: "auth", voiceOpen: false, callOpen: false });
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
    set({ flags, lastSeenAt });
    syncFlags(flags, lastSeenAt);
    get().addAudit(
      on ? "MTN signal lost on Segun's device — holding last known location" : "Segun back online — live tracking restored",
      "network",
    );
  },
  toggleTraffic: () => {
    const on = !get().flags.heavyTraffic;
    const flags = { ...get().flags, heavyTraffic: on };
    set({ flags });
    syncFlags(flags);
    get().addAudit(
      on ? "AI recalibrated ETA: heavy traffic on Ikorodu Road (+20 mins)" : "Traffic cleared — ETA restored to 15 mins",
      "traffic",
    );
  },
  triggerGeofence: () => {
    const flags = { ...get().flags, geofenceBreached: true };
    set({ flags });
    syncFlags(flags);
    get().showToast("Rider Approaching", "Segun is 2 minutes away.");
    get().addAudit("Geofence breached — customer auto-notified (2km radius)", "geofence");
  },
  resetDemo: () => {
    const flags = { ...DEFAULT_FLAGS };
    set({ flags, lastSeenAt: undefined, toast: null });
    syncFlags(flags, "");
  },
  addAudit: (text, kind) =>
    set((s) => ({ audit: [{ id: `${Date.now()}-${Math.random()}`, text, time: nowLabel(), kind }, ...s.audit].slice(0, 12) })),
  showToast: (title, body) => set({ toast: { id: Date.now(), title, body } }),
  dismissToast: () => set({ toast: null }),
}));
