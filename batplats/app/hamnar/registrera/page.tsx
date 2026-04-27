"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Footer from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

export default function HarbourSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-16 text-white">
        <div className="mx-auto w-full max-w-[520px]">
          <Link
            href="/"
            className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-[14px] py-[6px] text-[0.85rem] font-medium text-white transition hover:bg-white/20"
          >
            ← Startsidan
          </Link>
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            För hamnägare
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold">Registrera din hamn</h1>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[520px] rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Namn</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0a2342]">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
            </div>

            {error ? <p className="text-sm text-[#be123c]">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-60"
            >
              {loading ? "Skapar konto..." : "Registrera din hamn"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#64748b]">
            Har du redan konto?{" "}
            <Link href="/hamnar/logga-in" className="font-semibold text-[#0d9488] hover:underline">
              Logga in som hamnägare
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
