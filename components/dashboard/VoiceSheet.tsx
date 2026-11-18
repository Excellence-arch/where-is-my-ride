"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Loader2, Map as MapIcon, Mic, PhoneCall, Send, Volume2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { PRIMARY_WAYBILL } from "@/lib/deliveries";

type Phase = "idle" | "listening" | "thinking" | "answer" | "error";

interface Answer {
  text: string;
  source: "bimpeai" | "local";
  waybillId?: string;
}

// Minimal typing for the Web Speech API (not in lib.dom for all browsers).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function sessionId() {
  try {
    let id = localStorage.getItem("wimr-bimpe-session");
    if (!id) {
      id = `wimr-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("wimr-bimpe-session", id);
    }
    return id;
  } catch {
    return "wimr-anon";
  }
}

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Nigerian-accented English voice when the device has one (e.g. Edge's
    // "English (Nigeria)" voices, Android en-NG); otherwise plain English.
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang.toLowerCase().replace("_", "-") === "en-ng") ??
      voices.find((v) => /nigeria/i.test(v.name)) ??
      voices.find((v) => /^en-(gb|us)$/i.test(v.lang.replace("_", "-")));
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "en-GB";
    u.rate = 0.98;
    synth.speak(u);
  } catch {
    /* no TTS available */
  }
}

const SUGGESTIONS = ["Where is my rider for LG-90210?", "What did I order on LG-90210?", "How far is waybill AB-11873?", "Track LG 44021"];

export default function VoiceSheet() {
  const open = useApp((s) => s.voiceOpen);
  const setOpen = useApp((s) => s.setVoiceOpen);
  const openTracker = useApp((s) => s.openTracker);
  const addAudit = useApp((s) => s.addAudit);
  const openCall = useApp((s) => s.openCall);

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  // Abort without letting onend submit a half-heard transcript.
  const cancelListening = () => {
    transcriptRef.current = "";
    recRef.current?.abort();
  };

  const ask = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPhase("idle");
        return;
      }
      setTranscript(query);
      setPhase("thinking");
      try {
        const res = await fetch("/api/bimpe/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, sessionId: sessionId() }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Request failed");
        setAnswer({ text: json.answer, source: json.source, waybillId: json.waybillId });
        setPhase("answer");
        speak(json.answer);
        addAudit(`AI answered voice query for ${json.waybillId ?? PRIMARY_WAYBILL}`, "call");
      } catch {
        setPhase("error");
      }
    },
    [addAudit],
  );

  const startListening = useCallback(() => {
    const rec = getRecognition();
    setAnswer(null);
    transcriptRef.current = "";
    setTranscript("");
    if (!rec) {
      setTyping(true);
      setPhase("idle");
      return;
    }
    rec.lang = "en-NG";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      transcriptRef.current = text;
      setTranscript(text);
    };
    rec.onerror = () => {
      setTyping(true);
      setPhase("idle");
    };
    rec.onend = () => {
      recRef.current = null;
      if (transcriptRef.current) ask(transcriptRef.current);
      else setPhase((p) => (p === "listening" ? "idle" : p));
    };
    recRef.current = rec;
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setTyping(true);
      setPhase("idle");
    }
  }, [ask]);

  // Auto-start listening when the sheet opens.
  useEffect(() => {
    if (open) startListening();
    else {
      transcriptRef.current = "";
      recRef.current?.abort();
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setPhase("idle");
      setTyping(false);
      setDraft("");
      setAnswer(null);
      setTranscript("");
    }
  }, [open, startListening]);

  const callMe = () => openCall(answer?.waybillId || PRIMARY_WAYBILL);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-label="BimpeAI voice assistant"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92dvh] max-w-md flex-col rounded-t-[32px] bg-white pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => info.offset.y > 120 && setOpen(false)}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-sunken" />
            <div className="flex items-center justify-between px-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand" />
                <span className="text-sm font-semibold text-ink">BimpeAI Assistant</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              {/* Orb */}
              <button
                onClick={() => (phase === "listening" ? recRef.current?.stop() : startListening())}
                aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
                className="relative flex h-40 w-40 items-center justify-center"
              >
                {phase === "listening" &&
                  [0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-full bg-brand"
                      initial={{ scale: 0.6, opacity: 0.35 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                    />
                  ))}
                <motion.span
                  animate={phase === "thinking" ? { scale: [1, 0.92, 1] } : { scale: 1 }}
                  transition={{ duration: 1, repeat: phase === "thinking" ? Infinity : 0 }}
                  className={`relative flex h-28 w-28 items-center justify-center rounded-full ${
                    phase === "answer" ? "bg-ok" : phase === "error" ? "bg-off" : "bg-brand"
                  }`}
                >
                  {phase === "thinking" ? (
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                  ) : phase === "answer" ? (
                    <Volume2 className="h-10 w-10 text-white" />
                  ) : (
                    <Mic className="h-10 w-10 text-white" />
                  )}
                </motion.span>
              </button>

              {/* Waveform bars while listening */}
              <div className="mt-6 flex h-8 items-end gap-1.5">
                {phase === "listening" &&
                  Array.from({ length: 9 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 rounded-full bg-brand"
                      animate={{ height: [8, 28, 12, 22, 8] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.08 }}
                    />
                  ))}
              </div>

              <p className="mt-2 text-sm font-medium text-faint">
                {phase === "listening" && "Listening…"}
                {phase === "thinking" && "Checking with your rider…"}
                {phase === "answer" && (answer?.source === "bimpeai" ? "BimpeAI agent" : "Live tracker")}
                {phase === "idle" && (typing ? "Type your question" : "Tap the mic to speak")}
                {phase === "error" && "Something went wrong"}
              </p>

              {transcript && <p className="mt-3 text-lg text-muted">“{transcript}”</p>}

              <AnimatePresence>
                {phase === "answer" && answer && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 w-full rounded-[28px] border border-line bg-canvas p-5 text-left"
                  >
                    <p className="text-xl font-semibold leading-snug text-ink">{answer.text}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setOpen(false);
                          openTracker(answer.waybillId || PRIMARY_WAYBILL);
                        }}
                        className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white"
                      >
                        <MapIcon className="h-4 w-4" /> Live map
                      </button>
                      <button
                        onClick={callMe}
                        className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-semibold text-ink"
                      >
                        <PhoneCall className="h-4 w-4" /> Call me
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fallback / quick input */}
            <div className="px-6 pb-6">
              {typing || phase === "error" || phase === "answer" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = draft;
                    setDraft("");
                    ask(q);
                  }}
                  className="flex h-14 items-center gap-2 rounded-2xl border border-line bg-canvas pl-4 pr-2 focus-within:border-brand"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="e.g. Where is LG-90210?"
                    className="h-full flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
                  />
                  <button
                    type="submit"
                    aria-label="Ask"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => {
                    cancelListening();
                    setTyping(true);
                    setPhase("idle");
                  }}
                  className="mx-auto flex items-center gap-2 text-sm font-medium text-muted"
                >
                  <Keyboard className="h-4 w-4" /> Type instead
                </button>
              )}
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      cancelListening();
                      ask(s);
                    }}
                    className="shrink-0 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
