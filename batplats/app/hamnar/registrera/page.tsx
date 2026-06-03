"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { AuthOAuthDivider, GoogleOAuthButton } from "@/components/google-oauth-button";
import { createClient } from "@/lib/supabase/client";

const NAVY = "#0a1628";
const TEAL = "#0d9488";

const inputClass =
  "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition bg-white text-gray-900 placeholder-gray-400";

const BENEFITS = [
  { icon: "👥", text: "Nå tusentals båtägare varje säsong" },
  { icon: "💰", text: "Säker betalning direkt till ditt konto" },
  { icon: "📱", text: "Hantera allt enkelt i din dashboard" },
  { icon: "⭐", text: "Bygg förtroende med omdömen" },
] as const;

function HarbourSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingTypeParam = searchParams.get("type") || "marina";
  const [type, setType] = useState(listingTypeParam === "private" ? "private" : "marina");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setType(listingTypeParam === "private" ? "private" : "marina");
  }, [listingTypeParam]);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Registreringen tog för lång tid, försök igen");
    }, 5000);

    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            listing_type: type,
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          role: "host",
          full_name: name,
        });

        if (profileError) {
          setError(profileError.message);
          return;
        }
      }

      router.push("/dashboard/host");
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden flex-col justify-between p-12 lg:flex lg:w-5/12"
        style={{ background: NAVY }}
      >
        <Link href="/" className="text-xl font-bold text-white">
          Båtplats.nu
        </Link>

        <div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white">
            Välkommen till Sveriges båtplatsmarknad
          </h1>
          <p className="mb-10 text-lg text-gray-400">Registrera dig och börja ta emot bokningar direkt.</p>

          <div className="space-y-5">
            {BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                  {benefit.icon}
                </div>
                <p className="text-gray-300">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 p-5">
          <p className="mb-3 text-sm italic text-gray-300">
            &ldquo;Vi fyllde alla våra platser inom första veckan på Båtplats.nu!&rdquo;
          </p>
          <p className="text-sm font-medium text-teal-400">— Bockholmens Marina</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 lg:px-16">
        <Link href="/" className="mb-8 text-xl font-bold lg:hidden" style={{ color: NAVY }}>
          Båtplats.nu
        </Link>

        <div className="mx-auto w-full max-w-md">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Jag är:</p>
          <div className="mb-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("marina")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                type === "marina"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="mb-2 block text-2xl">🏗️</span>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>
                Hamnägare
              </p>
              <p className="mt-0.5 text-xs text-gray-500">Marina eller klubb</p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/hyr-ut")}
              className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-teal-500"
            >
              <span className="mb-2 block text-2xl">🚤</span>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>
                Privatperson
              </p>
              <p className="mt-0.5 text-xs text-gray-500">Privat plats →</p>
            </button>
          </div>

          <h2 className="mb-6 text-2xl font-bold" style={{ color: NAVY }}>
            Skapa ditt konto
          </h2>

          <GoogleOAuthButton newUserRole="host" />
          <div className="my-5">
            <AuthOAuthDivider />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Namn</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className={inputClass}
                placeholder="Ditt namn eller marinans namn"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className={inputClass}
                placeholder="din@email.se"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className={inputClass}
                placeholder="Minst 6 tecken"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: TEAL }}
            >
              {loading ? "Skapar konto..." : "Skapa konto & kom igång →"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Har du redan ett konto?{" "}
            <Link href="/hamnar/logga-in" className="font-medium text-teal-600 hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HarbourSignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-gray-600">
          <p className="text-sm font-medium">Laddar...</p>
        </main>
      }
    >
      <HarbourSignupContent />
    </Suspense>
  );
}
