"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const DEMO_PASSWORD = "0000";

function hasDemoAccess() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith("demo_access=granted"));
}

export default function DemoAccessPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (hasDemoAccess()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    setTimeout(() => {
      if (password === DEMO_PASSWORD) {
        document.cookie = "demo_access=granted; path=/; max-age=86400";
        router.push("/");
      } else {
        setError("Fel lösenord. Försök igen.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0d3b5e 50%, #0a2540 100%)",
        }}
      >
        <div
          className="absolute animate-pulse rounded-full opacity-20 blur-3xl"
          style={{
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, #0d9488 0%, transparent 70%)",
            top: "-100px",
            right: "-100px",
            animationDuration: "4s",
          }}
        />
        <div
          className="absolute animate-pulse rounded-full opacity-15 blur-3xl"
          style={{
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, #0d9488 0%, transparent 70%)",
            bottom: "-50px",
            left: "-50px",
            animationDuration: "6s",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-lg px-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease",
        }}
      >
        <div className="mb-10 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />
            <span className="text-sm font-medium text-white/80">Investor Preview</span>
          </div>

          <h1 className="mb-3 text-5xl font-bold tracking-tight text-white">Båtplats.nu</h1>
          <p className="text-lg text-white/50">Sveriges marketplace för båtplatser</p>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { value: "14+", label: "Aktiva platser" },
            { value: "2+", label: "Partnerhamnar" },
            { value: "2026", label: "Säsongsstart" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 p-4 text-center backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="mb-1 text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="rounded-3xl border border-white/10 p-8 backdrop-blur-md"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-bold text-white">Preview</h2>
            <p className="text-sm text-white/50">Ange lösenordet för att fortsätta</p>
          </div>

          <div className="relative mb-4">
            <input
              id="demo-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••"
              autoComplete="current-password"
              className="w-full rounded-2xl border-2 px-5 py-4 text-center text-2xl font-bold tracking-widest text-white transition-all placeholder-white/20 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderColor: error ? "#ef4444" : password ? "#0d9488" : "rgba(255,255,255,0.15)",
              }}
              autoFocus
            />
          </div>

          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <svg
                className="h-4 w-4 flex-shrink-0 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !password}
            className="group relative w-full overflow-hidden rounded-2xl py-4 text-lg font-bold text-white transition-all disabled:opacity-30"
            style={{
              background: loading ? "#0d9488" : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
              }}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Verifierar...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Utforska plattformen</span>
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
