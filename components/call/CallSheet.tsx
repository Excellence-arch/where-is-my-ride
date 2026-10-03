"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Phone, PhoneCall, PhoneOff, RotateCcw, User, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { useLiveDelivery } from "@/lib/useLiveDelivery";

type CallStatus = "queued" | "ringing" | "answered" | "ended" | "busy" | "failed" | "cancelled";
type Phase = "confirm" | "dialing" | CallStatus;

interface LogLine {
  id: string;
  role: string;
  message?: string | null;
}

const TERMINAL: Phase[] = ["ended", "busy", "failed", "cancelled"];

const PHASE_COPY: Record<Phase, { title: string; sub: string }> = {
  confirm: { title: "Talk to BimpeAI", sub: "BimpeAI will ring your phone and answer any question about this order." },
  dialing: { title: "Placing your call…", sub: "Connecting to the BimpeAI voice agent" },
  queued: { title: "Call queued", sub: "Your phone will ring in a moment" },
  ringing: { title: "Ringing your phone", sub: "Pick up to talk to the BimpeAI agent" },
  answered: { title: "On call with BimpeAI", sub: "Ask about your rider, items, payment or ETA" },
  ended: { title: "Call ended", sub: "Here's what you discussed" },
  busy: { title: "Line busy", sub: "Your number was busy. Try again in a moment." },
  failed: { title: "Call failed", sub: "We couldn't connect the call." },
  cancelled: { title: "Call cancelled", sub: "The call was cancelled." },
};

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CallSheet() {
  const open = useApp((s) => s.callOpen);
  const closeCall = useApp((s) => s.closeCall);
  const sessionPhone = useApp((s) => s.phone);
  const waybillId = useApp((s) => s.selectedWaybill);
  const addAudit = useApp((s) => s.addAudit);
  const delivery = useLiveDelivery(waybillId);

  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("confirm");
  const [detail, setDetail] = useState("");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const callId = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  };

  useEffect(() => {
    if (open) {
      setPhone(sessionPhone.replace(/^\+234\s?/, "0").replace(/\s/g, ""));
      setPhase("confirm");
      setLogs([]);
      setDetail("");
      setSeconds(0);
    } else {
      stopPolling();
      callId.current = null;
    }
  }, [open, sessionPhone]);

  useEffect(() => () => stopPolling(), []);

  // Call timer while connected.
  useEffect(() => {
    if (phase !== "answered") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  const poll = useCallback(
    async (id: string, extraAfterEnd = 2) => {
      if (callId.current !== id) return;
      try {
        const res = await fetch(`/api/bimpe/call/${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = await res.json();
        if (callId.current !== id) return;
        if (res.ok && json.status) {
          setPhase(json.status as CallStatus);
          if (Array.isArray(json.conversation_logs)) setLogs(json.conversation_logs);
          if (typeof json.duration_seconds === "number" && json.status === "ended") setSeconds(json.duration_seconds);
          if (json.error_reason) setDetail(json.error_reason);
          if (TERMINAL.includes(json.status)) {
            // The transcript can land a few seconds after hang-up; fetch it a couple more times.
            if (json.status === "ended" && extraAfterEnd > 0) {
              pollTimer.current = setTimeout(() => poll(id, extraAfterEnd - 1), 3000);
            }
            return;
          }
        }
      } catch {
        /* transient network error — keep polling */
      }
      pollTimer.current = setTimeout(() => poll(id, extraAfterEnd), 2000);
    },
    [],
  );

  const startCall = async () => {
    stopPolling();
    setPhase("dialing");
    setLogs([]);
    setDetail("");
    setSeconds(0);
    try {
      const res = await fetch("/api/bimpe/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, waybillId }),
      });
      const json = await res.json();
      if (json.status === "initiated" && json.call_id) {
        callId.current = json.call_id;
        setSimulated(Boolean(json.simulated));
        setPhase("queued");
        addAudit(`BimpeAI calling ${json.destination} about ${waybillId}`, "call");
        poll(json.call_id);
      } else {
        setPhase(json.status === "busy" ? "busy" : "failed");
        setDetail(json.detail || "BimpeAI could not place the call.");
      }
    } catch {
      setPhase("failed");
      setDetail("Network error — check your connection.");
    }
  };

  const live = phase === "queued" || phase === "ringing" || phase === "answered" || phase === "dialing";
  const copy = PHASE_COPY[phase];
  const phoneValid = phone.replace(/\D/g, "").length >= 10;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !live && closeCall()}
          />
          <motion.div
            role="dialog"
            aria-label="Call BimpeAI"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-[32px] bg-white pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.08)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between px-6 pt-4">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${phase === "answered" ? "bg-emerald-500" : "bg-blue-600"}`} />
                <span className="text-sm font-semibold text-slate-900">BimpeAI Voice Call</span>
                {simulated && live && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">DEMO</span>
                )}
              </div>
              <button
                onClick={closeCall}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center px-6 pt-6 text-center">
              {/* Status orb */}
              <div className="relative flex h-28 w-28 items-center justify-center">
                {(phase === "ringing" || phase === "queued" || phase === "dialing") &&
                  [0, 1].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-full bg-blue-600"
                      initial={{ scale: 0.7, opacity: 0.3 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                    />
                  ))}
                <motion.span
                  animate={phase === "ringing" ? { rotate: [0, -12, 12, -8, 8, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.9, repeat: phase === "ringing" ? Infinity : 0, repeatDelay: 0.6 }}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full ${
                    phase === "answered"
                      ? "bg-emerald-500"
                      : TERMINAL.includes(phase) && phase !== "ended"
                        ? "bg-rose-500"
                        : phase === "ended"
                          ? "bg-slate-800"
                          : "bg-blue-600"
                  }`}
                >
                  {phase === "dialing" ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : TERMINAL.includes(phase) ? (
                    <PhoneOff className="h-8 w-8 text-white" />
                  ) : (
                    <PhoneCall className="h-8 w-8 text-white" />
                  )}
                </motion.span>
              </div>

              <p className="mt-4 text-xl font-bold text-slate-900">{copy.title}</p>
              <p className="mt-1 text-sm text-slate-500">{detail && TERMINAL.includes(phase) && phase !== "ended" ? detail : copy.sub}</p>
              {(phase === "answered" || (phase === "ended" && seconds > 0)) && (
                <p className="mt-2 font-mono text-lg font-semibold text-slate-900">{formatDuration(seconds)}</p>
              )}
            </div>

            {/* Order context */}
            {delivery && (
              <div className="mx-6 mt-5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-700">
                  {delivery.riderName[0]}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-mono text-sm font-bold text-slate-900">{delivery.waybillId}</p>
                  <p className="truncate text-xs text-slate-500">
                    {delivery.merchant} · Rider {delivery.riderName}
                  </p>
                </div>
              </div>
            )}

            {/* Transcript */}
            {logs.length > 0 && (
              <div className="mx-6 mt-4 max-h-[34dvh] space-y-2 overflow-y-auto">
                {logs.map((l) => {
                  const agent = l.role === "assistant" || l.role === "agent";
                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 ${agent ? "" : "flex-row-reverse"}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          agent ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {agent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </span>
                      <p
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-left text-sm ${
                          agent ? "rounded-bl-md bg-slate-100 text-slate-900" : "rounded-br-md bg-blue-600 text-white"
                        }`}
                      >
                        {l.message}
                      </p>
                    </motion.div>
                  );
                })}
                <div ref={transcriptEnd} />
              </div>
            )}

            <div className="px-6 pb-6 pt-5">
              {phase === "confirm" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (phoneValid) startCall();
                  }}
                >
                  <label htmlFor="call-phone" className="text-sm font-medium text-slate-500">
                    Ring this number
                  </label>
                  <div className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <input
                      id="call-phone"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s]/g, "").slice(0, 16))}
                      placeholder="0803 555 0142"
                      className="h-full flex-1 bg-transparent text-lg font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={!phoneValid}
                    className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <PhoneCall className="h-5 w-5" /> Call me now
                  </motion.button>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Ask things like “Where is my rider?”, “What did I order?” or “Have I paid?”
                  </p>
                </form>
              ) : TERMINAL.includes(phase) ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={startCall}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white"
                  >
                    <RotateCcw className="h-4 w-4" /> Call again
                  </button>
                  <button
                    onClick={closeCall}
                    className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">
                  Keep this screen open to see the live transcript. You can close it any time.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
