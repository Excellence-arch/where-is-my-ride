"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bike, Loader2, Navigation, ShieldCheck, User } from "lucide-react";
import { useApp } from "@/lib/store";

type Step = "phone" | "otp" | "name";

const slide = {
  initial: { y: 48, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -48, opacity: 0 },
  transition: { type: "spring", stiffness: 380, damping: 32 },
} as const;

export default function SplashToAuth() {
  const login = useApp((s) => s.login);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 10;
  const displayPhone = `+234 ${digits.replace(/^0/, "")}`;
  const nameValid = fullName.trim().length >= 2;

  const register = async (name: string) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: displayPhone, name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save your details.");
    login(displayPhone, json.customer.name);
  };

  useEffect(() => {
    // Any 4 digits = verified (mock OTP). Returning customers go straight in;
    // new ones are asked for their name first.
    if (!otp.every((d) => d.length === 1) || step !== "otp") return;
    let cancelled = false;
    setBusy(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/customers?phone=${encodeURIComponent(displayPhone)}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.customer?.name) await register(json.customer.name);
        else setStep("name");
      } catch {
        if (!cancelled) setStep("name");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // Pasted the whole code.
      const next = clean.slice(0, 4).split("");
      setOtp([0, 1, 2, 3].map((k) => next[k] ?? ""));
      otpRefs.current[Math.min(next.length, 3)]?.focus();
      return;
    }
    setOtp((prev) => prev.map((d, k) => (k === i ? clean : d)));
    if (clean && i < 3) otpRefs.current[i + 1]?.focus();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-6 pb-10 pt-14">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-[12px] bg-brand">
          <Navigation className="size-5 text-white" strokeWidth={2.4} />
        </div>
        <p className="text-[18px] font-bold tracking-[-0.02em] text-ink">WhereIsMyRider</p>
      </div>

      <div className="mt-14">
        <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
          {step === "phone" ? (
            <>
              Stop calling
              <br />
              your rider.{" "}
              <span className="mt-2 inline-block -rotate-2 rounded-[16px] bg-brand px-3 pb-1 text-white">Just ask.</span>
            </>
          ) : step === "otp" ? (
           "Enter your code"
          ) : (
           "What's your name?"
          )}
        </h1>
        <p className="mt-4 text-[16px] text-muted">
          {step === "phone"
            ? "Sign in or sign up with your phone number."
            : step === "otp"
              ? `We sent a 4-digit code to ${displayPhone}.`
              : "So your rider and our assistant know who they're delivering to."}
        </p>
      </div>

      <div className="relative mt-10 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.form
              key="phone"
              {...slide}
              onSubmit={(e) => {
                e.preventDefault();
                if (phoneValid) setStep("otp");
              }}
              className="rounded-[28px] border border-line bg-white p-5"
            >
              <label htmlFor="phone" className="text-sm font-medium text-muted">
                Phone number
              </label>
              <div className="mt-2 flex h-16 items-center gap-3 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:bg-white">
                <span className="shrink-0 whitespace-nowrap text-lg font-semibold text-ink">🇳🇬 +234</span>
                <span className="h-6 w-px bg-sunken" />
                <input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="803 555 0142"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 14))}
                  className="h-full w-full bg-transparent text-lg font-semibold tracking-wide text-ink outline-none placeholder:font-normal placeholder:text-faint"
                  autoFocus
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!phoneValid}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-white transition-colors disabled:bg-sunken disabled:text-faint"
              >
                Send code <ArrowRight className="h-5 w-5" />
              </motion.button>
            </motion.form>
          ) : step === "otp" ? (
            <motion.div
              key="otp"
              {...slide}
              className="rounded-[28px] border border-line bg-white p-5"
            >
              <div className="flex justify-between gap-3">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    autoFocus={i === 0}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                    }}
                    className={`h-16 w-full rounded-2xl border text-center text-2xl font-bold text-ink outline-none transition-colors ${
                      d ? "border-brand bg-white" : "border-line bg-canvas"
                    } focus:border-brand focus:bg-white`}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setOtp(["", "", "", ""]);
                    setStep("phone");
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted"
                >
                  <ArrowLeft className="h-4 w-4" /> Change number
                </button>
                <span className="flex items-center gap-1.5 text-sm text-faint">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Demo: any 4 digits
                </span>
              </div>
            </motion.div>
          ) : null}
          {step === "name" && (
            <motion.form
              key="name"
              {...slide}
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nameValid || busy) return;
                setBusy(true);
                setError("");
                try {
                  await register(fullName);
                } catch (err) {
                  setError((err as Error).message);
                  setBusy(false);
                }
              }}
              className="rounded-[28px] border border-line bg-white p-5"
            >
              <label htmlFor="fullname" className="text-sm font-medium text-muted">
                Full name
              </label>
              <div className="mt-2 flex h-16 items-center gap-3 rounded-2xl border border-line bg-canvas px-4 focus-within:border-brand focus-within:bg-white">
                <User className="h-5 w-5 text-faint" />
                <input
                  id="fullname"
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="e.g. Adaeze Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value.slice(0, 60))}
                  className="h-full w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:font-normal placeholder:text-faint"
                  autoFocus
                />
              </div>
              {error && <p className="mt-3 text-sm font-medium text-off">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!nameValid || busy}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-white transition-colors disabled:bg-sunken disabled:text-faint"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create account <ArrowRight className="h-5 w-5" /></>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <a
        href="/rider"
        className="mb-4 flex items-center justify-center gap-2 rounded-full border border-line bg-white py-3.5 text-sm font-semibold text-ink"
      >
        <Bike className="h-4 w-4" /> I&apos;m a rider
      </a>
      <p className="flex items-center justify-center gap-1.5 text-xs text-faint">
        <ShieldCheck className="h-4 w-4" /> Voice by BimpeAI
      </p>
    </div>
  );
}
