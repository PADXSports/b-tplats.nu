"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

export default function HarbourLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState<"renter" | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRoleMismatch(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Inloggning tog för lång tid, försök igen");
    }, 5000);

    try {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = data.user;
      if (!user) {
        setError("Ingen användare returnerades från inloggningen.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (profile?.role === "host" || profile?.role === "owner") {
        const { data: privateListing } = await supabase
          .from("listings")
          .select("id")
          .eq("owner_id", user.id)
          .eq("listing_type", "private")
          .maybeSingle();

        localStorage.setItem("userEmail", user.email ?? "");
        localStorage.setItem("userRole", "host");
        router.push(privateListing ? "/mitt-konto" : "/dashboard/host");
      } else {
        await supabase.auth.signOut();
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        setRoleMismatch("renter");
        setError("Detta konto är inte registrerat som hamnägare. Vänligen använd vanliga inloggningen.");
        return;
      }
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
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white">Välkommen tillbaka</h1>
          <p className="mb-10 text-lg text-gray-400">Logga in och hantera dina hamnar och bokningar.</p>

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
              className="rounded-xl border-2 border-teal-500 bg-teal-50 p-4 text-left transition-all"
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
            Logga in på ditt konto
          </h2>

          <GoogleOAuthButton newUserRole="host" />
          <div className="my-5">
            <AuthOAuthDivider />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                className={inputClass}
                placeholder="Ditt lösenord"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {roleMismatch === "renter" ? (
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-teal-500 px-4 py-2.5 text-sm font-semibold text-teal-600 transition hover:bg-teal-50"
              >
                Gå till vanlig inloggning
              </Link>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: TEAL }}
            >
              {loading ? "Loggar in..." : "Logga in →"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Har du inget konto?{" "}
            <Link href="/hamnar/registrera" className="font-medium text-teal-600 hover:underline">
              Registrera dig
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
