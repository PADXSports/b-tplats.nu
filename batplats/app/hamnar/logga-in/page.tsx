"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Footer from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

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
        localStorage.setItem("userEmail", user.email ?? "");
        localStorage.setItem("userRole", "host");
        router.push("/dashboard/host");
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
    <main className="min-h-screen bg-[#0d2252] text-white">
      <section className="bg-[#0d2252] px-6 py-16 text-white">
        <div className="mx-auto w-full max-w-[520px]">
          <Link
            href="/"
            className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-[14px] py-[6px] text-[0.85rem] font-medium text-white transition hover:bg-white/20"
          >
            ← Startsidan
          </Link>
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            ⚓ LOGGA IN SOM HAMNÄGARE
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold">Företagsinloggning</h1>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[520px] rounded-xl border border-white/20 bg-[#0f1f3d] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-white">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-white/25 bg-[#0d2252] px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-white">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-white/25 bg-[#0d2252] px-3 py-2 text-sm outline-none transition focus:border-[#14b8a6]"
              />
            </div>

            {error ? <p className="text-sm text-[#d64c3b]">{error}</p> : null}
            {roleMismatch === "renter" ? (
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-lg border-2 border-[#14b8a6] px-4 py-2.5 text-sm font-semibold text-[#5eead4] transition hover:bg-[#14b8a6] hover:text-[#0d2252]"
              >
                Gå till vanlig inloggning
              </Link>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#14b8a6] px-4 py-2.5 text-sm font-semibold text-[#0d2252] transition hover:bg-[#5eead4] disabled:opacity-60"
            >
              {loading ? "Loggar in..." : "Logga in som hamnägare"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/70">
            Inte registrerad?{" "}
            <Link href="/hamnar/registrera" className="font-semibold text-[#5eead4] hover:underline">
              Registrera din hamn
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
