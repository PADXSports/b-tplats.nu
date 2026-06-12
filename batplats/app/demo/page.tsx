"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const DEMO_PASSWORD = "0000";
const TEAL = "#0d9488";

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
  const [shake, setShake] = useState(false);
  const [stats, setStats] = useState({
    listings: "0",
    marinas: "0",
    cities: "0",
  });

  useEffect(() => {
    if (hasDemoAccess()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const supabase = createClient();
      const [listingsResult, availableResult] = await Promise.all([
        supabase
          .from("listings")
          .select("harbour_name, city, owner_id, harbours!inner(owner_id)")
          .not("owner_id", "is", null)
          .not("harbours.owner_id", "is", null),
        supabase
          .from("listings")
          .select("id, harbours!inner(owner_id)", { count: "exact", head: true })
          .eq("is_available", true)
          .not("owner_id", "is", null)
          .not("harbours.owner_id", "is", null),
      ]);

      if (listingsResult.error) console.error(listingsResult.error);
      if (availableResult.error) console.error(availableResult.error);

      const uniqueHarbours = new Set(
        listingsResult.data?.map((listing) => listing.harbour_name).filter(Boolean),
      ).size;
      const uniqueCities = new Set(
        listingsResult.data?.map((listing) => listing.city).filter(Boolean),
      ).size;
      const availableCount = availableResult.count ?? 0;

      setStats({
        marinas: uniqueHarbours.toLocaleString("sv-SE"),
        listings: availableCount.toLocaleString("sv-SE"),
        cities: uniqueCities.toLocaleString("sv-SE"),
      });
    };

    void loadStats();
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
        setError("Fel lösenord");
        setLoading(false);
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
      }
    }, 600);
  };

  const statItems = [
    { value: stats.listings, label: "Tillgängliga platser" },
    { value: stats.marinas, label: "Partnerhamnar" },
    { value: stats.cities, label: "Städer" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
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
        className="relative z-10 w-full max-w-[480px] px-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease",
        }}
      >
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-white">Båtplats.nu</h1>
          <p className="text-lg text-white/50">Sveriges marketplace för båtplatser</p>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-4">
          {statItems.map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 p-4 text-center backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="mb-1 text-2xl font-bold text-white">
                {stat.value}
                {Number(stat.value.replace(/\s/g, "")) > 0 ? "+" : ""}
              </p>
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
            <h2 className="mb-2 text-xl font-bold text-white">Förhandsvisning</h2>
            <p className="text-sm text-white/50">Ange lösenordet för att fortsätta</p>
          </div>

          <div className="mb-4">
            <div className={shake ? "demo-shake" : ""}>
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
                  borderColor: error ? "#ef4444" : password ? TEAL : "rgba(255,255,255,0.15)",
                }}
                autoFocus
              />
            </div>
            {error ? <p className="mt-2 text-center text-sm text-red-400">{error}</p> : null}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: TEAL }}
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Verifierar...</span>
              </>
            ) : (
              <>
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
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes demoShake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-6px);
          }
          40%,
          80% {
            transform: translateX(6px);
          }
        }
        .demo-shake {
          animation: demoShake 0.45s ease;
        }
      `}</style>
    </div>
  );
}
