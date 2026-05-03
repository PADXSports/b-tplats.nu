"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type BetaUserType = "Båtägare" | "Hamnägare" | "Båda";

export default function BetaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<BetaUserType>("Båtägare");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setToast(null);

    const { error } = await supabase.from("beta_signups").insert({
      email: email.trim(),
      name: name.trim() || null,
      user_type: userType,
    });

    if (error) {
      setToast({
        type: "error",
        message: error.code === "23505" ? "Den här e-postadressen är redan anmäld." : "Kunde inte spara anmälan.",
      });
      setLoading(false);
      return;
    }

    setToast({ type: "success", message: "Tack! Vi hör av oss snart ⚓" });
    setEmail("");
    setName("");
    setUserType("Båtägare");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0f1f3d] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          ← Till startsidan
        </Link>

        <section className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_12px_36px_rgba(0,0,0,0.35)] md:p-8">
          <h1 className="text-4xl font-black tracking-[-0.4px] sm:text-5xl">Snart här! 🚤</h1>
          <p className="mt-4 text-lg font-semibold text-white/90">
            Sveriges nya plattform för båtplatsuthyrning lanseras inom kort
          </p>
          <p className="mt-3 text-base leading-relaxed text-white/75">
            Anmäl dig till betan och bli först med att hitta eller hyra ut båtplatser.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-white/90">E-post *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-[#14b8a6]"
                placeholder="namn@exempel.se"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-white/90">Namn (valfritt)</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-[#14b8a6]"
                placeholder="Ditt namn"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-white/90">Jag är</label>
              <select
                value={userType}
                onChange={(event) => setUserType(event.target.value as BetaUserType)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#14b8a6]"
              >
                <option value="Båtägare">Båtägare</option>
                <option value="Hamnägare">Hamnägare</option>
                <option value="Båda">Båda</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Skickar..." : "Anmäl intresse"}
            </button>
          </form>

          {toast ? (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                toast.type === "success"
                  ? "border-[#14b8a6] bg-[#0d9488]/25 text-[#d4f0ec]"
                  : "border-[#fda4af] bg-[#881337]/35 text-[#ffe4e6]"
              }`}
            >
              {toast.message}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
